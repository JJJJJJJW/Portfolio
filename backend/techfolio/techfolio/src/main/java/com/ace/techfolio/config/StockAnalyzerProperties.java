package com.ace.techfolio.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Typed configuration for the Stock Analyzer feature.
 *
 * <p>Binds all {@code stock-analyzer.*} properties from
 * {@code application.properties} into a single injectable POJO.
 * Nested inner classes mirror the property hierarchy.</p>
 */
@ConfigurationProperties(prefix = "stock-analyzer")
public class StockAnalyzerProperties {

    private Security security = new Security();
    private Gemini gemini = new Gemini();
    private Polygon polygon = new Polygon();

    private Fred fred = new Fred();
    private Finnhub finnhub = new Finnhub();
    private Screening screening = new Screening();
    private WatchlistConfig watchlist = new WatchlistConfig();
    private Queue queue = new Queue();
    private Notification notification = new Notification();

    // =========================================================================
    // Nested Configuration Classes
    // =========================================================================

    public static class Security {
        private String cronSecret;

        public String getCronSecret() { return cronSecret; }
        public void setCronSecret(String cronSecret) { this.cronSecret = cronSecret; }
    }



    public static class Gemini {
        private String apiKey;
        private String model = "gemini-3.5-flash";
        private String fallbackModel = "gemini-3-flash";
        private double temperature = 0.2;
        private int maxTokens = 1000;

        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }
        public String getModel() { return model; }
        public void setModel(String model) { this.model = model; }
        public String getFallbackModel() { return fallbackModel; }
        public void setFallbackModel(String fallbackModel) { this.fallbackModel = fallbackModel; }
        public double getTemperature() { return temperature; }
        public void setTemperature(double temperature) { this.temperature = temperature; }
        public int getMaxTokens() { return maxTokens; }
        public void setMaxTokens(int maxTokens) { this.maxTokens = maxTokens; }
    }

    public static class Polygon {
        private String apiKey;
        private String baseUrl = "https://api.polygon.io";

        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }
        public String getBaseUrl() { return baseUrl; }
        public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
    }



    public static class Fred {
        private String apiKey;
        private String baseUrl = "https://api.stlouisfed.org/fred";

        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }
        public String getBaseUrl() { return baseUrl; }
        public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
    }

    public static class Finnhub {
        private String apiKey;
        private String baseUrl = "https://finnhub.io/api/v1";

        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }
        public String getBaseUrl() { return baseUrl; }
        public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
    }

    public static class Screening {
        private long minVolume = 500_000;
        private int rsiMin = 30;
        private int rsiMax = 55;
        private boolean requireAbove200Sma = true;

        public long getMinVolume() { return minVolume; }
        public void setMinVolume(long minVolume) { this.minVolume = minVolume; }
        public int getRsiMin() { return rsiMin; }
        public void setRsiMin(int rsiMin) { this.rsiMin = rsiMin; }
        public int getRsiMax() { return rsiMax; }
        public void setRsiMax(int rsiMax) { this.rsiMax = rsiMax; }
        public boolean isRequireAbove200Sma() { return requireAbove200Sma; }
        public void setRequireAbove200Sma(boolean requireAbove200Sma) { this.requireAbove200Sma = requireAbove200Sma; }
    }

    public static class WatchlistConfig {
        private int maxTickers = 50;

        public int getMaxTickers() { return maxTickers; }
        public void setMaxTickers(int maxTickers) { this.maxTickers = maxTickers; }
    }

    /**
     * PGMQ queue consumer configuration.
     */
    public static class Queue {
        /** Whether the queue consumer poller is enabled. */
        private boolean consumerEnabled = true;
        /** Delay between polls in milliseconds. */
        private int pollIntervalMs = 5000;
        /** How long a message is invisible after being read (seconds). */
        private int visibilityTimeoutSec = 120;
        /** Max retries before moving to DLQ. */
        private int maxRetries = 3;
        /** DLQ retry check interval in milliseconds (default 1 hour). */
        private int dlqRetryIntervalMs = 3600000;

        public boolean isConsumerEnabled() { return consumerEnabled; }
        public void setConsumerEnabled(boolean consumerEnabled) { this.consumerEnabled = consumerEnabled; }
        public int getPollIntervalMs() { return pollIntervalMs; }
        public void setPollIntervalMs(int pollIntervalMs) { this.pollIntervalMs = pollIntervalMs; }
        public int getVisibilityTimeoutSec() { return visibilityTimeoutSec; }
        public void setVisibilityTimeoutSec(int visibilityTimeoutSec) { this.visibilityTimeoutSec = visibilityTimeoutSec; }
        public int getMaxRetries() { return maxRetries; }
        public void setMaxRetries(int maxRetries) { this.maxRetries = maxRetries; }
        public int getDlqRetryIntervalMs() { return dlqRetryIntervalMs; }
        public void setDlqRetryIntervalMs(int dlqRetryIntervalMs) { this.dlqRetryIntervalMs = dlqRetryIntervalMs; }
    }

    /**
     * BUY signal notification configuration.
     */
    public static class Notification {
        /** Whether email notifications are enabled. */
        private boolean enabled = true;
        /** Admin email to receive BUY signal alerts. */
        private String emailTo;
        /** Sender email address. */
        private String emailFrom = "noreply@techfolio.app";
        /** Minimum confidence for a BUY signal to trigger a notification. */
        private int buyConfidenceThreshold = 70;

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public String getEmailTo() { return emailTo; }
        public void setEmailTo(String emailTo) { this.emailTo = emailTo; }
        public String getEmailFrom() { return emailFrom; }
        public void setEmailFrom(String emailFrom) { this.emailFrom = emailFrom; }
        public int getBuyConfidenceThreshold() { return buyConfidenceThreshold; }
        public void setBuyConfidenceThreshold(int buyConfidenceThreshold) { this.buyConfidenceThreshold = buyConfidenceThreshold; }
    }

    // =========================================================================
    // Top-level Getters & Setters
    // =========================================================================

    public Security getSecurity() { return security; }
    public void setSecurity(Security security) { this.security = security; }



    public Gemini getGemini() { return gemini; }
    public void setGemini(Gemini gemini) { this.gemini = gemini; }

    public Polygon getPolygon() { return polygon; }
    public void setPolygon(Polygon polygon) { this.polygon = polygon; }



    public Fred getFred() { return fred; }
    public void setFred(Fred fred) { this.fred = fred; }

    public Finnhub getFinnhub() { return finnhub; }
    public void setFinnhub(Finnhub finnhub) { this.finnhub = finnhub; }

    public Screening getScreening() { return screening; }
    public void setScreening(Screening screening) { this.screening = screening; }

    public WatchlistConfig getWatchlist() { return watchlist; }
    public void setWatchlist(WatchlistConfig watchlist) { this.watchlist = watchlist; }

    public Queue getQueue() { return queue; }
    public void setQueue(Queue queue) { this.queue = queue; }

    public Notification getNotification() { return notification; }
    public void setNotification(Notification notification) { this.notification = notification; }
}
