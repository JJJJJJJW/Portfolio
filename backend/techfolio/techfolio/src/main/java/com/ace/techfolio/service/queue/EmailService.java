package com.ace.techfolio.service.queue;

import com.ace.techfolio.config.StockAnalyzerProperties;
import com.ace.techfolio.dto.stockanalyzer.NotificationMessage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import java.math.BigDecimal;

/**
 * Email service for sending BUY signal notifications via Gmail SMTP.
 *
 * <p>Composes a professional HTML email with the trading signal details
 * and sends it to the configured admin email address.</p>
 *
 * <p>Uses Spring Boot's {@link JavaMailSender} backed by Gmail SMTP.
 * Requires {@code MAIL_USERNAME} and {@code MAIL_PASSWORD} (Gmail App
 * Password) environment variables to be set.</p>
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final StockAnalyzerProperties props;

    public EmailService(JavaMailSender mailSender,
                        StockAnalyzerProperties props) {
        this.mailSender = mailSender;
        this.props = props;
    }

    /**
     * Sends a BUY signal email notification to the admin.
     *
     * @param notification the BUY signal details
     * @throws MessagingException if the email fails to send
     */
    public void sendBuySignalEmail(NotificationMessage notification) throws MessagingException {
        String to = props.getNotification().getEmailTo();
        String from = props.getNotification().getEmailFrom();

        if (to == null || to.isBlank()) {
            log.warn("Notification email recipient not configured (NOTIFICATION_EMAIL_TO). Skipping email.");
            return;
        }

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setTo(to);
        helper.setFrom(from);
        helper.setSubject(String.format("🟢 BUY Signal: %s (Confidence: %d%%)",
                notification.getTicker(), notification.getConfidence()));
        helper.setText(buildEmailHtml(notification), true);

        mailSender.send(message);
        log.info("BUY signal email sent to {} for {}", to, notification.getTicker());
    }

    // =========================================================================
    // HTML Email Template
    // =========================================================================

    private String buildEmailHtml(NotificationMessage n) {
        StringBuilder sb = new StringBuilder();

        sb.append("<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body ");
        sb.append("style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; ");
        sb.append("background-color: #0f172a; color: #e2e8f0; padding: 24px;'>");

        // Header
        sb.append("<div style='max-width: 600px; margin: 0 auto; background-color: #1e293b; ");
        sb.append("border-radius: 12px; overflow: hidden; border: 1px solid #334155;'>");

        // Title bar
        sb.append("<div style='background: linear-gradient(135deg, #059669, #10b981); ");
        sb.append("padding: 20px 24px;'>");
        sb.append("<h1 style='margin: 0; color: #ffffff; font-size: 20px;'>");
        sb.append("🟢 BUY Signal Detected</h1></div>");

        // Body
        sb.append("<div style='padding: 24px;'>");

        // Ticker badge
        sb.append("<div style='text-align: center; margin-bottom: 20px;'>");
        sb.append("<span style='background-color: #064e3b; color: #34d399; ");
        sb.append("padding: 8px 20px; border-radius: 20px; font-size: 24px; font-weight: bold;'>");
        sb.append(escapeHtml(n.getTicker()));
        sb.append("</span></div>");

        // Confidence
        sb.append("<div style='text-align: center; margin-bottom: 24px;'>");
        sb.append("<span style='color: #94a3b8; font-size: 14px;'>AI Confidence: </span>");
        sb.append("<span style='color: #10b981; font-size: 28px; font-weight: bold;'>");
        sb.append(n.getConfidence()).append("%</span></div>");

        // Price targets table
        sb.append("<table style='width: 100%; border-collapse: collapse; margin-bottom: 20px;'>");
        sb.append(priceRow("Entry Price", n.getEntryPrice(), "#e2e8f0"));
        sb.append(priceRow("Target Price", n.getTargetPrice(), "#10b981"));
        sb.append(priceRow("Stop Loss", n.getStopLoss(), "#ef4444"));
        if (n.getRiskRewardRatio() != null) {
            sb.append("<tr><td style='padding: 8px 12px; color: #94a3b8; border-bottom: 1px solid #334155;'>");
            sb.append("Risk/Reward</td><td style='padding: 8px 12px; text-align: right; ");
            sb.append("color: #e2e8f0; border-bottom: 1px solid #334155; font-weight: bold;'>");
            sb.append(String.format("%.2f", n.getRiskRewardRatio())).append("</td></tr>");
        }
        sb.append("</table>");

        // Reasoning
        if (n.getReasoning() != null && !n.getReasoning().isBlank()) {
            sb.append("<div style='background-color: #0f172a; border-radius: 8px; padding: 16px; ");
            sb.append("margin-bottom: 20px; border-left: 3px solid #10b981;'>");
            sb.append("<p style='margin: 0 0 4px 0; color: #94a3b8; font-size: 12px; ");
            sb.append("text-transform: uppercase;'>AI Analysis</p>");
            sb.append("<p style='margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.5;'>");
            sb.append(escapeHtml(n.getReasoning())).append("</p></div>");
        }

        // Disclaimer
        sb.append("<div style='background-color: #1c1917; border-radius: 8px; padding: 12px; ");
        sb.append("border: 1px solid #44403c;'>");
        sb.append("<p style='margin: 0; color: #a8a29e; font-size: 11px; line-height: 1.4;'>");
        sb.append("⚠️ <strong>Disclaimer:</strong> This is algorithmic analysis for educational ");
        sb.append("purposes only. Not financial advice. Always do your own research before trading.");
        sb.append("</p></div>");

        sb.append("</div>"); // body
        sb.append("<div style='padding: 16px 24px; background-color: #0f172a; text-align: center;'>");
        sb.append("<p style='margin: 0; color: #64748b; font-size: 12px;'>");
        sb.append("Sent by Techfolio Stock Analyzer</p></div>");
        sb.append("</div>"); // container
        sb.append("</body></html>");

        return sb.toString();
    }

    private String priceRow(String label, BigDecimal value, String color) {
        StringBuilder sb = new StringBuilder();
        sb.append("<tr><td style='padding: 8px 12px; color: #94a3b8; border-bottom: 1px solid #334155;'>");
        sb.append(label);
        sb.append("</td><td style='padding: 8px 12px; text-align: right; color: ");
        sb.append(color);
        sb.append("; border-bottom: 1px solid #334155; font-weight: bold;'>$");
        sb.append(value != null ? value.toPlainString() : "N/A");
        sb.append("</td></tr>");
        return sb.toString();
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;");
    }
}
