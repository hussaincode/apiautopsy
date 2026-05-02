package com.apiautopsy.collections;

import com.apiautopsy.common.NotFoundException;
import com.apiautopsy.workspaces.Workspace;
import com.apiautopsy.workspaces.WorkspaceRepository;
import com.apiautopsy.workspaces.WorkspaceService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class CollectionService {
    private final CollectionRepository collections;
    private final WorkspaceRepository workspaces;
    private final WorkspaceService workspaceService;

    public CollectionService(CollectionRepository collections, WorkspaceRepository workspaces, WorkspaceService workspaceService) {
        this.collections = collections;
        this.workspaces = workspaces;
        this.workspaceService = workspaceService;
    }

    public List<CollectionDtos.CollectionResponse> list(UUID userId, UUID workspaceId) {
        workspaceService.requireMember(workspaceId, userId);
        return collections.findByWorkspaceId(workspaceId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public CollectionDtos.CollectionResponse create(UUID userId, UUID workspaceId, CollectionDtos.CollectionRequest request) {
        workspaceService.requireMember(workspaceId, userId);
        Workspace workspace = workspaces.findById(workspaceId).orElseThrow(() -> new NotFoundException("Workspace not found"));
        Collection collection = new Collection();
        collection.workspace = workspace;
        collection.name = request.name();
        collection.description = request.description();
        if (request.parentId() != null) {
            Collection parent = collections.findById(request.parentId()).orElseThrow(() -> new NotFoundException("Parent collection not found"));
            if (!parent.workspace.id.equals(workspaceId)) throw new NotFoundException("Parent collection not found");
            collection.parent = parent;
        }
        collections.save(collection);
        return toResponse(collection);
    }

    private CollectionDtos.CollectionResponse toResponse(Collection c) {
        return new CollectionDtos.CollectionResponse(c.id, c.parent == null ? null : c.parent.id, c.name, c.description);
    }
}
