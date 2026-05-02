package com.apiautopsy.workspaces;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public class WorkspaceDtos {
    public record WorkspaceRequest(@NotBlank String name) {}
    public record InviteRequest(@Email String email, WorkspaceRole role) {}
    public record WorkspaceResponse(UUID id, String name, WorkspaceRole role) {}
    public record MemberResponse(UUID userId, String email, String name, WorkspaceRole role, MembershipStatus status) {}
}
