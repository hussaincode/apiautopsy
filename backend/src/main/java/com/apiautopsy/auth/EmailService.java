package com.apiautopsy.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;
    private final boolean enabled;
    private final String from;

    public EmailService(JavaMailSender mailSender, @Value("${app.email.enabled}") boolean enabled, @Value("${app.email.from}") String from) {
        this.mailSender = mailSender;
        this.enabled = enabled;
        this.from = from;
    }

    public void sendRegistrationOtp(String email, String otp) {
        if (!enabled) {
            log.warn("Email delivery disabled. Registration OTP for {} is {}", email, otp);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(email);
            message.setSubject("Your APIAutopsy verification code");
            message.setText("""
                Your APIAutopsy verification code is:

                %s

                This code expires in 10 minutes. If you did not request this, you can ignore this email.
                """.formatted(otp));
            mailSender.send(message);
        } catch (MailException ex) {
            throw new IllegalStateException("Could not send verification email. Please try again.", ex);
        }
    }
}
