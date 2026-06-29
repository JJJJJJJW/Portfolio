package com.ace.techfolio.service.queue;

import java.time.LocalDateTime;

/**
 * Maps a single row returned by {@code pgmq.read()}.
 *
 * <p>Fields mirror the pgmq message table columns:</p>
 * <ul>
 *   <li>{@code msg_id}  — unique message identifier (BIGINT)</li>
 *   <li>{@code read_ct} — number of times this message has been read</li>
 *   <li>{@code enqueued_at} — timestamp when the message was enqueued</li>
 *   <li>{@code vt} — visibility timeout expiry timestamp</li>
 *   <li>{@code message} — JSON payload</li>
 * </ul>
 */
public class QueueMessage {

    private Long msgId;
    private Integer readCount;
    private LocalDateTime enqueuedAt;
    private LocalDateTime visibilityTimeout;
    private String message;

    public QueueMessage() {
    }

    public QueueMessage(Long msgId, Integer readCount, LocalDateTime enqueuedAt,
                        LocalDateTime visibilityTimeout, String message) {
        this.msgId = msgId;
        this.readCount = readCount;
        this.enqueuedAt = enqueuedAt;
        this.visibilityTimeout = visibilityTimeout;
        this.message = message;
    }

    // =========================================================================
    // Getters & Setters
    // =========================================================================

    public Long getMsgId() { return msgId; }
    public void setMsgId(Long msgId) { this.msgId = msgId; }

    public Integer getReadCount() { return readCount; }
    public void setReadCount(Integer readCount) { this.readCount = readCount; }

    public LocalDateTime getEnqueuedAt() { return enqueuedAt; }
    public void setEnqueuedAt(LocalDateTime enqueuedAt) { this.enqueuedAt = enqueuedAt; }

    public LocalDateTime getVisibilityTimeout() { return visibilityTimeout; }
    public void setVisibilityTimeout(LocalDateTime visibilityTimeout) { this.visibilityTimeout = visibilityTimeout; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    @Override
    public String toString() {
        return "QueueMessage{msgId=" + msgId + ", readCount=" + readCount + ", message='" + message + "'}";
    }
}
