package com.apiautopsy.monitoring;

import com.apiautopsy.executions.Execution;
import com.apiautopsy.schedules.Schedule;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AssertionServiceTest {
    private final AssertionService service = new AssertionService(null, null, null);

    @Test
    void evaluatesStatusJsonPathLatencyAndSizeAssertions() {
        Schedule schedule = schedule();
        List<ScheduleAssertion> assertions = List.of(
            assertion(schedule, AssertionType.STATUS_CODE, "status", 200, null, null, null, null, null),
            assertion(schedule, AssertionType.JSON_PATH_EQUALS, "token", null, "$.auth.token", "abc", null, null, null),
            assertion(schedule, AssertionType.MAX_LATENCY_MS, "latency", null, null, null, null, 500L, null),
            assertion(schedule, AssertionType.MAX_RESPONSE_SIZE_BYTES, "size", null, null, null, null, null, 100L)
        );

        Execution execution = new Execution();
        execution.statusCode = 200;
        execution.responseBody = "{\"auth\":{\"token\":\"abc\"}}";
        execution.responseTimeMs = 120;
        execution.responseSizeBytes = 24;

        assertThat(service.evaluateAssertions(assertions, execution)).allMatch(MonitoringDtos.AssertionResult::passed);
    }

    @Test
    void reportsAssertionFailureWithUsefulMessage() {
        Schedule schedule = schedule();
        List<ScheduleAssertion> assertions = List.of(
            assertion(schedule, AssertionType.BODY_CONTAINS, "contains health", null, null, null, "healthy", null, null)
        );

        Execution execution = new Execution();
        execution.responseBody = "{\"status\":\"down\"}";

        List<MonitoringDtos.AssertionResult> results = service.evaluateAssertions(assertions, execution);

        assertThat(results).hasSize(1);
        assertThat(results.getFirst().passed()).isFalse();
        assertThat(results.getFirst().message()).contains("response body");
    }

    private Schedule schedule() {
        Schedule schedule = new Schedule();
        schedule.id = UUID.randomUUID();
        return schedule;
    }

    private ScheduleAssertion assertion(Schedule schedule, AssertionType type, String name, Integer expectedStatus, String jsonPath, String expectedValue, String containsText, Long maxLatency, Long maxSize) {
        ScheduleAssertion assertion = new ScheduleAssertion();
        assertion.id = UUID.randomUUID();
        assertion.schedule = schedule;
        assertion.type = type;
        assertion.name = name;
        assertion.expectedStatusCode = expectedStatus;
        assertion.jsonPath = jsonPath;
        assertion.expectedValue = expectedValue;
        assertion.containsText = containsText;
        assertion.maxLatencyMs = maxLatency;
        assertion.maxResponseSizeBytes = maxSize;
        return assertion;
    }
}
