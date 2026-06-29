package com.ace.techfolio.service.queue;

import com.ace.techfolio.config.StockAnalyzerProperties;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Dead Letter Queue (DLQ) retry service.
 *
 * <p>Periodically checks the {@code stock_analysis_failed} queue
 * for messages that can be retried. Messages are re-enqueued to
 * the main {@code stock_analysis_queue} if they were enqueued
 * less than 6 hours ago. Older messages are archived permanently.</p>
 *
 * <p>Runs on a configurable interval (default: every hour).</p>
 */
@Service
@ConditionalOnProperty(name = "stock-analyzer.queue.consumer-enabled", havingValue = "true", matchIfMissing = true)
public class DlqRetryService {

    private static final Logger log = LoggerFactory.getLogger(DlqRetryService.class);

    private static final String ANALYSIS_QUEUE = "stock_analysis_queue";
    private static final String DLQ_QUEUE = "stock_analysis_failed";
    private static final int MAX_AGE_HOURS = 6;

    private final QueueService queueService;
    private final StockAnalyzerProperties props;

    public DlqRetryService(QueueService queueService,
                           StockAnalyzerProperties props) {
        this.queueService = queueService;
        this.props = props;
    }

    /**
     * Polls the DLQ and retries eligible messages.
     *
     * <p>Uses a long visibility timeout (300s) to prevent duplicate
     * processing if the retry loop takes a while.</p>
     */
    @Scheduled(fixedDelayString = "${stock-analyzer.queue.dlq-retry-interval-ms:3600000}")
    public void retryFailedMessages() {
        try {
            List<QueueMessage> failedMessages = queueService.read(
                    DLQ_QUEUE, 300, 50);

            if (failedMessages.isEmpty()) {
                return;
            }

            log.info("DLQ retry: found {} failed messages to process", failedMessages.size());

            int retried = 0;
            int archived = 0;

            for (QueueMessage msg : failedMessages) {
                if (isRetryable(msg)) {
                    // Re-enqueue to the main analysis queue
                    queueService.send(ANALYSIS_QUEUE, msg.getMessage());
                    queueService.delete(DLQ_QUEUE, msg.getMsgId());
                    retried++;
                    log.info("Re-enqueued DLQ message {} to '{}'", msg.getMsgId(), ANALYSIS_QUEUE);
                } else {
                    // Too old — archive permanently
                    queueService.archive(DLQ_QUEUE, msg.getMsgId());
                    archived++;
                    log.warn("Archived permanently failed DLQ message {} (too old)",
                            msg.getMsgId());
                }
            }

            log.info("DLQ retry complete: {} retried, {} archived", retried, archived);

        } catch (Exception e) {
            log.error("Error during DLQ retry: {}", e.getMessage(), e);
        }
    }

    /**
     * A message is retryable if it was enqueued less than
     * {@value MAX_AGE_HOURS} hours ago.
     */
    private boolean isRetryable(QueueMessage msg) {
        if (msg.getEnqueuedAt() == null) {
            return false;
        }
        LocalDateTime cutoff = LocalDateTime.now().minusHours(MAX_AGE_HOURS);
        return msg.getEnqueuedAt().isAfter(cutoff);
    }
}
