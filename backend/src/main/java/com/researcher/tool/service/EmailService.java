package com.researcher.tool.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void sendNotificationEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("noreply@references.com");
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send email: " + e.getMessage());
        }
    }

    public void sendLikeNotification(String recipientEmail, String actorName, String postPreview) {
        String subject = actorName + " liked your post";
        String body = String.format(
                "Hi,\n\n%s liked your post:\n\n\"%s\"\n\nVisit References to see more interactions.\n\nBest regards,\nReferences Team",
                actorName, postPreview);
        sendNotificationEmail(recipientEmail, subject, body);
    }

    public void sendMentionNotification(String recipientEmail, String actorName, String contentPreview) {
        String subject = "You were mentioned by " + actorName;
        String body = String.format(
                "Hi,\n\n%s mentioned you in a post:\n\n\"%s\"\n\nVisit References to see the full post.\n\nBest regards,\nReferences Team",
                actorName, contentPreview);
        sendNotificationEmail(recipientEmail, subject, body);
    }

    public void sendShareNotification(String recipientEmail, String actorName) {
        String subject = actorName + " shared your post";
        String body = String.format(
                "Hi,\n\n%s shared your post on References.\n\nVisit References to see more interactions.\n\nBest regards,\nReferences Team",
                actorName);
        sendNotificationEmail(recipientEmail, subject, body);
    }

    public void sendCommentNotification(String recipientEmail, String actorName, String commentPreview) {
        String subject = actorName + " commented on your post";
        String body = String.format(
                "Hi,\n\n%s commented on your post:\n\n\"%s\"\n\nVisit References to see the full conversation.\n\nBest regards,\nReferences Team",
                actorName, commentPreview);
        sendNotificationEmail(recipientEmail, subject, body);
    }

    public void sendOtpEmail(String recipientEmail, String otp, String purpose) {
        String subject = "Your OTP for References - " + purpose;
        String body = String.format(
                "Hello,\n\nYour One-Time Password (OTP) for %s is:\n\n%s\n\nThis OTP is valid for 10 minutes. Please do not share this code with anyone.\n\nBest regards,\nReferences Team",
                purpose, otp);
        sendNotificationEmail(recipientEmail, subject, body);
    }
}
