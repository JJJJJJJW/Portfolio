package com.ace.techfolio.repository;

import com.ace.techfolio.entity.Goal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data Repository for {@link Goal} entity.
 * All queries are scoped by userId to enforce data isolation.
 */
@Repository
public interface GoalRepository extends JpaRepository<Goal, UUID> {

    /**
     * Find all goals belonging to a specific user, newest first.
     */
    List<Goal> findByUserIdOrderByCreatedAtDesc(UUID userId);

    /**
     * Find a specific goal owned by a specific user (IDOR prevention).
     */
    Optional<Goal> findByIdAndUserId(UUID id, UUID userId);
}
