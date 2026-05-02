package com.apiautopsy.requests;

import com.apiautopsy.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/requests")
public class ApiRequestController {
    private final ApiRequestService service;

    public ApiRequestController(ApiRequestService service) { this.service = service; }

    @GetMapping
    List<ApiRequestDtos.ApiRequestResponse> list(@PathVariable UUID workspaceId) {
        return service.list(SecurityUtils.currentUser().id(), workspaceId);
    }

    @PostMapping
    ApiRequestDtos.ApiRequestResponse create(@PathVariable UUID workspaceId, @Valid @RequestBody ApiRequestDtos.UpsertRequest request) {
        return service.create(SecurityUtils.currentUser().id(), workspaceId, request);
    }

    @PutMapping("/{requestId}")
    ApiRequestDtos.ApiRequestResponse update(@PathVariable UUID workspaceId, @PathVariable UUID requestId, @Valid @RequestBody ApiRequestDtos.UpsertRequest request) {
        return service.update(SecurityUtils.currentUser().id(), workspaceId, requestId, request);
    }
}
