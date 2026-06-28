package com.ace.techfolio.controller;

import com.ace.techfolio.dto.PortfolioAuditRequest;
import com.ace.techfolio.dto.PortfolioAuditResponse;
import com.ace.techfolio.service.PortfolioAuditService;

import jakarta.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/**
 * REST controller for the Portfolio Audit feature.
 *
 * <p>Provides endpoints for running AI-powered portfolio analysis
 * and retrieving historical audit snapshots. All endpoints require
 * JWT authentication and are scoped to the authenticated user.</p>
 */
@RestController
@RequestMapping("/api/v1/portfolio-audit")
public class PortfolioAuditController {

    private static final Logger log = LoggerFactory.getLogger(PortfolioAuditController.class);

    private final PortfolioAuditService auditService;

    public PortfolioAuditController(PortfolioAuditService auditService) {
        this.auditService = auditService;
    }

    /**
     * Runs a full portfolio audit analysis using the user's real holdings,
     * dashboard metrics, risk appetite, and the provided investment timeline.
     */
    @PostMapping("/analyze")
    public ResponseEntity<?> runAudit(
            @Valid @RequestBody PortfolioAuditRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        if (jwt == null) {
            return ResponseEntity.badRequest().build();
        }

        UUID userId = UUID.fromString(jwt.getSubject());
        log.info("Portfolio audit triggered by user {} with timeline: {}", userId, request.getInvestmentTimeline());

        try {
            PortfolioAuditResponse response = auditService.runAudit(userId, request.getInvestmentTimeline());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Portfolio audit failed for user {}: {}", userId, e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Portfolio audit analysis failed. Please try again."));
        }
    }

    /**
     * Retrieves paginated audit history for the authenticated user.
     */
    @GetMapping("/history")
    public ResponseEntity<?> getAuditHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal Jwt jwt) {

        if (jwt == null) {
            return ResponseEntity.badRequest().build();
        }

        UUID userId = UUID.fromString(jwt.getSubject());
        Page<PortfolioAuditResponse> history = auditService.getAuditHistory(userId, page, size);

        return ResponseEntity.ok(Map.of(
                "audits", history.getContent(),
                "page", history.getNumber(),
                "totalPages", history.getTotalPages(),
                "totalElements", history.getTotalElements()));
    }

    /**
     * Toggles the completion status of an action item in a specific portfolio audit.
     */
    @PutMapping("/{id}/action-items/{index}/toggle")
    public ResponseEntity<?> toggleActionItem(
            @PathVariable UUID id,
            @PathVariable int index,
            @AuthenticationPrincipal Jwt jwt) {

        if (jwt == null) {
            return ResponseEntity.badRequest().build();
        }

        UUID userId = UUID.fromString(jwt.getSubject());
        boolean success = auditService.toggleActionItem(userId, id, index);

        if (success) {
            return ResponseEntity.ok(Map.of("message", "Action item toggled successfully"));
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to toggle action item"));
        }
    }
}
