package com.ace.techfolio.repository;

import com.ace.techfolio.entity.GoalContribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Spring Data Repository for {@link GoalContribution} entity.
 */
@Repository
public interface GoalContributionRepository extends JpaRepository<GoalContribution, UUID> {
}
