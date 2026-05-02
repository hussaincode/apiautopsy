package com.apiautopsy.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;

class DatabaseUrlEnvironmentPostProcessorTest {
    private final DatabaseUrlEnvironmentPostProcessor processor = new DatabaseUrlEnvironmentPostProcessor();

    @Test
    void normalizesNeonDatabaseUrlForJdbcDriver() {
        MockEnvironment environment = new MockEnvironment()
            .withProperty(
                "DATABASE_URL",
                "postgresql://neondb_owner:npg_secret@ep-weathered-tree-an39mw9n-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
            );

        processor.postProcessEnvironment(environment, new SpringApplication());

        assertThat(environment.getProperty("spring.datasource.url"))
            .isEqualTo("jdbc:postgresql://ep-weathered-tree-an39mw9n-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require");
        assertThat(environment.getProperty("spring.datasource.username")).isEqualTo("neondb_owner");
        assertThat(environment.getProperty("spring.datasource.password")).isEqualTo("npg_secret");
    }
}
