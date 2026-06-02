package com.ace.techfolio.entity.enums;

/**
 * Unified transaction types covering both general finance and trading.
 * INCOME/EXPENSE/TRANSFER — standard personal finance operations.
 * BUY/SELL — trading operations, aligned with the frontend Transaction interface in Positions.tsx.
 */
public enum TransactionType {
    INCOME,
    EXPENSE,
    TRANSFER,
    BUY,
    SELL
}
