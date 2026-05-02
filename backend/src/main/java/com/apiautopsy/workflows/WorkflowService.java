package com.apiautopsy.workflows;

import com.apiautopsy.collections.Collection;
import com.apiautopsy.collections.CollectionRepository;
import com.apiautopsy.common.NotFoundException;
import com.apiautopsy.executions.Execution;
import com.apiautopsy.executions.ExecutionService;
import com.apiautopsy.requests.ApiRequest;
import com.apiautopsy.requests.ApiRequestRepository;
import com.apiautopsy.schedules.Schedule;
import com.apiautopsy.workspaces.WorkspaceService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class WorkflowService {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private final WorkflowStepRepository steps;
    private final WorkflowExecutionRepository workflowExecutions;
    private final WorkflowExecutionLogRepository logs;
    private final CollectionRepository collections;
    private final ApiRequestRepository requests;
    private final WorkspaceService workspaceService;
    private final ExecutionService executionService;

    public WorkflowService(WorkflowStepRepository steps, WorkflowExecutionRepository workflowExecutions, WorkflowExecutionLogRepository logs, CollectionRepository collections, ApiRequestRepository requests, WorkspaceService workspaceService, ExecutionService executionService) {
        this.steps = steps;
        this.workflowExecutions = workflowExecutions;
        this.logs = logs;
        this.collections = collections;
        this.requests = requests;
        this.workspaceService = workspaceService;
        this.executionService = executionService;
    }

    public List<WorkflowDtos.WorkflowStepResponse> steps(UUID userId, UUID workspaceId, UUID collectionId) {
        workspaceService.requireMember(workspaceId, userId);
        requireCollection(workspaceId, collectionId);
        return steps.findByCollectionIdOrderByStepOrderAsc(collectionId).stream().map(this::stepResponse).toList();
    }

    @Transactional
    public List<WorkflowDtos.WorkflowStepResponse> replaceSteps(UUID userId, UUID workspaceId, UUID collectionId, List<WorkflowDtos.WorkflowStepRequest> dto) {
        workspaceService.requireMember(workspaceId, userId);
        Collection collection = requireCollection(workspaceId, collectionId);
        steps.deleteByCollectionId(collectionId);
        for (WorkflowDtos.WorkflowStepRequest item : dto) {
            ApiRequest request = requests.findByIdAndWorkspaceId(item.apiRequestId(), workspaceId).orElseThrow(() -> new NotFoundException("API request not found"));
            WorkflowStep step = new WorkflowStep();
            step.workspace = collection.workspace;
            step.collection = collection;
            step.apiRequest = request;
            step.stepOrder = item.stepOrder();
            step.stopOnFailure = item.stopOnFailure();
            step.extractionRules = encodeRules(item.extractionRules());
            steps.save(step);
        }
        return steps(userId, workspaceId, collectionId);
    }

    @Transactional
    public WorkflowDtos.WorkflowRunResponse runNow(UUID userId, UUID workspaceId, UUID collectionId) {
        workspaceService.requireMember(workspaceId, userId);
        return runWorkflow(workspaceId, collectionId, null);
    }

    @Transactional
    public WorkflowDtos.WorkflowRunResponse runScheduled(UUID workspaceId, UUID collectionId, Schedule schedule) {
        return runWorkflow(workspaceId, collectionId, schedule);
    }

    public List<WorkflowDtos.WorkflowRunResponse> runs(UUID userId, UUID workspaceId, UUID collectionId) {
        workspaceService.requireMember(workspaceId, userId);
        requireCollection(workspaceId, collectionId);
        return workflowExecutions.findTop50ByCollectionIdOrderByStartedAtDesc(collectionId).stream().map(this::runResponse).toList();
    }

    private WorkflowDtos.WorkflowRunResponse runWorkflow(UUID workspaceId, UUID collectionId, Schedule schedule) {
        Collection collection = requireCollection(workspaceId, collectionId);
        List<WorkflowStep> ordered = steps.findByCollectionIdOrderByStepOrderAsc(collectionId);
        WorkflowExecution run = new WorkflowExecution();
        run.workspace = collection.workspace;
        run.collection = collection;
        run.schedule = schedule;
        workflowExecutions.save(run);
        Instant started = Instant.now();
        Map<String, Object> variables = new LinkedHashMap<>();
        boolean success = true;
        String error = null;
        for (WorkflowStep step : ordered) {
            Execution execution = executionService.executeWorkflowStep(step.apiRequest, schedule, variables);
            Map<String, Object> extracted = extractVariables(execution.responseBody, decodeRules(step.extractionRules));
            variables.putAll(extracted);
            WorkflowExecutionLog log = new WorkflowExecutionLog();
            log.workflowExecution = run;
            log.workflowStep = step;
            log.execution = execution;
            log.stepOrder = step.stepOrder;
            log.stepName = step.apiRequest.name;
            log.success = execution.success;
            log.responseTimeMs = execution.responseTimeMs;
            log.statusCode = execution.statusCode;
            log.extractedVariables = extracted;
            log.errorMessage = execution.errorMessage;
            logs.save(log);
            if (!execution.success) {
                success = false;
                error = execution.errorMessage == null ? "Step failed: " + step.apiRequest.name : execution.errorMessage;
                if (step.stopOnFailure) break;
            }
        }
        run.success = success;
        run.totalDurationMs = Duration.between(started, Instant.now()).toMillis();
        run.variables = variables;
        run.errorMessage = error;
        run.completedAt = Instant.now();
        return runResponse(run);
    }

    private Map<String, Object> extractVariables(String responseBody, List<WorkflowDtos.ExtractionRule> rules) {
        Map<String, Object> extracted = new LinkedHashMap<>();
        if (responseBody == null || responseBody.isBlank() || rules == null || rules.isEmpty()) return extracted;
        try {
            JsonNode root = MAPPER.readTree(responseBody);
            for (WorkflowDtos.ExtractionRule rule : rules) {
                String variableName = rule.variableName();
                String jsonPath = rule.jsonPath();
                if (!variableName.isBlank() && !jsonPath.isBlank()) {
                    JsonNode value = readJsonPath(root, jsonPath);
                    if (value != null && !value.isMissingNode() && !value.isNull()) extracted.put(variableName, value.isValueNode() ? value.asText() : MAPPER.convertValue(value, Object.class));
                }
            }
        } catch (Exception ignored) {
            return extracted;
        }
        return extracted;
    }

    private JsonNode readJsonPath(JsonNode root, String jsonPath) {
        if (!jsonPath.startsWith("$")) throw new IllegalArgumentException("JSON path must start with $");
        JsonNode current = root;
        String path = jsonPath.replaceFirst("^\\$\\.?", "");
        if (path.isBlank()) return current;
        for (String part : path.split("\\.")) {
            current = current.path(part);
        }
        return current;
    }

    private Collection requireCollection(UUID workspaceId, UUID collectionId) {
        Collection collection = collections.findById(collectionId).orElseThrow(() -> new NotFoundException("Collection not found"));
        if (!collection.workspace.id.equals(workspaceId)) throw new NotFoundException("Collection not found");
        return collection;
    }

    private Map<String, Object> encodeRules(List<WorkflowDtos.ExtractionRule> rules) {
        if (rules == null) return Map.of("rules", List.of());
        return Map.of("rules", rules.stream().map(rule -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("variableName", rule.variableName());
            item.put("jsonPath", rule.jsonPath());
            return item;
        }).toList());
    }

    private WorkflowDtos.WorkflowStepResponse stepResponse(WorkflowStep step) {
        return new WorkflowDtos.WorkflowStepResponse(step.id, step.apiRequest.id, step.stepOrder, step.dependsOnStep == null ? null : step.dependsOnStep.id, step.stopOnFailure, decodeRules(step.extractionRules));
    }

    @SuppressWarnings("unchecked")
    private List<WorkflowDtos.ExtractionRule> decodeRules(Map<String, Object> rules) {
        if (rules == null || !(rules.get("rules") instanceof List<?> items)) return List.of();
        return items.stream()
            .filter(Map.class::isInstance)
            .map(item -> (Map<String, Object>) item)
            .map(rule -> new WorkflowDtos.ExtractionRule(String.valueOf(rule.getOrDefault("variableName", "")), String.valueOf(rule.getOrDefault("jsonPath", ""))))
            .toList();
    }

    private WorkflowDtos.WorkflowRunResponse runResponse(WorkflowExecution run) {
        return new WorkflowDtos.WorkflowRunResponse(run.id, run.collection.id, run.schedule == null ? null : run.schedule.id, run.success, run.totalDurationMs, run.variables, run.errorMessage, run.startedAt, run.completedAt, logs.findByWorkflowExecutionIdOrderByStepOrderAsc(run.id).stream().map(this::logResponse).toList());
    }

    private WorkflowDtos.WorkflowRunLog logResponse(WorkflowExecutionLog log) {
        return new WorkflowDtos.WorkflowRunLog(log.id, log.workflowStep.id, log.execution == null ? null : log.execution.id, log.stepOrder, log.stepName, log.success, log.responseTimeMs, log.statusCode, log.extractedVariables, log.errorMessage, log.executedAt);
    }
}
