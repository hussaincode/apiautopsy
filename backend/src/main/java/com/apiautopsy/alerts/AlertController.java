package com.apiautopsy.alerts;

import com.apiautopsy.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/alerts")
public class AlertController {
    private final AlertService service;

    public AlertController(AlertService service) {
        this.service = service;
    }

    @GetMapping("/rules")
    List<AlertDtos.AlertRuleResponse> listRules(@PathVariable UUID workspaceId) {
        return service.listRules(SecurityUtils.currentUser().id(), workspaceId);
    }

    @PutMapping("/rules/{scheduleId}")
    AlertDtos.AlertRuleResponse saveRule(@PathVariable UUID workspaceId, @PathVariable UUID scheduleId, @Valid @RequestBody AlertDtos.AlertRuleRequest request) {
        return service.saveRule(SecurityUtils.currentUser().id(), workspaceId, scheduleId, request);
    }

    @GetMapping("/incidents")
    List<AlertDtos.AlertIncidentResponse> listIncidents(@PathVariable UUID workspaceId) {
        return service.listIncidents(SecurityUtils.currentUser().id(), workspaceId);
    }

    @PostMapping("/incidents/{incidentId}/resolve")
    AlertDtos.AlertIncidentResponse resolveIncident(@PathVariable UUID workspaceId, @PathVariable UUID incidentId) {
        return service.resolveIncident(SecurityUtils.currentUser().id(), workspaceId, incidentId);
    }
}
