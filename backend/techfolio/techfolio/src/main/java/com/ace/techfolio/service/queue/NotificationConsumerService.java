package com.ace.techfolio.service.queue;

import com.ace.techfolio.dto.stockanalyzer.NotificationMessage;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Notification queue consumer that polls the {@code user_notifications}
 * queue and sends BUY signal email alerts.
 *
 * <p>This is a lightweight, separate poller that handles notification
 * delivery asynchronously — the stock analysis pipeline never blocks
 * waiting for an email to send.</p>
 *
 * <p>On email send failure, the message visibility timeout expires
 * and pgmq automatically redelivers it.</p>
 */
@Service
@ConditionalOnProperty(name = "stock-analyzer.notification.enabled", havingValue = "true", matchIfMissing = true)
public class NotificationConsumerService {

    private static final Logger log = LoggerFactory.getLogger(NotificationConsumerService.class);
    private static final String NOTIFICATION_QUEUE = "user_notifications";

    private final QueueService queueService;
    private final EmailService emailService;
    private final ObjectMapper objectMapper;

    public NotificationConsumerService(QueueService queueService,
                                       EmailService emailService,
                                       ObjectMapper objectMapper) {
        this.queueService = queueService;
        this.emailService = emailService;
        this.objectMapper = objectMapper;
    }

    /**
     * Polls the notification queue every 10 seconds.
     * Processes one notification at a time.
     */
    @Scheduled(fixedDelay = 10000)
    public void pollNotificationQueue() {
        try {
            List<QueueMessage> messages = queueService.read(
                    NOTIFICATION_QUEUE, 60, 1);

            if (messages.isEmpty()) {
                return;
            }

            QueueMessage queueMsg = messages.get(0);
            processNotification(queueMsg);

        } catch (Exception e) {
            log.error("Error polling notification queue: {}", e.getMessage(), e);
        }
    }

    // =========================================================================
    // Notification Processing
    // =========================================================================

    private void processNotification(QueueMessage queueMsg) {
        NotificationMessage notification;
        try {
            notification = objectMapper.readValue(
                    queueMsg.getMessage(), NotificationMessage.class);
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize notification message {}: {}. Deleting.",
                    queueMsg.getMsgId(), e.getMessage());
            queueService.delete(NOTIFICATION_QUEUE, queueMsg.getMsgId());
            return;
        }

        log.info("Processing notification for {} (signal={}, confidence={})",
                notification.getTicker(), notification.getSignal(), notification.getConfidence());

        try {
            emailService.sendBuySignalEmail(notification);

            // Email sent successfully — delete the message
            queueService.delete(NOTIFICATION_QUEUE, queueMsg.getMsgId());
            log.info("Notification delivered for {}", notification.getTicker());

        } catch (Exception e) {
            // Email send failed — let visibility timeout expire for automatic retry
            log.warn("Failed to send notification email for {}: {}. Will retry on next visibility expiry.",
                    notification.getTicker(), e.getMessage());
        }
    }
}
