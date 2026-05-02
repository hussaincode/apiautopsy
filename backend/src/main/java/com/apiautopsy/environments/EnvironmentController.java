package com.apiautopsy.environments;

import com.apiautopsy.common.NotFoundException;
import com.apiautopsy.security.SecurityUtils;
import com.apiautopsy.workspaces.WorkspaceRepository;
import com.apiautopsy.workspaces.WorkspaceService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/environments")
public class EnvironmentController {
    private final EnvironmentRepository environments;
    private final WorkspaceRepository workspaces;
    private final WorkspaceService workspaceService;

    public EnvironmentController(EnvironmentRepository environments, WorkspaceRepository workspaces, WorkspaceService workspaceService) {
        this.environments = environments;
        this.workspaces = workspaces;
        this.workspaceService = workspaceService;
    }

    @GetMapping
    List<EnvironmentDtos.EnvironmentResponse> list(@PathVariable UUID workspaceId) {
        workspaceService.requireMember(workspaceId, SecurityUtils.currentUser().id());
        return environments.findByWorkspaceId(workspaceId).stream().map(e -> new EnvironmentDtos.EnvironmentResponse(e.id, e.name, e.variables)).toList();
    }

    @PostMapping
    EnvironmentDtos.EnvironmentResponse create(@PathVariable UUID workspaceId, @Valid @RequestBody EnvironmentDtos.EnvironmentRequest request) {
        workspaceService.requireMember(workspaceId, SecurityUtils.currentUser().id());
        Environment env = new Environment();
        env.workspace = workspaces.findById(workspaceId).orElseThrow(() -> new NotFoundException("Workspace not found"));
        env.name = request.name();
        env.variables = request.variables() == null ? new LinkedHashMap<>() : request.variables();
        environments.save(env);
        return new EnvironmentDtos.EnvironmentResponse(env.id, env.name, env.variables);
    }
}
