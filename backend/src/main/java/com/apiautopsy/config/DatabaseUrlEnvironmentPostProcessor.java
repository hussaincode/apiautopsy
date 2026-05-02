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
            environment.getProperty("DATABASE_URL"),
            environment.getProperty("DATABASE_PUBLIC_URL"),
            environment.getProperty("DATABASE_PRIVATE_URL"),
            environment.getProperty("POSTGRES_URL"),
            environment.getProperty("POSTGRESQL_URL")
        );

        DatabaseCredentials credentials = parseCredentials(configuredUrl);
        String normalizedUrl = configuredUrl == null ? buildJdbcUrlFromParts(environment) : normalizeJdbcUrl(configuredUrl);

        if (normalizedUrl == null || normalizedUrl.isBlank()) {
            normalizedUrl = "jdbc:postgresql://localhost:5432/apiautopsy";
        }

        if (credentials.username() == null || credentials.password() == null) {
            credentials = new DatabaseCredentials(
                firstNonBlank(credentials.username(), environment.getProperty("SPRING_DATASOURCE_USERNAME"), environment.getProperty("DATABASE_USERNAME"), environment.getProperty("PGUSER"), environment.getProperty("POSTGRES_USER")),
                firstNonBlank(credentials.password(), environment.getProperty("SPRING_DATASOURCE_PASSWORD"), environment.getProperty("DATABASE_PASSWORD"), environment.getProperty("PGPASSWORD"), environment.getProperty("POSTGRES_PASSWORD"))
            );
        }

        if (credentials.username() == null || credentials.password() == null) {
            return;
        }

        Map<String, Object> properties = new HashMap<>();
        properties.put("spring.datasource.url", normalizedUrl);
        properties.put("spring.datasource.username", credentials.username());
        properties.put("spring.datasource.password", credentials.password());

        environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, properties));
    }

    private static String buildJdbcUrlFromParts(ConfigurableEnvironment environment) {
        String host = firstNonBlank(environment.getProperty("PGHOST"), environment.getProperty("POSTGRES_HOST"));
        String database = firstNonBlank(environment.getProperty("PGDATABASE"), environment.getProperty("POSTGRES_DB"), environment.getProperty("DATABASE_NAME"));
        if (isBlank(host) || isBlank(database)) {
            return null;
        }

        String port = firstNonBlank(environment.getProperty("PGPORT"), environment.getProperty("POSTGRES_PORT"), "5432");
        String sslMode = firstNonBlank(environment.getProperty("PGSSLMODE"), environment.getProperty("POSTGRES_SSLMODE"), "require");
        return "jdbc:postgresql://" + host + ":" + port + "/" + database + "?sslmode=" + sslMode;
    }

    private static String normalizeJdbcUrl(String url) {
        if (url.startsWith("jdbc:postgresql://")) {
            return stripUserInfo(removeUnsupportedQueryParams(url));
        }
        if (url.startsWith("postgresql://")) {
            return stripUserInfo(removeUnsupportedQueryParams("jdbc:" + url));
        }
        if (url.startsWith("postgres://")) {
            return stripUserInfo(removeUnsupportedQueryParams("jdbc:postgresql://" + url.substring("postgres://".length())));
        }
        return url;
    }

    private static String stripUserInfo(String jdbcUrl) {
        String uriValue = jdbcUrl.startsWith("jdbc:") ? jdbcUrl.substring("jdbc:".length()) : jdbcUrl;
        try {
            URI uri = URI.create(uriValue);
            if (uri.getRawUserInfo() == null) {
                return jdbcUrl;
            }

            URI sanitized = new URI(
                uri.getScheme(),
                null,
                uri.getHost(),
                uri.getPort(),
                uri.getPath(),
                uri.getQuery(),
                uri.getFragment()
            );
            return "jdbc:" + sanitized;
        } catch (Exception ignored) {
            return jdbcUrl;
        }
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
        if (isBlank(url)) {
            return new DatabaseCredentials(null, null);
        }
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

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (!isBlank(value)) {
                return value;
            }
        }
        return null;
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
