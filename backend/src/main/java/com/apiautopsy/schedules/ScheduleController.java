package com.apiautopsy.schedules;

import com.apiautopsy.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/schedules")
public class ScheduleController {
    private final ScheduleService service;

    public ScheduleController(ScheduleService service) { this.service = service; }

    @GetMapping
    List<ScheduleDtos.ScheduleResponse> list(@PathVariable UUID workspaceId) {
        return service.list(SecurityUtils.currentUser().id(), workspaceId);
    }

    @PostMapping
    ScheduleDtos.ScheduleResponse create(@PathVariable UUID workspaceId, @Valid @RequestBody ScheduleDtos.ScheduleRequest request) {
        return service.create(SecurityUtils.currentUser().id(), workspaceId, request);
    }

    @PutMapping("/{scheduleId}")
    ScheduleDtos.ScheduleResponse update(@PathVariable UUID workspaceId, @PathVariable UUID scheduleId, @Valid @RequestBody ScheduleDtos.ScheduleRequest request) {
        return service.update(SecurityUtils.currentUser().id(), workspaceId, scheduleId, request);
    }

    @PatchMapping("/{scheduleId}/enabled")
    ScheduleDtos.ScheduleResponse toggleEnabled(@PathVariable UUID workspaceId, @PathVariable UUID scheduleId, @RequestBody ScheduleDtos.ToggleScheduleRequest request) {
        return service.updateEnabled(SecurityUtils.currentUser().id(), workspaceId, scheduleId, request.enabled());
    }

    @DeleteMapping("/{scheduleId}")
    void delete(@PathVariable UUID workspaceId, @PathVariable UUID scheduleId) {
        service.delete(SecurityUtils.currentUser().id(), workspaceId, scheduleId);
    }

    @GetMapping("/{scheduleId}/detail")
    ScheduleDtos.ScheduleDetailResponse detail(@PathVariable UUID workspaceId, @PathVariable UUID scheduleId) {
        return service.detail(SecurityUtils.currentUser().id(), workspaceId, scheduleId);
    }
}
