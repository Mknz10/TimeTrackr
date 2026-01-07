package com.example.proiectpaw.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.proiectpaw.model.Workspace;
import com.example.proiectpaw.model.WorkspaceMember;
import com.example.proiectpaw.model.WorkspaceMember.Role;
import com.example.proiectpaw.security.CustomUserDetails;
import com.example.proiectpaw.service.WorkspaceService;

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
        workspaceService.ensureDefaultWorkspace(userDetails.getUsername());
        List<Workspace> workspaces = workspaceService.getWorkspacesForUser(userDetails.getUsername());
        return workspaces.stream()
                .map(workspace -> toDto(workspace, userDetails.getUsername()))
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
        Workspace created = workspaceService.createWorkspace(request.getName(), userDetails.getUsername());
        return toDto(created, userDetails.getUsername());
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

    private WorkspaceDto toDto(Workspace workspace, String currentUsername) {
        WorkspaceMember membership = workspace.getMembers().stream()
                .filter(m -> m.getUser().getUsername().equals(currentUsername))
                .findFirst()
                .orElse(null);
        String role = membership != null ? membership.getRole() : Role.MEMBER.name();
        WorkspaceDto dto = new WorkspaceDto();
        dto.setId(workspace.getId());
        dto.setName(workspace.getName());
        dto.setRole(role);
        dto.setOwner(workspace.getOwner().getUsername());
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
