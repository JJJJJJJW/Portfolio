package com.ace.techfolio.service;

import com.ace.techfolio.dto.AssetRequest;
import com.ace.techfolio.dto.AssetResponse;
import com.ace.techfolio.entity.AppUser;
import com.ace.techfolio.entity.Asset;
import com.ace.techfolio.entity.enums.AssetCategory;
import com.ace.techfolio.repository.AssetRepository;
import com.ace.techfolio.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service class for managing {@link Asset} portfolio positions.
 * All operations are scoped to the authenticated user for IDOR prevention.
 */
@Service
public class AssetService {

    private final AssetRepository assetRepository;
    private final UserRepository userRepository;
    private final MarketDataService marketDataService;

    public AssetService(AssetRepository assetRepository, UserRepository userRepository, MarketDataService marketDataService) {
        this.assetRepository = assetRepository;
        this.userRepository = userRepository;
        this.marketDataService = marketDataService;
    }

    /**
     * Returns all assets for a specific user, with current prices resolved on-the-fly.
     */
    @Transactional(readOnly = true)
    public List<AssetResponse> getAssetsByUser(UUID userId) {
        List<Asset> assets = assetRepository.findByUserIdOrderByCreatedAtDesc(userId);

        List<String> symbols = assets.stream()
                .filter(a -> !a.isCustom())
                .map(Asset::getSymbol)
                .filter(s -> s != null && !s.isBlank())
                .distinct()
                .toList();

        Map<String, Double> livePrices = marketDataService.getBatchPrices(symbols);

        return assets.stream()
                .map(asset -> toResponse(asset, livePrices))
                .toList();
    }

    /**
     * Creates a new asset for the user.
     */
    @Transactional
    public AssetResponse createAsset(UUID userId, AssetRequest request) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        Asset asset = new Asset();
        asset.setUser(user);
        asset.setName(request.name().trim());
        asset.setSymbol(request.symbol() != null ? request.symbol().trim().toUpperCase() : null);
        asset.setCategory(parseCategory(request.category()));
        asset.setQuantity(request.quantity());
        asset.setAvgPrice(request.avgPrice());
        asset.setCurrentPrice(request.currentPrice());
        asset.setCurrentValue(request.quantity().multiply(request.currentPrice()));
        asset.setCurrency(isBursa(request.symbol()) ? "MYR" : "USD");

        Asset saved = assetRepository.save(asset);
        return toResponse(saved);
    }

    /**
     * Updates an existing asset. Verifies ownership via userId.
     */
    @Transactional
    public AssetResponse updateAsset(UUID userId, UUID assetId, AssetRequest request) {
        Asset asset = assetRepository.findByIdAndUserId(assetId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Asset not found or access denied"));

        asset.setName(request.name().trim());
        asset.setSymbol(request.symbol() != null ? request.symbol().trim().toUpperCase() : null);
        asset.setCategory(parseCategory(request.category()));
        asset.setQuantity(request.quantity());
        asset.setAvgPrice(request.avgPrice());
        asset.setCurrentPrice(request.currentPrice());
        asset.setCurrentValue(request.quantity().multiply(request.currentPrice()));
        asset.setCurrency(isBursa(request.symbol()) ? "MYR" : "USD");

        Asset saved = assetRepository.save(asset);
        return toResponse(saved);
    }

    /**
     * Deletes an asset. Verifies ownership via userId.
     */
    @Transactional
    public void deleteAsset(UUID userId, UUID assetId) {
        Asset asset = assetRepository.findByIdAndUserId(assetId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Asset not found or access denied"));
        assetRepository.delete(asset);
    }

    // =========================================================================
    // Mapping Helpers
    // =========================================================================

    private AssetResponse toResponse(Asset asset) {
        return toResponse(asset, Map.of());
    }

    private AssetResponse toResponse(Asset asset, Map<String, Double> livePrices) {
        BigDecimal currentPrice = asset.getCurrentPrice();
        boolean isCustom = asset.isCustom();
        if (!isCustom && asset.getSymbol() != null && livePrices.containsKey(asset.getSymbol().toUpperCase())) {
            Double livePrice = livePrices.get(asset.getSymbol().toUpperCase());
            if (livePrice != null && livePrice > 0.0) {
                currentPrice = BigDecimal.valueOf(livePrice);
            }
        }

        BigDecimal totalValue = BigDecimal.ZERO;
        BigDecimal pl = BigDecimal.ZERO;

        if (asset.getQuantity() != null && currentPrice != null) {
            totalValue = asset.getQuantity().multiply(currentPrice);
        }
        if (asset.getQuantity() != null && currentPrice != null && asset.getAvgPrice() != null) {
            pl = asset.getQuantity().multiply(
                    currentPrice.subtract(asset.getAvgPrice())
            ).setScale(2, RoundingMode.HALF_UP);
        }

        return new AssetResponse(
                asset.getId(),
                asset.getName(),
                asset.getSymbol(),
                asset.getCategory() != null ? asset.getCategory().name() : null,
                asset.getQuantity(),
                asset.getAvgPrice(),
                currentPrice != null ? currentPrice.setScale(2, RoundingMode.HALF_UP) : null,
                totalValue.setScale(2, RoundingMode.HALF_UP),
                pl,
                isCustom,
                asset.getCurrency()
        );
    }

    /**
     * Updates only the current price and value of a custom asset position.
     */
    @Transactional
    public AssetResponse updateAssetPrice(UUID userId, UUID assetId, BigDecimal newPrice) {
        Asset asset = assetRepository.findByIdAndUserId(assetId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Asset not found or access denied"));

        asset.setCurrentPrice(newPrice);
        if (asset.getQuantity() != null) {
            asset.setCurrentValue(asset.getQuantity().multiply(newPrice));
        } else {
            asset.setCurrentValue(BigDecimal.ZERO);
        }

        Asset saved = assetRepository.save(asset);
        return toResponse(saved);
    }

    private AssetCategory parseCategory(String category) {
        if (category == null || category.isBlank()) {
            return AssetCategory.OTHER;
        }
        try {
            return AssetCategory.valueOf(category.toUpperCase().replace(" ", "_"));
        } catch (IllegalArgumentException e) {
            return AssetCategory.OTHER;
        }
    }

    private boolean isBursa(String symbol) {
        if (symbol == null) return false;
        String s = symbol.trim().toUpperCase();
        return s.endsWith(".KL") || s.endsWith(".KLSE") || s.endsWith(".XKLS");
    }
}
