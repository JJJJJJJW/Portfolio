package com.ace.techfolio.controller;

import com.ace.techfolio.dto.ContributionRequest;
import com.ace.techfolio.dto.GoalRequest;
import com.ace.techfolio.dto.GoalResponse;
import com.ace.techfolio.service.GoalService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for managing financial goals and contributions.
 * All endpoints require authentication and are scoped to the current user.
 */
@RestController
@RequestMapping("/api/v1/goals")
public class GoalController {

    private final GoalService goalService;

    public GoalController(GoalService goalService) {
        this.goalService = goalService;
    }

    /**
     * List all goals for the authenticated user.
     */
    @GetMapping
    public ResponseEntity<List<GoalResponse>> getGoals(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(goalService.getGoalsByUser(userId));
    }

    /**
     * Create a new financial goal.
     */
    @PostMapping
    public ResponseEntity<GoalResponse> createGoal(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody GoalRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        GoalResponse created = goalService.createGoal(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Delete a goal and all its contributions.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGoal(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(jwt.getSubject());
        goalService.deleteGoal(userId, id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Add a contribution to a goal.
     */
    @PostMapping("/{id}/contributions")
    public ResponseEntity<GoalResponse> addContribution(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @Valid @RequestBody ContributionRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        GoalResponse updated = goalService.addContribution(userId, id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(updated);
    }
}
