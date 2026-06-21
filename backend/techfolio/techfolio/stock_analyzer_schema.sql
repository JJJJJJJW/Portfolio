-- =============================================================================
-- Stock Analyzer Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================================================

-- ── stock_snapshots ─────────────────────────────────────────────────────────
-- Daily OHLCV + technical indicators per ticker
CREATE TABLE IF NOT EXISTS stock_snapshots (
    id              UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol          VARCHAR(20)    NOT NULL,
    date            DATE           NOT NULL,
    open_price      NUMERIC(19,4),
    high_price      NUMERIC(19,4),
    low_price       NUMERIC(19,4),
    close_price     NUMERIC(19,4),
    volume          BIGINT,
    rsi14           DOUBLE PRECISION,
    sma50           NUMERIC(19,4),
    sma200          NUMERIC(19,4),
    macd_line       DOUBLE PRECISION,
    macd_signal     DOUBLE PRECISION,
    macd_histogram  DOUBLE PRECISION,

    CONSTRAINT uk_stock_snapshot_symbol_date UNIQUE (symbol, date)
);

CREATE INDEX IF NOT EXISTS idx_stock_snapshots_symbol ON stock_snapshots(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_snapshots_date ON stock_snapshots(date);

-- ── fundamental_data ────────────────────────────────────────────────────────
-- Quarterly-refreshed company fundamentals from Finnhub
CREATE TABLE IF NOT EXISTS fundamental_data (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol              VARCHAR(20)     NOT NULL UNIQUE,
    updated_at          TIMESTAMP       NOT NULL DEFAULT now(),
    pe_ratio            DOUBLE PRECISION,
    eps_growth_yoy      DOUBLE PRECISION,
    revenue_growth_yoy  DOUBLE PRECISION,
    debt_to_equity      DOUBLE PRECISION,
    market_cap          BIGINT,
    high_52_week        NUMERIC(19,4),
    low_52_week         NUMERIC(19,4),
    avg_volume          BIGINT,
    sector              VARCHAR(100)
);

-- ── macro_snapshots ─────────────────────────────────────────────────────────
-- Weekly macro environment data from FRED
CREATE TABLE IF NOT EXISTS macro_snapshots (
    id              UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
    date            DATE             NOT NULL UNIQUE,
    fed_funds_rate  DOUBLE PRECISION,
    treasury_10y    DOUBLE PRECISION,
    cpi_yoy         DOUBLE PRECISION,
    spy_vs_200sma   VARCHAR(10),
    vix             DOUBLE PRECISION
);

-- ── trading_signals ─────────────────────────────────────────────────────────
-- AI-generated BUY/HOLD/AVOID signals from GPT-4o-mini
CREATE TABLE IF NOT EXISTS trading_signals (
    id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol            VARCHAR(20)     NOT NULL,
    signal            VARCHAR(10)     NOT NULL,
    confidence        INTEGER,
    entry_price       NUMERIC(19,4),
    target_price      NUMERIC(19,4),
    stop_loss         NUMERIC(19,4),
    risk_reward_ratio DOUBLE PRECISION,
    reasoning         TEXT,
    time_horizon      VARCHAR(50),
    factors           TEXT,
    analyzed_at       TIMESTAMP       NOT NULL DEFAULT now(),
    data_as_of        DATE
);

CREATE INDEX IF NOT EXISTS idx_trading_signals_symbol ON trading_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_trading_signals_analyzed_at ON trading_signals(analyzed_at DESC);

-- ── watchlist ───────────────────────────────────────────────────────────────
-- User-scoped ticker watchlist
CREATE TABLE IF NOT EXISTS watchlist (
    id       UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id  UUID        NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    symbol   VARCHAR(20) NOT NULL,
    added_at TIMESTAMP   NOT NULL DEFAULT now(),

    CONSTRAINT uk_watchlist_user_symbol UNIQUE (user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE stock_snapshots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundamental_data   ENABLE ROW LEVEL SECURITY;
ALTER TABLE macro_snapshots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_signals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist          ENABLE ROW LEVEL SECURITY;

-- Stock data: public read, server-only write (via service role)
CREATE POLICY "Anyone can view stock snapshots" ON stock_snapshots FOR SELECT USING (true);
CREATE POLICY "Anyone can view fundamentals" ON fundamental_data FOR SELECT USING (true);
CREATE POLICY "Anyone can view macro snapshots" ON macro_snapshots FOR SELECT USING (true);
CREATE POLICY "Anyone can view trading signals" ON trading_signals FOR SELECT USING (true);

-- Server-only writes for market data tables (service role bypasses RLS)
CREATE POLICY "Service can insert stock snapshots" ON stock_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update stock snapshots" ON stock_snapshots FOR UPDATE USING (true);
CREATE POLICY "Service can insert fundamentals" ON fundamental_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update fundamentals" ON fundamental_data FOR UPDATE USING (true);
CREATE POLICY "Service can insert macro snapshots" ON macro_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update macro snapshots" ON macro_snapshots FOR UPDATE USING (true);
CREATE POLICY "Service can insert trading signals" ON trading_signals FOR INSERT WITH CHECK (true);

-- Watchlist: user-scoped CRUD
CREATE POLICY "Users can manage own watchlist" ON watchlist FOR ALL USING (user_id = auth.uid());
