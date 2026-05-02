package com.apiautopsy.workflows;

import com.apiautopsy.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/collections/{collectionId}/workflow")
public class WorkflowController {
    private final WorkflowService service;

    public WorkflowController(WorkflowService service) {
        this.service = service;
    }

    @GetMapping("/steps")
    List<WorkflowDtos.WorkflowStepResponse> steps(@PathVariable UUID workspaceId, @PathVariable UUID collectionId) {
        return service.steps(SecurityUtils.currentUser().id(), workspaceId, collectionId);
    }

    @PutMapping("/steps")
    List<WorkflowDtos.WorkflowStepResponse> replaceSteps(@PathVariable UUID workspaceId, @PathVariable UUID collectionId, @Valid @RequestBody List<WorkflowDtos.WorkflowStepRequest> steps) {
        return service.replaceSteps(SecurityUtils.currentUser().id(), workspaceId, collectionId, steps);
    }

    @PostMapping("/run")
    WorkflowDtos.WorkflowRunResponse run(@PathVariable UUID workspaceId, @PathVariable UUID collectionId) {
        return service.runNow(SecurityUtils.currentUser().id(), workspaceId, collectionId);
    }

    @GetMapping("/runs")
    List<WorkflowDtos.WorkflowRunResponse> runs(@PathVariable UUID workspaceId, @PathVariable UUID collectionId) {
        return service.runs(SecurityUtils.currentUser().id(), workspaceId, collectionId);
    }
}
