package com.apiautopsy.monitoring;

import com.apiautopsy.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/schedules/{scheduleId}/assertions")
public class MonitoringController {
    private final AssertionService service;

    public MonitoringController(AssertionService service) {
        this.service = service;
    }

    @GetMapping
    List<MonitoringDtos.AssertionResponse> list(@PathVariable UUID workspaceId, @PathVariable UUID scheduleId) {
        return service.list(SecurityUtils.currentUser().id(), workspaceId, scheduleId);
    }

    @PostMapping
    MonitoringDtos.AssertionResponse create(@PathVariable UUID workspaceId, @PathVariable UUID scheduleId, @Valid @RequestBody MonitoringDtos.AssertionRequest request) {
        return service.save(SecurityUtils.currentUser().id(), workspaceId, scheduleId, request);
    }

    @PutMapping("/{assertionId}")
    MonitoringDtos.AssertionResponse update(@PathVariable UUID workspaceId, @PathVariable UUID scheduleId, @PathVariable UUID assertionId, @Valid @RequestBody MonitoringDtos.AssertionRequest request) {
        return service.update(SecurityUtils.currentUser().id(), workspaceId, scheduleId, assertionId, request);
    }

    @DeleteMapping("/{assertionId}")
    void delete(@PathVariable UUID workspaceId, @PathVariable UUID scheduleId, @PathVariable UUID assertionId) {
        service.delete(SecurityUtils.currentUser().id(), workspaceId, scheduleId, assertionId);
    }
}
