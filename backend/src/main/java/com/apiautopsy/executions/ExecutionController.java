package com.apiautopsy.executions;

import com.apiautopsy.security.SecurityUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}")
public class ExecutionController {
    private final ExecutionService service;

    public ExecutionController(ExecutionService service) { this.service = service; }

    @PostMapping("/requests/{requestId}/execute")
    ExecutionDtos.ExecutionResponse execute(@PathVariable UUID workspaceId, @PathVariable UUID requestId) {
        return service.executeNow(SecurityUtils.currentUser().id(), workspaceId, requestId);
    }

    @GetMapping("/executions")
    List<ExecutionDtos.ExecutionResponse> history(@PathVariable UUID workspaceId) {
        return service.history(SecurityUtils.currentUser().id(), workspaceId);
    }

    @GetMapping("/reports/summary")
    ExecutionDtos.ReportResponse report(@PathVariable UUID workspaceId) {
        return service.report(SecurityUtils.currentUser().id(), workspaceId);
    }
}
