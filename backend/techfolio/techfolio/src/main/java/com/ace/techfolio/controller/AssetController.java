package com.ace.techfolio.controller;

import com.ace.techfolio.dto.AssetRequest;
import com.ace.techfolio.dto.AssetResponse;
import com.ace.techfolio.service.AssetService;
import com.ace.techfolio.service.MarketDataService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for managing portfolio asset positions.
 * All endpoints require authentication and are scoped to the current user.
 */
@RestController
@RequestMapping("/api/v1/assets")
public class AssetController {

    private final AssetService assetService;
    private final MarketDataService marketDataService;

    public AssetController(AssetService assetService, MarketDataService marketDataService) {
        this.assetService = assetService;
        this.marketDataService = marketDataService;
    }

    /**
     * Fetch the live asset price from Twelve Data or Yahoo Finance (via MarketDataRouter).
     * Publicly accessible as defined in SecurityConfig.
     */
    @GetMapping("/price")
    public ResponseEntity<Double> getAssetPrice(@RequestParam String symbol) {
        if (symbol == null || symbol.isBlank()) {
            return ResponseEntity.ok(0.0);
        }
        Double price = marketDataService.getBatchPrices(List.of(symbol))
                .getOrDefault(symbol.trim().toUpperCase(), 0.0);
        return ResponseEntity.ok(price);
    }

    /**
     * List all assets for the authenticated user.
     */
    @GetMapping
    public ResponseEntity<List<AssetResponse>> getAssets(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(assetService.getAssetsByUser(userId));
    }

    /**
     * Create a new asset position.
     */
    @PostMapping
    public ResponseEntity<AssetResponse> createAsset(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AssetRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        AssetResponse created = assetService.createAsset(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Update an existing asset position.
     */
    @PutMapping("/{id}")
    public ResponseEntity<AssetResponse> updateAsset(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @Valid @RequestBody AssetRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        AssetResponse updated = assetService.updateAsset(userId, id, request);
        return ResponseEntity.ok(updated);
    }

    /**
     * Delete an asset position.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAsset(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(jwt.getSubject());
        assetService.deleteAsset(userId, id);
        return ResponseEntity.noContent().build();
    }
}
