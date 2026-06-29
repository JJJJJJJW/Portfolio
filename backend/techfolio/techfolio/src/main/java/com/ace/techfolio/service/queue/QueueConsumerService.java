package com.ace.techfolio.service.queue;

import com.ace.techfolio.config.StockAnalyzerProperties;
import com.ace.techfolio.dto.stockanalyzer.NotificationMessage;
import com.ace.techfolio.dto.stockanalyzer.StockAnalysisMessage;
import com.ace.techfolio.entity.stockanalyzer.TradingSignal;
import com.ace.techfolio.service.stockanalyzer.DeepAnalysisService;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Queue consumer that polls the {@code stock_analysis_queue} for
 * pending stock analysis jobs.
 *
 * <p>Processes one message at a time using a {@code fixedDelay}-based
 * scheduler. For each message:</p>
 * <ol>
 *   <li>Reads a message with a visibility timeout (default 120s)</li>
 *   <li>Calls {@link DeepAnalysisService#analyzeSymbol} for that ticker</li>
 *   <li>On success: deletes the message. If BUY signal with high confidence,
 *       publishes to {@code user_notifications} queue</li>
 *   <li>On failure: if retries exhausted, moves to DLQ
 *       ({@code stock_analysis_failed}). Otherwise, lets visibility
 *       timeout expire for automatic re-delivery</li>
 * </ol>
 *
 * <p>Controlled by {@code stock-analyzer.queue.consumer-enabled}.
 * When disabled, the poller does not run.</p>
 */
@Service
@ConditionalOnProperty(name = "stock-analyzer.queue.consumer-enabled", havingValue = "true", matchIfMissing = true)
public class QueueConsumerService {

    private static final Logger log = LoggerFactory.getLogger(QueueConsumerService.class);

    private static final String ANALYSIS_QUEUE = "stock_analysis_queue";
    private static final String DLQ_QUEUE = "stock_analysis_failed";
    private static final String NOTIFICATION_QUEUE = "user_notifications";

    private final QueueService queueService;
    private final DeepAnalysisService deepAnalysisService;
    private final StockAnalyzerProperties props;
    private final ObjectMapper objectMapper;

    public QueueConsumerService(QueueService queueService,
                                DeepAnalysisService deepAnalysisService,
                                StockAnalyzerProperties props,
                                ObjectMapper objectMapper) {
        this.queueService = queueService;
        this.deepAnalysisService = deepAnalysisService;
        this.props = props;
        this.objectMapper = objectMapper;
    }

    /**
     * Polls the analysis queue on a fixed delay. Processes one message
     * per poll cycle to keep memory usage minimal.
     */
    @Scheduled(fixedDelayString = "${stock-analyzer.queue.poll-interval-ms:5000}")
    public void pollAnalysisQueue() {
        try {
            List<QueueMessage> messages = queueService.read(
                    ANALYSIS_QUEUE,
                    props.getQueue().getVisibilityTimeoutSec(),
                    1  // Process one at a time
            );

            if (messages.isEmpty()) {
                return; // Nothing to process — silent return
            }

            QueueMessage queueMsg = messages.get(0);
            processMessage(queueMsg);

        } catch (Exception e) {
            log.error("Error polling analysis queue: {}", e.getMessage(), e);
        }
    }

    // =========================================================================
    // Message Processing
    // =========================================================================

    private void processMessage(QueueMessage queueMsg) {
        StockAnalysisMessage payload;
        try {
            payload = objectMapper.readValue(queueMsg.getMessage(), StockAnalysisMessage.class);
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize queue message {}: {}. Moving to DLQ.",
                    queueMsg.getMsgId(), e.getMessage());
            moveToDlq(queueMsg);
            return;
        }

        String ticker = payload.getTicker();
        log.info("Processing analysis for {} (attempt {}, msgId={})",
                ticker, queueMsg.getReadCount(), queueMsg.getMsgId());

        try {
            // Run deep analysis
            TradingSignal signal = deepAnalysisService.analyzeSymbol(
                    ticker, payload.getRiskProfile());

            if (signal != null) {
                log.info("Analysis complete for {}: signal={}, confidence={}",
                        ticker, signal.getSignal(), signal.getConfidence());

                // Check if this is a high-confidence BUY → enqueue notification
                if (shouldNotify(signal)) {
                    enqueueNotification(signal);
                }
            } else {
                log.warn("Analysis returned null for {}", ticker);
            }

            // Success — delete the message from the queue
            queueService.delete(ANALYSIS_QUEUE, queueMsg.getMsgId());

        } catch (Exception e) {
            handleFailure(queueMsg, payload, e);
        }
    }

    // =========================================================================
    // Failure Handling
    // =========================================================================

    private void handleFailure(QueueMessage queueMsg, StockAnalysisMessage payload, Exception e) {
        int maxRetries = props.getQueue().getMaxRetries();
        int readCount = queueMsg.getReadCount() != null ? queueMsg.getReadCount() : 1;

        log.warn("Analysis failed for {} (attempt {}/{}): {}",
                payload.getTicker(), readCount, maxRetries, e.getMessage());

        if (readCount >= maxRetries) {
            log.error("Max retries ({}) exhausted for {}. Moving to DLQ.",
                    maxRetries, payload.getTicker());
            moveToDlq(queueMsg);
        } else {
            // Let the visibility timeout expire — pgmq will redeliver the message
            log.info("Will retry {} after visibility timeout expires (attempt {}/{})",
                    payload.getTicker(), readCount, maxRetries);
        }
    }

    /**
     * Moves a failed message to the Dead Letter Queue.
     * Deletes from the main queue and re-enqueues in the DLQ.
     */
    private void moveToDlq(QueueMessage queueMsg) {
        try {
            queueService.send(DLQ_QUEUE, queueMsg.getMessage());
            queueService.delete(ANALYSIS_QUEUE, queueMsg.getMsgId());
            log.info("Moved message {} to DLQ '{}'", queueMsg.getMsgId(), DLQ_QUEUE);
        } catch (Exception e) {
            log.error("Failed to move message {} to DLQ: {}", queueMsg.getMsgId(), e.getMessage());
        }
    }

    // =========================================================================
    // Notification Publishing
    // =========================================================================

    private boolean shouldNotify(TradingSignal signal) {
        if (!props.getNotification().isEnabled()) {
            return false;
        }
        return "BUY".equalsIgnoreCase(signal.getSignal())
                && signal.getConfidence() != null
                && signal.getConfidence() >= props.getNotification().getBuyConfidenceThreshold();
    }

    private void enqueueNotification(TradingSignal signal) {
        try {
            NotificationMessage notification = new NotificationMessage();
            notification.setTicker(signal.getSymbol());
            notification.setSignal(signal.getSignal());
            notification.setConfidence(signal.getConfidence());
            notification.setEntryPrice(signal.getEntryPrice());
            notification.setTargetPrice(signal.getTargetPrice());
            notification.setStopLoss(signal.getStopLoss());
            notification.setRiskRewardRatio(signal.getRiskRewardRatio());
            notification.setReasoning(signal.getReasoning());
            notification.setTimestamp(LocalDateTime.now().toString());

            String json = objectMapper.writeValueAsString(notification);
            queueService.send(NOTIFICATION_QUEUE, json);

            log.info("Enqueued BUY notification for {} (confidence={})",
                    signal.getSymbol(), signal.getConfidence());

        } catch (JsonProcessingException e) {
            log.error("Failed to serialize notification for {}: {}",
                    signal.getSymbol(), e.getMessage());
        }
    }
}
