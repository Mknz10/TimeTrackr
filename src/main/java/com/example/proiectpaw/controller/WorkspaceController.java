package com.example.proiectpaw.controller;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.proiectpaw.model.WorkspaceMember;
import com.example.proiectpaw.model.WorkspaceMember.Role;
import com.example.proiectpaw.security.CustomUserDetails;
import com.example.proiectpaw.service.WorkspaceService;
import com.example.proiectpaw.service.WorkspaceService.WorkspaceSummary;

@RestController
@RequestMapping("/api/workspaces")
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    public WorkspaceController(WorkspaceService workspaceService) {
        this.workspaceService = workspaceService;
    }

    @GetMapping
    public List<WorkspaceDto> getWorkspaces(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        List<WorkspaceSummary> summaries = workspaceService.getWorkspaceSummariesForUser(userDetails.getUsername());
        return summaries.stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkspaceDto createWorkspace(@AuthenticationPrincipal CustomUserDetails userDetails,
                                         @RequestBody WorkspaceRequest request) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        if (request == null || request.getName() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workspace name is required");
        }
        WorkspaceSummary summary = new WorkspaceSummary(
            workspaceService.createWorkspace(request.getName(), userDetails.getUsername()),
            Role.OWNER.name(),
            userDetails.getUsername());
        return toDto(summary);
    }

    @PutMapping("/{workspaceId}")
    public WorkspaceDto renameWorkspace(@AuthenticationPrincipal CustomUserDetails userDetails,
                                         @PathVariable Long workspaceId,
                                         @RequestBody WorkspaceRequest request) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        if (request == null || request.getName() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workspace name is required");
        }
        try {
            WorkspaceSummary summary = workspaceService.renameWorkspace(
                    workspaceId,
                    userDetails.getUsername(),
                    request.getName());
            return toDto(summary);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    @PostMapping("/{workspaceId}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public void inviteMember(@AuthenticationPrincipal CustomUserDetails userDetails,
                             @PathVariable Long workspaceId,
                             @RequestBody InviteRequest inviteRequest) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        if (inviteRequest == null || inviteRequest.getUsername() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is required");
        }
        Role role = Role.MEMBER;
        if (inviteRequest.getRole() != null) {
            try {
                role = Role.valueOf(inviteRequest.getRole().toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role");
            }
        }
        workspaceService.inviteMember(workspaceId, userDetails.getUsername(), inviteRequest.getUsername(), role);
    }

    @GetMapping("/{workspaceId}/members")
    public List<MemberDto> getMembers(@AuthenticationPrincipal CustomUserDetails userDetails,
                                      @PathVariable Long workspaceId) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        List<WorkspaceMember> members = workspaceService.getMembers(workspaceId, userDetails.getUsername());
        return members.stream()
            .map(this::toMemberDto)
            .collect(Collectors.toList());
    }

    @DeleteMapping("/{workspaceId}/members/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leaveWorkspace(@AuthenticationPrincipal CustomUserDetails userDetails,
                               @PathVariable Long workspaceId) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        try {
            workspaceService.leaveWorkspace(workspaceId, userDetails.getUsername());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    private WorkspaceDto toDto(WorkspaceSummary summary) {
        var workspace = summary.getWorkspace();
        WorkspaceDto dto = new WorkspaceDto();
        dto.setId(workspace.getId());
        dto.setName(workspace.getName());
        dto.setRole(summary.getRole());
        dto.setOwner(summary.getOwnerUsername());
        return dto;
    }

    private MemberDto toMemberDto(WorkspaceMember member) {
        MemberDto dto = new MemberDto();
        dto.setUsername(member.getUser() != null ? member.getUser().getUsername() : null);
        dto.setName(member.getUser() != null ? member.getUser().getName() : null);
        dto.setRole(member.getRole());
        dto.setJoinedAt(member.getJoinedAt());
        return dto;
    }

    public static class WorkspaceRequest {
        private String name;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }

    public static class InviteRequest {
        private String username;
        private String role;

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }
    }

    public static class MemberDto {
        private String username;
        private String name;
        private String role;
        private Instant joinedAt;

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }

        public Instant getJoinedAt() {
            return joinedAt;
        }

        public void setJoinedAt(Instant joinedAt) {
            this.joinedAt = joinedAt;
        }
    }

    public static class WorkspaceDto {
        private Long id;
        private String name;
        private String role;
        private String owner;

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }

        public String getOwner() {
            return owner;
        }

        public void setOwner(String owner) {
            this.owner = owner;
        }
    }
}
