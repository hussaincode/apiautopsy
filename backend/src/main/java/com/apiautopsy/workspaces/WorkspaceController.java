package com.apiautopsy.workspaces;

import com.apiautopsy.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces")
public class WorkspaceController {
    private final WorkspaceService service;

    public WorkspaceController(WorkspaceService service) {
        this.service = service;
    }

    @GetMapping
    List<WorkspaceDtos.WorkspaceResponse> list() {
        return service.list(SecurityUtils.currentUser().id());
    }

    @PostMapping
    WorkspaceDtos.WorkspaceResponse create(@Valid @RequestBody WorkspaceDtos.WorkspaceRequest request) {
        return service.create(SecurityUtils.currentUser().id(), request);
    }

    @PostMapping("/{workspaceId}/invites")
    WorkspaceDtos.MemberResponse invite(@PathVariable UUID workspaceId, @Valid @RequestBody WorkspaceDtos.InviteRequest request) {
        return service.invite(SecurityUtils.currentUser().id(), workspaceId, request);
    }
}
