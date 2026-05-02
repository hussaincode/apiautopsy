package com.apiautopsy.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {
    private static final String PROPERTY_SOURCE_NAME = "normalizedDatabaseUrl";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String configuredUrl = firstNonBlank(
            environment.getProperty("SPRING_DATASOURCE_URL"),
            environment.getProperty("DATABASE_URL")
        );

        if (configuredUrl == null) {
            return;
        }

        String normalizedUrl = normalizeJdbcUrl(configuredUrl);
        if (normalizedUrl == null || normalizedUrl.isBlank()) {
            return;
        }

        Map<String, Object> properties = new HashMap<>();
        properties.put("spring.datasource.url", normalizedUrl);

        DatabaseCredentials credentials = parseCredentials(configuredUrl);
        if (isBlank(environment.getProperty("SPRING_DATASOURCE_USERNAME")) && credentials.username() != null) {
            properties.put("spring.datasource.username", credentials.username());
        }
        if (isBlank(environment.getProperty("SPRING_DATASOURCE_PASSWORD")) && credentials.password() != null) {
            properties.put("spring.datasource.password", credentials.password());
        }

        environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, properties));
    }

    private static String normalizeJdbcUrl(String url) {
        if (url.startsWith("jdbc:postgresql://")) {
            return removeUnsupportedQueryParams(url);
        }
        if (url.startsWith("postgresql://")) {
            return removeUnsupportedQueryParams("jdbc:" + url);
        }
        if (url.startsWith("postgres://")) {
            return removeUnsupportedQueryParams("jdbc:postgresql://" + url.substring("postgres://".length()));
        }
        return url;
    }

    private static String removeUnsupportedQueryParams(String jdbcUrl) {
        int queryStart = jdbcUrl.indexOf('?');
        if (queryStart < 0) {
            return jdbcUrl;
        }

        String baseUrl = jdbcUrl.substring(0, queryStart);
        String query = jdbcUrl.substring(queryStart + 1);
        StringBuilder supportedQuery = new StringBuilder();
        for (String pair : query.split("&")) {
            if (pair.isBlank() || pair.startsWith("channel_binding=")) {
                continue;
            }
            if (!supportedQuery.isEmpty()) {
                supportedQuery.append('&');
            }
            supportedQuery.append(pair);
        }

        return supportedQuery.isEmpty() ? baseUrl : baseUrl + "?" + supportedQuery;
    }

    private static DatabaseCredentials parseCredentials(String url) {
        String uriValue = url.startsWith("jdbc:") ? url.substring("jdbc:".length()) : url;
        if (uriValue.startsWith("postgres://")) {
            uriValue = "postgresql://" + uriValue.substring("postgres://".length());
        }
        if (!uriValue.startsWith("postgresql://")) {
            return new DatabaseCredentials(null, null);
        }

        try {
            URI uri = URI.create(uriValue);
            String userInfo = uri.getRawUserInfo();
            if (userInfo == null || userInfo.isBlank()) {
                return new DatabaseCredentials(null, null);
            }

            String[] parts = userInfo.split(":", 2);
            String username = decode(parts[0]);
            String password = parts.length > 1 ? decode(parts[1]) : null;
            return new DatabaseCredentials(username, password);
        } catch (IllegalArgumentException ignored) {
            return new DatabaseCredentials(null, null);
        }
    }

    private static String firstNonBlank(String first, String second) {
        if (!isBlank(first)) {
            return first;
        }
        return isBlank(second) ? null : second;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    private record DatabaseCredentials(String username, String password) {
    }
}
