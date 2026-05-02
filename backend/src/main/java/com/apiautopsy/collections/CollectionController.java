package com.apiautopsy.collections;

import com.apiautopsy.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/collections")
public class CollectionController {
    private final CollectionService service;

    public CollectionController(CollectionService service) { this.service = service; }

    @GetMapping
    List<CollectionDtos.CollectionResponse> list(@PathVariable UUID workspaceId) {
        return service.list(SecurityUtils.currentUser().id(), workspaceId);
    }

    @PostMapping
    CollectionDtos.CollectionResponse create(@PathVariable UUID workspaceId, @Valid @RequestBody CollectionDtos.CollectionRequest request) {
        return service.create(SecurityUtils.currentUser().id(), workspaceId, request);
    }
}
