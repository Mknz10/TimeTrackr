package com.example.proiectpaw.service;

import java.util.List;
import java.util.Optional;
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

    @Transactional
    public Workspace ensureDefaultWorkspace(String username) {
        Optional<Workspace> existing = workspaceRepository.findFirstByMembersUserUsernameOrderByCreatedAtAsc(username);
        if (existing.isPresent()) {
            return existing.get();
        }

        User owner = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Workspace workspace = new Workspace(owner.getName() + " Workspace", owner);
        Workspace saved = workspaceRepository.save(workspace);

        WorkspaceMember membership = new WorkspaceMember(saved, owner, Role.OWNER);
        memberRepository.save(membership);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Workspace> getWorkspacesForUser(String username) {
        return workspaceRepository.findByMembersUserUsernameOrderByNameAsc(username);
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
        return saved;
    }

    @Transactional
    public void inviteMember(Long workspaceId, String inviterUsername, String memberUsername, Role role) {
        Workspace workspace = getWorkspaceForUser(inviterUsername, workspaceId);

        if (!isOwnerOrAdmin(inviterUsername, workspaceId)) {
            throw new IllegalArgumentException("Insufficient permissions to invite members");
        }

        if (memberRepository.existsByWorkspaceIdAndUserUsername(workspaceId, memberUsername)) {
            throw new IllegalArgumentException("User already part of workspace");
        }

        User user = userRepository.findByUsername(memberUsername)
                .orElseThrow(() -> new IllegalArgumentException("Invited user does not exist"));

        WorkspaceMember membership = new WorkspaceMember(workspace, user, role);
        memberRepository.save(membership);
    }

    @Transactional(readOnly = true)
    public Workspace getWorkspaceForUser(String username, Long workspaceId) {
        WorkspaceMember membership = memberRepository.findByWorkspaceIdAndUserUsername(workspaceId, username)
                .orElseThrow(() -> new IllegalArgumentException("Workspace not accessible"));
        return membership.getWorkspace();
    }

    @Transactional(readOnly = true)
    public boolean isOwnerOrAdmin(String username, Long workspaceId) {
        return memberRepository.findByWorkspaceIdAndUserUsername(workspaceId, username)
                .map(member -> Role.OWNER.name().equals(member.getRole()) || Role.ADMIN.name().equals(member.getRole()))
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public List<WorkspaceMember> getMembers(Long workspaceId, String requestingUsername) {
        getWorkspaceForUser(requestingUsername, workspaceId);
        return memberRepository.findByWorkspaceId(workspaceId);
    }

    private String sanitizeName(String raw) {
        return raw == null ? "" : raw.trim();
    }
}
