package com.ace.techfolio.service;

import com.ace.techfolio.dto.ContributionRequest;
import com.ace.techfolio.dto.ContributionResponse;
import com.ace.techfolio.dto.GoalRequest;
import com.ace.techfolio.dto.GoalResponse;
import com.ace.techfolio.entity.AppUser;
import com.ace.techfolio.entity.Goal;
import com.ace.techfolio.entity.GoalContribution;
import com.ace.techfolio.entity.enums.GoalCategory;
import com.ace.techfolio.entity.enums.GoalStatus;
import com.ace.techfolio.repository.GoalRepository;
import com.ace.techfolio.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Service class for managing {@link Goal} financial goals and contributions.
 * All operations are scoped to the authenticated user for IDOR prevention.
 */
@Service
public class GoalService {

    private final GoalRepository goalRepository;
    private final UserRepository userRepository;

    public GoalService(GoalRepository goalRepository, UserRepository userRepository) {
        this.goalRepository = goalRepository;
        this.userRepository = userRepository;
    }

    /**
     * Returns all goals for a specific user, with contributions eagerly loaded.
     */
    @Transactional(readOnly = true)
    public List<GoalResponse> getGoalsByUser(UUID userId) {
        return goalRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Creates a new goal for the user.
     */
    @Transactional
    public GoalResponse createGoal(UUID userId, GoalRequest request) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        Goal goal = new Goal();
        goal.setUser(user);
        goal.setTitle(request.name().trim());
        goal.setCategory(parseCategory(request.category()));
        goal.setTargetAmount(request.targetAmount());
        goal.setCurrentAmount(BigDecimal.ZERO);
        goal.setStartDate(LocalDate.now());
        goal.setTargetDate(LocalDate.parse(request.targetDate()));
        goal.setStatus(GoalStatus.ON_TRACK);

        Goal saved = goalRepository.save(goal);
        return toResponse(saved);
    }

    /**
     * Deletes a goal and all its contributions. Verifies ownership via userId.
     */
    @Transactional
    public void deleteGoal(UUID userId, UUID goalId) {
        Goal goal = goalRepository.findByIdAndUserId(goalId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Goal not found or access denied"));
        goalRepository.delete(goal);
    }

    /**
     * Adds a contribution to a goal. Verifies ownership via userId.
     * Updates the denormalized currentAmount on the goal.
     */
    @Transactional
    public GoalResponse addContribution(UUID userId, UUID goalId, ContributionRequest request) {
        Goal goal = goalRepository.findByIdAndUserId(goalId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Goal not found or access denied"));

        GoalContribution contribution = new GoalContribution(
                request.amount(),
                request.note(),
                LocalDate.parse(request.date())
        );

        goal.addContribution(contribution);

        // Update status if goal is now completed
        if (goal.getCurrentAmount().compareTo(goal.getTargetAmount()) >= 0) {
            goal.setStatus(GoalStatus.COMPLETED);
        }

        Goal saved = goalRepository.save(goal);
        return toResponse(saved);
    }

    // =========================================================================
    // Mapping Helpers
    // =========================================================================

    private GoalResponse toResponse(Goal goal) {
        List<ContributionResponse> contributions = goal.getContributions()
                .stream()
                .map(c -> new ContributionResponse(
                        c.getId(),
                        c.getAmount(),
                        c.getContributedOn() != null ? c.getContributedOn().toString() : null,
                        c.getNote()
                ))
                .toList();

        // Map category enum to frontend-friendly string
        String categoryDisplay = mapCategoryToDisplay(goal.getCategory());

        return new GoalResponse(
                goal.getId(),
                goal.getTitle(),
                categoryDisplay,
                goal.getTargetAmount(),
                goal.getCurrentAmount(),
                goal.getTargetDate() != null ? goal.getTargetDate().toString() : null,
                goal.getStartDate() != null ? goal.getStartDate().toString() : null,
                contributions
        );
    }

    private GoalCategory parseCategory(String category) {
        if (category == null || category.isBlank()) {
            return GoalCategory.OTHER;
        }
        try {
            // Try direct enum match (e.g., "EMERGENCY_FUND")
            return GoalCategory.valueOf(category.toUpperCase().replace(" ", "_"));
        } catch (IllegalArgumentException e) {
            // Try friendly name match (e.g., "Emergency Fund" -> "EMERGENCY_FUND")
            String normalized = category.trim().toUpperCase().replace(" ", "_");
            try {
                return GoalCategory.valueOf(normalized);
            } catch (IllegalArgumentException ex) {
                return GoalCategory.OTHER;
            }
        }
    }

    private String mapCategoryToDisplay(GoalCategory category) {
        if (category == null) return "Other";
        return switch (category) {
            case EMERGENCY_FUND -> "Emergency Fund";
            case RETIREMENT -> "Retirement";
            case INVESTMENT -> "Investment";
            case DEBT_PAYOFF -> "Debt Payoff";
            case SAVINGS -> "Savings";
            case EDUCATION -> "Education";
            case TRAVEL -> "Travel";
            case OTHER -> "Other";
        };
    }
}
