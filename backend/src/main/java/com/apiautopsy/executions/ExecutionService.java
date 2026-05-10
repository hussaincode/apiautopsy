package com.apiautopsy.executions;

import com.apiautopsy.common.NotFoundException;
import com.apiautopsy.monitoring.AssertionService;
import com.apiautopsy.monitoring.MonitoringDtos;
import com.apiautopsy.requests.ApiRequest;
import com.apiautopsy.requests.ApiRequestRepository;
import com.apiautopsy.requests.AuthType;
import com.apiautopsy.requests.BodyType;
import com.apiautopsy.requests.HttpMethodType;
import com.apiautopsy.schedules.Schedule;
import com.apiautopsy.security.CryptoService;
import com.apiautopsy.workspaces.WorkspaceService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ExecutionService {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> MAP = new TypeReference<>() {};
    private static final Pattern VARIABLE = Pattern.compile("\\{\\{\\s*([A-Za-z0-9_.-]+)\\s*}}");
    private final ApiRequestRepository requests;
    private final ExecutionRepository executions;
    private final WorkspaceService workspaceService;
    private final CryptoService crypto;
    private final SsrfGuard ssrfGuard;
    private final AssertionService assertionService;
    private final RestClient restClient = RestClient.builder().requestFactory(new org.springframework.http.client.SimpleClientHttpRequestFactory()).build();

    public ExecutionService(ApiRequestRepository requests, ExecutionRepository executions, WorkspaceService workspaceService, CryptoService crypto, SsrfGuard ssrfGuard, AssertionService assertionService) {
        this.requests = requests;
        this.executions = executions;
        this.workspaceService = workspaceService;
        this.crypto = crypto;
        this.ssrfGuard = ssrfGuard;
        this.assertionService = assertionService;
    }

    @Transactional
    public ExecutionDtos.ExecutionResponse executeNow(UUID userId, UUID workspaceId, UUID requestId) {
        workspaceService.requireMember(workspaceId, userId);
        ApiRequest request = requests.findByIdAndWorkspaceId(requestId, workspaceId).orElseThrow(() -> new NotFoundException("API request not found"));
        return toResponse(executeInternal(request, null));
    }

    public ExecutionDtos.ExecutionResponse executePublic(ExecutionDtos.PublicExecutionRequest dto) {
        ApiRequest request = new ApiRequest();
        request.id = UUID.randomUUID();
        request.name = blank(dto.name()) ? "Untitled Request" : dto.name().trim();
        request.method = parseEnum(HttpMethodType.class, dto.method(), HttpMethodType.GET);
        request.url = blank(dto.url()) ? "" : dto.url().trim();
        request.headers = copy(dto.headers());
        request.queryParams = copy(dto.queryParams());
        request.bodyType = parseEnum(BodyType.class, dto.bodyType(), BodyType.NONE);
        request.body = copy(dto.body());
        request.authType = parseEnum(AuthType.class, dto.authType(), AuthType.NONE);
        if (request.authType != AuthType.NONE && dto.auth() != null && !dto.auth().isEmpty()) {
            try {
                request.authEncrypted = crypto.encrypt(MAPPER.writeValueAsString(dto.auth()));
            } catch (Exception e) {
                throw new IllegalArgumentException("Invalid auth payload");
            }
        }
        return toResponse(executeTransient(request));
    }

    @Transactional
    public Execution executeScheduled(ApiRequest request, Schedule schedule) {
        return executeInternal(request, schedule);
    }

    @Transactional
    public Execution executeWorkflowStep(ApiRequest request, Schedule schedule, Map<String, Object> variables) {
        return executeInternal(renderRequest(request, variables), schedule);
    }

    public List<ExecutionDtos.ExecutionResponse> history(UUID userId, UUID workspaceId) {
        workspaceService.requireMember(workspaceId, userId);
        return executions.findTop100ByWorkspaceIdOrderByExecutedAtDesc(workspaceId).stream().map(this::toResponse).toList();
    }

    public ExecutionDtos.ReportResponse report(UUID userId, UUID workspaceId) {
        workspaceService.requireMember(workspaceId, userId);
        Object[] row = flattenAggregate(executions.aggregateWorkspace(workspaceId, Instant.now().minus(Duration.ofDays(30))));
        long total = row[0] == null ? 0 : ((Number) row[0]).longValue();
        long success = row[1] == null ? 0 : ((Number) row[1]).longValue();
        double avg = row[2] == null ? 0 : ((Number) row[2]).doubleValue();
        double successRate = total == 0 ? 0 : (success * 100.0 / total);
        return new ExecutionDtos.ReportResponse(total, success, successRate, 100.0 - successRate, avg);
    }

    private Execution executeInternal(ApiRequest request, Schedule schedule) {
        Execution execution = performRequest(request, schedule);
        executions.save(execution);
        return execution;
    }

    private Execution executeTransient(ApiRequest request) {
        Execution execution = performRequest(request, null);
        if (execution.id == null) execution.id = UUID.randomUUID();
        return execution;
    }

    private Execution performRequest(ApiRequest request, Schedule schedule) {
        Execution execution = new Execution();
        execution.workspace = request.workspace;
        execution.apiRequest = request;
        execution.schedule = schedule;
        Instant started = Instant.now();
        try {
            URI uri = buildUri(request);
            HttpHeaders headers = buildHeaders(request);
            Object body = buildBody(request, headers);
            ResponseEntity<String> response = restClient.method(HttpMethod.valueOf(request.method.name()))
                .uri(uri)
                .headers(h -> h.addAll(headers))
                .body(body == null ? "" : body)
                .retrieve()
                .toEntity(String.class);
            execution.statusCode = response.getStatusCode().value();
            execution.success = response.getStatusCode().is2xxSuccessful() || response.getStatusCode().is3xxRedirection();
            execution.responseHeaders = flattenHeaders(response.getHeaders());
            execution.responseBody = truncate(response.getBody(), 250_000);
            execution.responseSizeBytes = byteSize(response.getBody());
        } catch (RestClientResponseException e) {
            execution.statusCode = e.getStatusCode().value();
            execution.success = false;
            execution.responseHeaders = flattenHeaders(e.getResponseHeaders() == null ? new HttpHeaders() : e.getResponseHeaders());
            execution.responseBody = truncate(e.getResponseBodyAsString(), 250_000);
            execution.responseSizeBytes = byteSize(e.getResponseBodyAsString());
            execution.errorMessage = truncate(e.getMessage(), 4_000);
        } catch (Exception e) {
            execution.success = false;
            execution.errorMessage = truncate(e.getMessage(), 4_000);
        }
        execution.responseTimeMs = Duration.between(started, Instant.now()).toMillis();
        applyAssertions(schedule, execution);
        return execution;
    }

    private void applyAssertions(Schedule schedule, Execution execution) {
        List<MonitoringDtos.AssertionResult> results = assertionService.evaluate(schedule, execution);
        execution.assertionResults = Map.of("results", List.copyOf(results));
        execution.assertionPassed = results.stream().allMatch(MonitoringDtos.AssertionResult::passed);
        execution.success = execution.success && execution.assertionPassed;
        if (!execution.assertionPassed) {
            String failure = results.stream().filter(result -> !result.passed()).findFirst().map(MonitoringDtos.AssertionResult::message).orElse("One or more assertions failed");
            execution.errorMessage = truncate(execution.errorMessage == null ? failure : execution.errorMessage + "; " + failure, 4_000);
        }
    }

    private ApiRequest renderRequest(ApiRequest source, Map<String, Object> variables) {
        ApiRequest rendered = new ApiRequest();
        rendered.id = source.id;
        rendered.workspace = source.workspace;
        rendered.collection = source.collection;
        rendered.name = source.name;
        rendered.method = source.method;
        rendered.url = renderString(source.url, variables);
        rendered.headers = renderMap(source.headers, variables);
        rendered.queryParams = renderMap(source.queryParams, variables);
        rendered.bodyType = source.bodyType;
        rendered.body = renderMap(source.body, variables);
        rendered.authType = source.authType;
        rendered.authEncrypted = source.authEncrypted;
        rendered.certificate = source.certificate;
        return rendered;
    }

    private Map<String, Object> renderMap(Map<String, Object> source, Map<String, Object> variables) {
        Map<String, Object> rendered = new LinkedHashMap<>();
        source.forEach((key, value) -> rendered.put(key, renderValue(value, variables)));
        return rendered;
    }

    @SuppressWarnings("unchecked")
    private Object renderValue(Object value, Map<String, Object> variables) {
        if (value instanceof String text) return renderString(text, variables);
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> rendered = new LinkedHashMap<>();
            map.forEach((key, child) -> rendered.put(String.valueOf(key), renderValue(child, variables)));
            return rendered;
        }
        if (value instanceof List<?> list) return list.stream().map(item -> renderValue(item, variables)).toList();
        return value;
    }

    private String renderString(String value, Map<String, Object> variables) {
        if (value == null) return null;
        Matcher matcher = VARIABLE.matcher(value);
        StringBuffer buffer = new StringBuffer();
        while (matcher.find()) {
            Object replacement = variables.get(matcher.group(1));
            matcher.appendReplacement(buffer, Matcher.quoteReplacement(replacement == null ? "" : String.valueOf(replacement)));
        }
        matcher.appendTail(buffer);
        return buffer.toString();
    }

    private URI buildUri(ApiRequest request) {
        URI base = ssrfGuard.validateExternalHttpUrl(request.url);
        UriComponentsBuilder builder = UriComponentsBuilder.fromUri(base);
        request.queryParams.forEach((k, v) -> { if (v != null) builder.queryParam(k, v); });
        return builder.build(true).toUri();
    }

    private HttpHeaders buildHeaders(ApiRequest request) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        request.headers.forEach((k, v) -> { if (v != null) headers.add(k, String.valueOf(v)); });
        if (request.authType != AuthType.NONE && request.authEncrypted != null) {
            Map<String, Object> auth = MAPPER.readValue(crypto.decrypt(request.authEncrypted), MAP);
            if (request.authType == AuthType.BEARER) headers.setBearerAuth(String.valueOf(auth.get("token")));
            if (request.authType == AuthType.API_KEY) headers.add(String.valueOf(auth.getOrDefault("headerName", "X-API-Key")), String.valueOf(auth.get("apiKey")));
            if (request.authType == AuthType.BASIC) headers.setBasicAuth(String.valueOf(auth.get("username")), String.valueOf(auth.get("password")));
        }
        return headers;
    }

    private Object buildBody(ApiRequest request, HttpHeaders headers) {
        if (request.bodyType == BodyType.NONE) return null;
        String contentType = headers.getFirst(HttpHeaders.CONTENT_TYPE);
        if (request.bodyType == BodyType.FORM_DATA) {
            MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
            request.body.forEach((key, value) -> form.add(key, value == null ? "" : value));
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            return form;
        }
        if (contentType != null && contentType.toLowerCase().contains("x-www-form-urlencoded")) {
            return request.body.entrySet().stream()
                .map(entry -> entry.getKey() + "=" + (entry.getValue() == null ? "" : String.valueOf(entry.getValue())))
                .reduce((left, right) -> left + "&" + right)
                .orElse("");
        }
        if (request.body.containsKey("value")) return String.valueOf(request.body.get("value"));
        return request.body;
    }

    private Map<String, Object> flattenHeaders(HttpHeaders headers) {
        Map<String, Object> flat = new LinkedHashMap<>();
        headers.forEach((key, value) -> flat.put(key, value.size() == 1 ? value.getFirst() : value));
        return flat;
    }

    private String truncate(String value, int max) {
        if (value == null || value.length() <= max) return value;
        return value.substring(0, max);
    }

    private long byteSize(String value) {
        return value == null ? 0 : value.getBytes(java.nio.charset.StandardCharsets.UTF_8).length;
    }

    private ExecutionDtos.ExecutionResponse toResponse(Execution e) {
        return new ExecutionDtos.ExecutionResponse(e.id, e.apiRequest.id, e.schedule == null ? null : e.schedule.id, e.statusCode, e.success, e.responseTimeMs, e.responseHeaders, e.responseBody, e.errorMessage, e.executedAt, e.responseSizeBytes, e.assertionPassed, e.assertionResults);
    }

    private Map<String, Object> copy(Map<String, Object> source) {
        return source == null ? new LinkedHashMap<>() : new LinkedHashMap<>(source);
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private <T extends Enum<T>> T parseEnum(Class<T> type, String value, T fallback) {
        if (blank(value)) return fallback;
        try {
            return Enum.valueOf(type, value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Unsupported " + type.getSimpleName());
        }
    }

    private Object[] flattenAggregate(Object[] row) {
        if (row != null && row.length == 1 && row[0] instanceof Object[] nested) return nested;
        return row == null ? new Object[0] : row;
    }
}
