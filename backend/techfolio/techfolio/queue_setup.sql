-- =============================================================================
-- PGMQ Queue Setup Script
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================================================

-- Step 1: Enable the pgmq extension
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Step 2: Create the message queues
-- Main analysis queue: Stage 1 (Screener) publishes candidate tickers here.
-- Each message is a JSON object: {"ticker": "NVDA", "riskProfile": null, ...}
SELECT pgmq.create('stock_analysis_queue');

-- Dead Letter Queue: Failed analyses are moved here after max retries.
-- A retry service re-enqueues eligible messages every hour.
SELECT pgmq.create('stock_analysis_failed');

-- Notification queue: High-confidence BUY signals are published here.
-- A notification consumer sends email alerts asynchronously.
SELECT pgmq.create('user_notifications');

-- Step 3: Verify queues were created
SELECT * FROM pgmq.list_queues();
