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
import java.util.UUID;

/**
 * Service class for managing {@link Asset} portfolio positions.
 * All operations are scoped to the authenticated user for IDOR prevention.
 */
@Service
public class AssetService {

    private final AssetRepository assetRepository;
    private final UserRepository userRepository;

    public AssetService(AssetRepository assetRepository, UserRepository userRepository) {
        this.assetRepository = assetRepository;
        this.userRepository = userRepository;
    }

    /**
     * Returns all assets for a specific user.
     */
    @Transactional(readOnly = true)
    public List<AssetResponse> getAssetsByUser(UUID userId) {
        return assetRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
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
        BigDecimal totalValue = BigDecimal.ZERO;
        BigDecimal pl = BigDecimal.ZERO;

        if (asset.getQuantity() != null && asset.getCurrentPrice() != null) {
            totalValue = asset.getQuantity().multiply(asset.getCurrentPrice());
        }
        if (asset.getQuantity() != null && asset.getCurrentPrice() != null && asset.getAvgPrice() != null) {
            pl = asset.getQuantity().multiply(
                    asset.getCurrentPrice().subtract(asset.getAvgPrice())
            ).setScale(2, RoundingMode.HALF_UP);
        }

        return new AssetResponse(
                asset.getId(),
                asset.getName(),
                asset.getSymbol(),
                asset.getCategory() != null ? asset.getCategory().name() : null,
                asset.getQuantity(),
                asset.getAvgPrice(),
                asset.getCurrentPrice(),
                totalValue.setScale(2, RoundingMode.HALF_UP),
                pl
        );
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
}
