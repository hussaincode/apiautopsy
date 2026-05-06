package com.apiautopsy.monitoring;

import com.apiautopsy.common.NotFoundException;
import com.apiautopsy.executions.Execution;
import com.apiautopsy.schedules.Schedule;
import com.apiautopsy.schedules.ScheduleRepository;
import com.apiautopsy.workspaces.WorkspaceService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class AssertionService {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> MAP = new TypeReference<>() {};
    private static final Pattern JSON_PATH = Pattern.compile("^\\$((\\.[A-Za-z0-9_-]+)|(\\[[0-9]+]))*$");

    private final ScheduleAssertionRepository assertions;
    private final ScheduleRepository schedules;
    private final WorkspaceService workspaceService;

    public AssertionService(ScheduleAssertionRepository assertions, ScheduleRepository schedules, WorkspaceService workspaceService) {
        this.assertions = assertions;
        this.schedules = schedules;
        this.workspaceService = workspaceService;
    }

    public List<MonitoringDtos.AssertionResponse> list(UUID userId, UUID workspaceId, UUID scheduleId) {
        workspaceService.requireMember(workspaceId, userId);
        requireSchedule(workspaceId, scheduleId);
        return assertions.findByScheduleIdOrderByCreatedAtAsc(scheduleId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public MonitoringDtos.AssertionResponse save(UUID userId, UUID workspaceId, UUID scheduleId, MonitoringDtos.AssertionRequest request) {
        workspaceService.requireMember(workspaceId, userId);
        Schedule schedule = requireSchedule(workspaceId, scheduleId);
        validate(request);
        ScheduleAssertion assertion = new ScheduleAssertion();
        assertion.workspace = schedule.workspace;
        assertion.schedule = schedule;
        apply(assertion, request);
        return toResponse(assertions.save(assertion));
    }

    @Transactional
    public MonitoringDtos.AssertionResponse update(UUID userId, UUID workspaceId, UUID scheduleId, UUID assertionId, MonitoringDtos.AssertionRequest request) {
        workspaceService.requireMember(workspaceId, userId);
        requireSchedule(workspaceId, scheduleId);
        validate(request);
        ScheduleAssertion assertion = assertions.findById(assertionId).orElseThrow(() -> new NotFoundException("Assertion not found"));
        if (!assertion.schedule.id.equals(scheduleId) || !assertion.workspace.id.equals(workspaceId)) throw new NotFoundException("Assertion not found");
        apply(assertion, request);
        assertion.updatedAt = Instant.now();
        return toResponse(assertion);
    }

    @Transactional
    public void delete(UUID userId, UUID workspaceId, UUID scheduleId, UUID assertionId) {
        workspaceService.requireMember(workspaceId, userId);
        requireSchedule(workspaceId, scheduleId);
        ScheduleAssertion assertion = assertions.findById(assertionId).orElseThrow(() -> new NotFoundException("Assertion not found"));
        if (!assertion.schedule.id.equals(scheduleId) || !assertion.workspace.id.equals(workspaceId)) throw new NotFoundException("Assertion not found");
        assertions.delete(assertion);
    }

    public List<MonitoringDtos.AssertionResult> evaluate(Schedule schedule, Execution execution) {
        if (schedule == null) return List.of();
        List<ScheduleAssertion> activeAssertions = assertions.findByScheduleIdAndEnabledTrueOrderByCreatedAtAsc(schedule.id);
        return evaluateAssertions(activeAssertions, execution);
    }

    List<MonitoringDtos.AssertionResult> evaluateAssertions(List<ScheduleAssertion> activeAssertions, Execution execution) {
        if (activeAssertions.isEmpty()) return List.of();
        Map<String, Object> json = parseJsonObject(execution.responseBody);
        List<MonitoringDtos.AssertionResult> results = new ArrayList<>();
        for (ScheduleAssertion assertion : activeAssertions) {
            results.add(evaluateOne(assertion, execution, json));
        }
        return results;
    }

    private MonitoringDtos.AssertionResult evaluateOne(ScheduleAssertion assertion, Execution execution, Map<String, Object> json) {
        return switch (assertion.type) {
            case STATUS_CODE -> result(assertion, execution.statusCode != null && execution.statusCode.equals(assertion.expectedStatusCode),
                "Expected status " + assertion.expectedStatusCode + ", got " + (execution.statusCode == null ? "N/A" : execution.statusCode));
            case JSON_PATH_EXISTS -> {
                Object value = readJsonPath(json, assertion.jsonPath);
                yield result(assertion, value != null, "Expected JSON path " + assertion.jsonPath + " to exist");
            }
            case JSON_PATH_EQUALS -> {
                Object value = readJsonPath(json, assertion.jsonPath);
                yield result(assertion, value != null && String.valueOf(value).equals(assertion.expectedValue),
                    "Expected " + assertion.jsonPath + " to equal " + assertion.expectedValue + ", got " + (value == null ? "missing" : value));
            }
            case BODY_CONTAINS -> result(assertion, execution.responseBody != null && execution.responseBody.contains(assertion.containsText),
                "Expected response body to contain configured text");
            case MAX_LATENCY_MS -> result(assertion, execution.responseTimeMs <= assertion.maxLatencyMs,
                "Expected latency <= " + assertion.maxLatencyMs + " ms, got " + execution.responseTimeMs + " ms");
            case MAX_RESPONSE_SIZE_BYTES -> result(assertion, execution.responseSizeBytes <= assertion.maxResponseSizeBytes,
                "Expected response size <= " + assertion.maxResponseSizeBytes + " bytes, got " + execution.responseSizeBytes + " bytes");
        };
    }

    private MonitoringDtos.AssertionResult result(ScheduleAssertion assertion, boolean passed, String message) {
        return new MonitoringDtos.AssertionResult(assertion.id.toString(), assertion.name, assertion.type, passed, message);
    }

    private Map<String, Object> parseJsonObject(String body) {
        if (body == null || body.isBlank()) return Map.of();
        try {
            return MAPPER.readValue(body, MAP);
        } catch (JsonProcessingException ignored) {
            return Map.of();
        }
    }

    @SuppressWarnings("unchecked")
    private Object readJsonPath(Map<String, Object> json, String path) {
        if (json == null || path == null || !JSON_PATH.matcher(path).matches()) return null;
        Object current = json;
        int index = 1;
        while (index < path.length() && current != null) {
            if (path.charAt(index) == '.') {
                int nextDot = path.indexOf('.', index + 1);
                int nextBracket = path.indexOf('[', index + 1);
                int end = nextDot < 0 ? path.length() : nextDot;
                if (nextBracket >= 0 && nextBracket < end) end = nextBracket;
                if (!(current instanceof Map<?, ?> map)) return null;
                current = ((Map<String, Object>) map).get(path.substring(index + 1, end));
                index = end;
            } else if (path.charAt(index) == '[') {
                int end = path.indexOf(']', index);
                if (end < 0 || !(current instanceof List<?> list)) return null;
                int listIndex = Integer.parseInt(path.substring(index + 1, end));
                current = listIndex < list.size() ? list.get(listIndex) : null;
                index = end + 1;
            } else return null;
        }
        return current;
    }

    private void validate(MonitoringDtos.AssertionRequest request) {
        if ((request.type() == AssertionType.JSON_PATH_EXISTS || request.type() == AssertionType.JSON_PATH_EQUALS) && (request.jsonPath() == null || !JSON_PATH.matcher(request.jsonPath()).matches())) {
            throw new IllegalArgumentException("Use a supported JSON path like $.token or $.data[0].id");
        }
        if (request.type() == AssertionType.STATUS_CODE && request.expectedStatusCode() == null) throw new IllegalArgumentException("Status assertions require expectedStatusCode");
        if (request.type() == AssertionType.JSON_PATH_EQUALS && request.expectedValue() == null) throw new IllegalArgumentException("JSON equality assertions require expectedValue");
        if (request.type() == AssertionType.BODY_CONTAINS && (request.containsText() == null || request.containsText().isBlank())) throw new IllegalArgumentException("Body assertions require containsText");
        if (request.type() == AssertionType.MAX_LATENCY_MS && request.maxLatencyMs() == null) throw new IllegalArgumentException("Latency assertions require maxLatencyMs");
        if (request.type() == AssertionType.MAX_RESPONSE_SIZE_BYTES && request.maxResponseSizeBytes() == null) throw new IllegalArgumentException("Size assertions require maxResponseSizeBytes");
    }

    private void apply(ScheduleAssertion assertion, MonitoringDtos.AssertionRequest request) {
        assertion.type = request.type();
        assertion.name = request.name().trim();
        assertion.enabled = request.enabled();
        assertion.expectedStatusCode = request.expectedStatusCode();
        assertion.jsonPath = request.jsonPath();
        assertion.expectedValue = request.expectedValue();
        assertion.containsText = request.containsText();
        assertion.maxLatencyMs = request.maxLatencyMs();
        assertion.maxResponseSizeBytes = request.maxResponseSizeBytes();
    }

    private Schedule requireSchedule(UUID workspaceId, UUID scheduleId) {
        Schedule schedule = schedules.findById(scheduleId).orElseThrow(() -> new NotFoundException("Schedule not found"));
        if (!schedule.workspace.id.equals(workspaceId)) throw new NotFoundException("Schedule not found");
        return schedule;
    }

    private MonitoringDtos.AssertionResponse toResponse(ScheduleAssertion a) {
        return new MonitoringDtos.AssertionResponse(a.id, a.schedule.id, a.type, a.name, a.enabled, a.expectedStatusCode, a.jsonPath, a.expectedValue, a.containsText, a.maxLatencyMs, a.maxResponseSizeBytes, a.createdAt, a.updatedAt);
    }
}
