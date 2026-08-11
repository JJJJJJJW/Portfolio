package com.ace.techfolio.service;

import com.ace.techfolio.dto.AssetRequest;
import com.ace.techfolio.dto.AssetResponse;
import com.ace.techfolio.entity.AppUser;
import com.ace.techfolio.entity.Asset;
import com.ace.techfolio.entity.enums.AssetCategory;
import com.ace.techfolio.repository.AssetRepository;
import com.ace.techfolio.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssetServiceTest {

    @Mock
    private AssetRepository assetRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MarketDataService marketDataService;

    @InjectMocks
    private AssetService assetService;

    private UUID userId;
    private AppUser user;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = new AppUser();
        user.setId(userId);
        user.setEmail("testuser@example.com");
    }

    @Test
    void createAsset_Success_USD() {
        AssetRequest request = new AssetRequest(
                "Apple Inc",
                "aapl",
                "STOCK",
                new BigDecimal("10.0"),
                new BigDecimal("150.0"),
                new BigDecimal("175.0")
        );

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(assetRepository.save(any(Asset.class))).thenAnswer(invocation -> {
            Asset saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        AssetResponse response = assetService.createAsset(userId, request);

        assertNotNull(response);
        assertEquals("Apple Inc", response.name());
        assertEquals("AAPL", response.symbol());
        assertEquals("STOCK", response.category());
        assertEquals("USD", response.currency());
        assertEquals(new BigDecimal("10.0"), response.quantity());
        assertEquals(new BigDecimal("1750.00"), response.totalValue());

        verify(userRepository, times(1)).findById(userId);
        verify(assetRepository, times(1)).save(any(Asset.class));
    }

    @Test
    void createAsset_Success_Bursa_MYR() {
        AssetRequest request = new AssetRequest(
                "Maybank",
                "1155.KL",
                "STOCKS",
                new BigDecimal("100.0"),
                new BigDecimal("9.50"),
                new BigDecimal("10.00")
        );

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(assetRepository.save(any(Asset.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AssetResponse response = assetService.createAsset(userId, request);

        assertEquals("1155.KL", response.symbol());
        assertEquals("MYR", response.currency());
    }

    @Test
    void createAsset_UserNotFound_ThrowsException() {
        AssetRequest request = new AssetRequest(
                "Test", "TEST", "STOCKS",
                BigDecimal.ONE, BigDecimal.TEN, BigDecimal.TEN
        );

        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        Exception exception = assertThrows(IllegalArgumentException.class, () ->
                assetService.createAsset(userId, request));

        assertTrue(exception.getMessage().contains("User not found"));
        verify(assetRepository, never()).save(any(Asset.class));
    }

    @Test
    void updateAsset_UnauthorizedUser_ThrowsException() {
        UUID assetId = UUID.randomUUID();
        AssetRequest request = new AssetRequest(
                "Test", "TEST", "STOCKS",
                BigDecimal.ONE, BigDecimal.TEN, BigDecimal.TEN
        );

        when(assetRepository.findByIdAndUserId(assetId, userId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () ->
                assetService.updateAsset(userId, assetId, request));

        verify(assetRepository, never()).save(any(Asset.class));
    }

    @Test
    void getAssetsByUser_ReturnsAssetsWithLivePrices() {
        Asset asset1 = new Asset();
        asset1.setUser(user);
        asset1.setName("Apple");
        asset1.setSymbol("AAPL");
        asset1.setCategory(AssetCategory.STOCK);
        asset1.setQuantity(new BigDecimal("5"));
        asset1.setAvgPrice(new BigDecimal("150"));
        asset1.setCurrentPrice(new BigDecimal("150"));

        when(assetRepository.findByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of(asset1));
        when(marketDataService.getBatchPrices(List.of("AAPL"))).thenReturn(Map.of("AAPL", 180.0));

        List<AssetResponse> responses = assetService.getAssetsByUser(userId);

        assertEquals(1, responses.size());
        assertEquals("AAPL", responses.get(0).symbol());
        assertEquals(new BigDecimal("180.00"), responses.get(0).currentPrice());
    }
}
