package com.apiautopsy.workspaces;

import com.apiautopsy.common.ForbiddenException;
import com.apiautopsy.common.NotFoundException;
import com.apiautopsy.users.User;
import com.apiautopsy.users.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class WorkspaceService {
    private final WorkspaceRepository workspaces;
    private final WorkspaceMemberRepository members;
    private final UserRepository users;

    public WorkspaceService(WorkspaceRepository workspaces, WorkspaceMemberRepository members, UserRepository users) {
        this.workspaces = workspaces;
        this.members = members;
        this.users = users;
    }

    @Transactional
    public Workspace createPersonalWorkspace(User user) {
        Workspace workspace = new Workspace();
        workspace.name = user.name + "'s Workspace";
        workspace.owner = user;
        workspaces.save(workspace);
        WorkspaceMember member = new WorkspaceMember();
        member.workspace = workspace;
        member.user = user;
        member.role = WorkspaceRole.OWNER;
        member.status = MembershipStatus.ACTIVE;
        members.save(member);
        return workspace;
    }

    @Transactional
    public WorkspaceDtos.WorkspaceResponse create(UUID userId, WorkspaceDtos.WorkspaceRequest request) {
        User owner = users.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
        Workspace workspace = new Workspace();
        workspace.name = request.name();
        workspace.owner = owner;
        workspaces.save(workspace);
        WorkspaceMember member = new WorkspaceMember();
        member.workspace = workspace;
        member.user = owner;
        member.role = WorkspaceRole.OWNER;
        member.status = MembershipStatus.ACTIVE;
        members.save(member);
        return new WorkspaceDtos.WorkspaceResponse(workspace.id, workspace.name, WorkspaceRole.OWNER);
    }

    public List<WorkspaceDtos.WorkspaceResponse> list(UUID userId) {
        return members.findByUserIdAndStatus(userId, MembershipStatus.ACTIVE).stream()
            .map(m -> new WorkspaceDtos.WorkspaceResponse(m.workspace.id, m.workspace.name, m.role))
            .toList();
    }

    @Transactional
    public WorkspaceDtos.MemberResponse invite(UUID actorId, UUID workspaceId, WorkspaceDtos.InviteRequest request) {
        requireAdmin(workspaceId, actorId);
        User user = users.findByEmailIgnoreCase(request.email()).orElseGet(() -> {
            User pending = new User();
            pending.email = request.email().toLowerCase();
            pending.name = request.email();
            users.save(pending);
            return pending;
        });
        Workspace workspace = workspaces.findById(workspaceId).orElseThrow(() -> new NotFoundException("Workspace not found"));
        WorkspaceMember member = members.findByWorkspaceIdAndUserId(workspaceId, user.id).orElseGet(WorkspaceMember::new);
        member.workspace = workspace;
        member.user = user;
        member.role = request.role() == null ? WorkspaceRole.MEMBER : request.role();
        member.status = MembershipStatus.INVITED;
        member.invitedEmail = request.email().toLowerCase();
        members.save(member);
        return new WorkspaceDtos.MemberResponse(user.id, user.email, user.name, member.role, member.status);
    }

    public void requireMember(UUID workspaceId, UUID userId) {
        if (!members.existsByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, MembershipStatus.ACTIVE)) {
            throw new ForbiddenException("Workspace access denied");
        }
    }

    public void requireAdmin(UUID workspaceId, UUID userId) {
        WorkspaceMember member = members.findByWorkspaceIdAndUserId(workspaceId, userId)
            .orElseThrow(() -> new ForbiddenException("Workspace access denied"));
        if (member.status != MembershipStatus.ACTIVE || member.role == WorkspaceRole.MEMBER) throw new ForbiddenException("Workspace admin access required");
    }
}
