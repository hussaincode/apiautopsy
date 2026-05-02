package com.apiautopsy.requests;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApiRequestRepository extends JpaRepository<ApiRequest, UUID> {
    List<ApiRequest> findByWorkspaceId(UUID workspaceId);
    Optional<ApiRequest> findByIdAndWorkspaceId(UUID id, UUID workspaceId);
}
