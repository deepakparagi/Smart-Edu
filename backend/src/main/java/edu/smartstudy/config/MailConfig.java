package edu.smartstudy.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

@Configuration
public class MailConfig {

    @Bean
    JavaMailSender javaMailSender(
            @Value("${spring.mail.host:localhost}") String host,
            @Value("${spring.mail.port:1025}") int port,
            @Value("${spring.mail.username:}") String username,
            @Value("${spring.mail.password:}") String password,
            @Value("${spring.mail.protocol:smtp}") String protocol,
            @Value("${spring.mail.properties.mail.smtp.starttls.enable:true}") boolean starttlsEnable,
            @Value("${spring.mail.properties.mail.smtp.ssl.enable:false}") boolean sslEnable) {

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host);
        sender.setPort(port);
        sender.setUsername(username);
        sender.setPassword(password);
        sender.setProtocol(protocol);
        sender.setDefaultEncoding("UTF-8");

        Properties javaMailProps = new Properties();
        javaMailProps.put("mail.smtp.auth", !username.isEmpty());
        javaMailProps.put("mail.smtp.starttls.enable", starttlsEnable);
        javaMailProps.put("mail.smtp.ssl.enable", sslEnable);
        javaMailProps.put("mail.smtp.connectiontimeout", 5000);
        javaMailProps.put("mail.smtp.timeout", 10000);
        javaMailProps.put("mail.smtp.writetimeout", 10000);
        sender.setJavaMailProperties(javaMailProps);
        return sender;
    }
}