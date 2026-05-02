package com.apiautopsy.workflows;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class WorkflowDtos {
    public record ExtractionRule(String variableName, String jsonPath) {}
    public record WorkflowStepRequest(@NotNull UUID apiRequestId, int stepOrder, UUID dependsOnStepId, boolean stopOnFailure, List<ExtractionRule> extractionRules) {}
    public record WorkflowStepResponse(UUID id, UUID apiRequestId, int stepOrder, UUID dependsOnStepId, boolean stopOnFailure, List<ExtractionRule> extractionRules) {}
    public record WorkflowRunLog(UUID id, UUID workflowStepId, UUID executionId, int stepOrder, String stepName, boolean success, long responseTimeMs, Integer statusCode, Map<String, Object> extractedVariables, String errorMessage, Instant executedAt) {}
    public record WorkflowRunResponse(UUID id, UUID collectionId, UUID scheduleId, boolean success, long totalDurationMs, Map<String, Object> variables, String errorMessage, Instant startedAt, Instant completedAt, List<WorkflowRunLog> logs) {}
}
