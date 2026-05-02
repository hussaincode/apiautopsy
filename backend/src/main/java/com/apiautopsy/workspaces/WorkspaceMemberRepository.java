package com.apiautopsy.workspaces;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, UUID> {
    boolean existsByWorkspaceIdAndUserIdAndStatus(UUID workspaceId, UUID userId, MembershipStatus status);
    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);
    List<WorkspaceMember> findByUserIdAndStatus(UUID userId, MembershipStatus status);
}
