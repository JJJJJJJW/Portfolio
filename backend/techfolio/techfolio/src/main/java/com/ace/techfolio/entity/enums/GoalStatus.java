package com.ace.techfolio.entity.enums;

/**
 * Status indicators for financial goals.
 * Maps to the frontend GoalStatus type in Goals/types.ts.
 * OVERDUE matches the frontend's "Overdue" string.
 */
public enum GoalStatus {
    ON_TRACK,
    AT_RISK,
    OVERDUE,
    COMPLETED,
    CANCELLED
}
