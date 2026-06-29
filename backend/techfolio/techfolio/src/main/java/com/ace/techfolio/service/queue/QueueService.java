package com.ace.techfolio.service.queue;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.util.List;
import java.util.Map;

/**
 * Low-level wrapper around the Supabase {@code pgmq} extension.
 *
 * <p>All queue operations (send, read, delete, archive) go through
 * this service. Uses {@link JdbcTemplate} to call pgmq SQL functions
 * directly — no external message broker required.</p>
 *
 * <p>Requires the {@code pgmq} extension and queues to be created
 * beforehand via Supabase SQL Editor.</p>
 */
@Service
public class QueueService {

    private static final Logger log = LoggerFactory.getLogger(QueueService.class);

    private final JdbcTemplate jdbcTemplate;

    public QueueService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // =========================================================================
    // Send (Enqueue)
    // =========================================================================

    /**
     * Sends a JSON message to the specified queue.
     *
     * @param queueName   the pgmq queue name
     * @param jsonPayload the JSON string payload
     * @return the assigned message ID
     */
    public Long send(String queueName, String jsonPayload) {
        String sql = "SELECT * FROM pgmq.send(?, ?::jsonb)";
        Long msgId = jdbcTemplate.queryForObject(sql, Long.class, queueName, jsonPayload);
        log.debug("Enqueued message to '{}': id={}", queueName, msgId);
        return msgId;
    }

    // =========================================================================
    // Read (Dequeue with visibility timeout)
    // =========================================================================

    /**
     * Reads messages from the queue. Messages become invisible to other
     * consumers for {@code visibilityTimeoutSec} seconds.
     *
     * @param queueName           the pgmq queue name
     * @param visibilityTimeoutSec seconds before the message reappears
     * @param batchSize           max messages to read
     * @return list of queue messages (empty if queue is empty)
     */
    public List<QueueMessage> read(String queueName, int visibilityTimeoutSec, int batchSize) {
        String sql = "SELECT * FROM pgmq.read(?, ?, ?)";

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                sql, queueName, visibilityTimeoutSec, batchSize);

        return rows.stream()
                .map(this::mapRow)
                .toList();
    }

    // =========================================================================
    // Delete (Acknowledge)
    // =========================================================================

    /**
     * Permanently deletes a message from the queue (acknowledges processing).
     *
     * @param queueName the pgmq queue name
     * @param msgId     the message ID to delete
     * @return true if the message was found and deleted
     */
    public boolean delete(String queueName, Long msgId) {
        String sql = "SELECT pgmq.delete(?, ?)";
        Boolean result = jdbcTemplate.queryForObject(sql, Boolean.class, queueName, msgId);
        if (Boolean.TRUE.equals(result)) {
            log.debug("Deleted message {} from '{}'", msgId, queueName);
        }
        return Boolean.TRUE.equals(result);
    }

    // =========================================================================
    // Archive (for audit trail)
    // =========================================================================

    /**
     * Archives a message (moves it to the archive table instead of deleting).
     * Useful for DLQ messages that should be kept for debugging.
     *
     * @param queueName the pgmq queue name
     * @param msgId     the message ID to archive
     * @return true if the message was found and archived
     */
    public boolean archive(String queueName, Long msgId) {
        String sql = "SELECT pgmq.archive(?, ?)";
        Boolean result = jdbcTemplate.queryForObject(sql, Boolean.class, queueName, msgId);
        if (Boolean.TRUE.equals(result)) {
            log.debug("Archived message {} from '{}'", msgId, queueName);
        }
        return Boolean.TRUE.equals(result);
    }

    // =========================================================================
    // Monitoring
    // =========================================================================

    /**
     * Returns the approximate number of messages in the queue.
     *
     * @param queueName the pgmq queue name
     * @return message count
     */
    public long getQueueDepth(String queueName) {
        String sql = "SELECT count(*) FROM pgmq.q_" + sanitizeQueueName(queueName);
        Long count = jdbcTemplate.queryForObject(sql, Long.class);
        return count != null ? count : 0;
    }

    // =========================================================================
    // Internal Helpers
    // =========================================================================

    private QueueMessage mapRow(Map<String, Object> row) {
        QueueMessage msg = new QueueMessage();
        msg.setMsgId(((Number) row.get("msg_id")).longValue());
        msg.setReadCount(row.get("read_ct") != null ? ((Number) row.get("read_ct")).intValue() : 0);

        if (row.get("enqueued_at") instanceof Timestamp ts) {
            msg.setEnqueuedAt(ts.toLocalDateTime());
        }
        if (row.get("vt") instanceof Timestamp ts) {
            msg.setVisibilityTimeout(ts.toLocalDateTime());
        }

        // pgmq returns message as a jsonb column — comes back as a PGobject or String
        Object messageObj = row.get("message");
        msg.setMessage(messageObj != null ? messageObj.toString() : null);

        return msg;
    }

    /**
     * Sanitizes queue name to prevent SQL injection in the table-name query.
     * Only allows alphanumeric characters and underscores.
     */
    private String sanitizeQueueName(String queueName) {
        if (queueName == null || !queueName.matches("^[a-zA-Z0-9_]+$")) {
            throw new IllegalArgumentException("Invalid queue name: " + queueName);
        }
        return queueName;
    }
}
