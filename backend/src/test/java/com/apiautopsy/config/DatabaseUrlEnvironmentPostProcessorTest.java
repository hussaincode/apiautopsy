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

    @Test
    void buildsJdbcUrlFromRailwayPostgresVariablesWhenUrlIsBlank() {
        MockEnvironment environment = new MockEnvironment()
            .withProperty("SPRING_DATASOURCE_URL", "")
            .withProperty("PGHOST", "railway.internal")
            .withProperty("PGPORT", "5432")
            .withProperty("PGDATABASE", "railway")
            .withProperty("PGUSER", "postgres")
            .withProperty("PGPASSWORD", "secret");

        processor.postProcessEnvironment(environment, new SpringApplication());

        assertThat(environment.getProperty("spring.datasource.url"))
            .isEqualTo("jdbc:postgresql://railway.internal:5432/railway?sslmode=require");
        assertThat(environment.getProperty("spring.datasource.username")).isEqualTo("postgres");
        assertThat(environment.getProperty("spring.datasource.password")).isEqualTo("secret");
    }
}
