package com.ace.techfolio.controller;

import com.ace.techfolio.dto.DailyPLResponse;
import com.ace.techfolio.dto.DashboardSummaryResponse;
import com.ace.techfolio.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Controller for providing high-level aggregated portfolio and dashboard statistics.
 * Scoped to the authenticated user to enforce data isolation (IDOR prevention).
 */
@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    /**
     * Retrieves aggregated finance dashboard metrics, asset classification values,
     * and simulated net worth trends.
     */
    @GetMapping("/summary")
    public ResponseEntity<DashboardSummaryResponse> getDashboardSummary(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) {
            return ResponseEntity.badRequest().build();
        }
        UUID userId = UUID.fromString(jwt.getSubject());
        DashboardSummaryResponse summary = dashboardService.getDashboardSummary(userId);
        return ResponseEntity.ok(summary);
    }

    /**
     * Retrieves the daily P/L metrics from daily portfolio snapshots for rendering in the calendar.
     */
    @GetMapping("/pl-calendar")
    public ResponseEntity<List<DailyPLResponse>> getDailyPLCalendar(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) {
            return ResponseEntity.badRequest().build();
        }
        UUID userId = UUID.fromString(jwt.getSubject());
        List<DailyPLResponse> data = dashboardService.getDailyPLCalendar(userId);
        return ResponseEntity.ok(data);
    }
}
