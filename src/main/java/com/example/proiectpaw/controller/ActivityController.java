package com.example.proiectpaw.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.proiectpaw.dto.UserActivityView;
import com.example.proiectpaw.model.WorkspaceActivity;
import com.example.proiectpaw.security.CustomUserDetails;
import com.example.proiectpaw.service.WorkspaceActivityService;

@RestController
@RequestMapping("/api/activities")
public class ActivityController {
    private final WorkspaceActivityService service;

    public ActivityController(WorkspaceActivityService service) {
        this.service = service;
    }

    @GetMapping
    public List<UserActivityView> getActivities(@AuthenticationPrincipal CustomUserDetails userDetails,
                                        @RequestParam("workspaceId") Long workspaceId) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        return service.getActivitiesForWorkspace(userDetails.getUsername(), workspaceId);
    }

    @PostMapping
    public WorkspaceActivity addActivity(@RequestBody WorkspaceActivity activity,
                                @RequestParam("workspaceId") Long workspaceId,
                                @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        try {
            return service.addActivityForWorkspace(activity, userDetails.getUsername(), workspaceId);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public void deleteActivity(@PathVariable Long id,
                               @RequestParam("workspaceId") Long workspaceId,
                               @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        try {
            service.deleteWorkspaceActivity(id, userDetails.getUsername(), workspaceId);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }
}