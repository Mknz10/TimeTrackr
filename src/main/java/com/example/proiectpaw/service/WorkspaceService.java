package com.example.proiectpaw.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.proiectpaw.model.User;
import com.example.proiectpaw.model.Workspace;
import com.example.proiectpaw.model.WorkspaceMember;
import com.example.proiectpaw.model.WorkspaceMember.Role;
import com.example.proiectpaw.repository.UserRepository;
import com.example.proiectpaw.repository.WorkspaceMemberRepository;
import com.example.proiectpaw.repository.WorkspaceRepository;

@Service
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final UserRepository userRepository;

    public WorkspaceService(WorkspaceRepository workspaceRepository,
                             WorkspaceMemberRepository memberRepository,
                             UserRepository userRepository) {
        this.workspaceRepository = workspaceRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<WorkspaceSummary> getWorkspaceSummariesForUser(String username) {
        List<WorkspaceMember> memberships = memberRepository.findByUserUsernameOrderByJoinedAtAsc(username);
        return memberships.stream()
                .map(membership -> new WorkspaceSummary(
                        membership.getWorkspace(),
                        membership.getRole(),
                        membership.getWorkspace().getOwner().getUsername()))
                .collect(Collectors.toList());
    }

    @Transactional
    public Workspace createWorkspace(String name, String username) {
        User owner = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String sanitized = sanitizeName(name);
        if (sanitized.isEmpty()) {
            throw new IllegalArgumentException("Workspace name cannot be blank");
        }

        Workspace workspace = new Workspace(sanitized, owner);
        Workspace saved = workspaceRepository.save(workspace);

        WorkspaceMember ownerMembership = new WorkspaceMember(saved, owner, Role.OWNER);
        memberRepository.save(ownerMembership);
        saved.getMembers().add(ownerMembership);
        return saved;
    }

    @Transactional
    public void inviteMember(Long workspaceId, String inviterUsername, String memberUsername, Role role) {
        Workspace workspace = getWorkspaceForUser(inviterUsername, workspaceId);

        if (!isOwner(inviterUsername, workspaceId)) {
            throw new IllegalArgumentException("Insufficient permissions to invite members");
        }

        if (memberRepository.existsByWorkspaceIdAndUserUsername(workspaceId, memberUsername)) {
            throw new IllegalArgumentException("User already part of workspace");
        }

        User user = userRepository.findByUsername(memberUsername)
                .orElseThrow(() -> new IllegalArgumentException("Invited user does not exist"));

        WorkspaceMember membership = new WorkspaceMember(workspace, user, role);
        memberRepository.save(membership);
        workspace.getMembers().add(membership);
    }

    @Transactional(readOnly = true)
    public Workspace getWorkspaceForUser(String username, Long workspaceId) {
        WorkspaceMember membership = memberRepository.findByWorkspaceIdAndUserUsername(workspaceId, username)
                .orElseThrow(() -> new IllegalArgumentException("Workspace not accessible"));
        return membership.getWorkspace();
    }

    @Transactional(readOnly = true)
    public boolean isOwner(String username, Long workspaceId) {
        return memberRepository.findByWorkspaceIdAndUserUsername(workspaceId, username)
                .map(member -> Role.OWNER.name().equalsIgnoreCase(member.getRole()))
                .orElse(false);
    }

    @Transactional
    public void leaveWorkspace(Long workspaceId, String username) {
        WorkspaceMember membership = memberRepository.findByWorkspaceIdAndUserUsername(workspaceId, username)
                .orElseThrow(() -> new IllegalArgumentException("Workspace not accessible"));

        if (membership.getRole() != null && membership.getRole().equalsIgnoreCase(Role.OWNER.name())) {
            throw new IllegalArgumentException("Owner cannot leave workspace");
        }

        Workspace workspace = membership.getWorkspace();
        memberRepository.delete(membership);
        if (workspace != null) {
            workspace.getMembers().remove(membership);
        }
    }

    @Transactional
    public WorkspaceSummary renameWorkspace(Long workspaceId, String username, String newName) {
        WorkspaceMember membership = memberRepository.findByWorkspaceIdAndUserUsername(workspaceId, username)
                .orElseThrow(() -> new IllegalArgumentException("Workspace not accessible"));

        if (!isOwner(username, workspaceId)) {
            throw new IllegalArgumentException("Insufficient permissions to rename workspace");
        }

        String sanitized = sanitizeName(newName);
        if (sanitized.isEmpty()) {
            throw new IllegalArgumentException("Workspace name cannot be blank");
        }

        Workspace workspace = membership.getWorkspace();
        workspace.setName(sanitized);
        Workspace saved = workspaceRepository.save(workspace);
        return new WorkspaceSummary(saved, membership.getRole(), saved.getOwner().getUsername());
    }

    @Transactional(readOnly = true)
    public List<WorkspaceMember> getMembers(Long workspaceId, String requestingUsername) {
        getWorkspaceForUser(requestingUsername, workspaceId);
        return memberRepository.findByWorkspaceId(workspaceId).stream()
                .sorted((first, second) -> {
                    int roleComparison = Integer.compare(
                            rolePriority(first.getRole()),
                            rolePriority(second.getRole()));
                    if (roleComparison != 0) {
                        return roleComparison;
                    }
                    String firstName = first.getUser() != null ? first.getUser().getName() : "";
                    String secondName = second.getUser() != null ? second.getUser().getName() : "";
                    int nameComparison = firstName.compareToIgnoreCase(secondName);
                    if (nameComparison != 0) {
                        return nameComparison;
                    }
                    String firstUsername = first.getUser() != null ? first.getUser().getUsername() : "";
                    String secondUsername = second.getUser() != null ? second.getUser().getUsername() : "";
                    return firstUsername.compareToIgnoreCase(secondUsername);
                })
                .collect(Collectors.toList());
    }

    private String sanitizeName(String raw) {
        return raw == null ? "" : raw.trim();
    }

    private int rolePriority(String role) {
        if (role == null) {
            return 3;
        }
        String normalized = role.toUpperCase();
        if (Role.OWNER.name().equals(normalized)) {
            return 0;
        }
        if (Role.MEMBER.name().equals(normalized)) {
            return 1;
        }
        return 2;
    }

    public static class WorkspaceSummary {
        private final Workspace workspace;
        private final String role;
        private final String ownerUsername;

        public WorkspaceSummary(Workspace workspace, String role, String ownerUsername) {
            this.workspace = workspace;
            this.role = role;
            this.ownerUsername = ownerUsername;
        }

        public Workspace getWorkspace() {
            return workspace;
        }

        public String getRole() {
            return role;
        }

        public String getOwnerUsername() {
            return ownerUsername;
        }
    }
}
