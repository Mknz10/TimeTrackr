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
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.proiectpaw.dto.UserActivityView;
import com.example.proiectpaw.model.Activity;
import com.example.proiectpaw.security.CustomUserDetails;
import com.example.proiectpaw.service.ActivityService;

@RestController
@RequestMapping("/api/personal/activities")
public class PersonalActivityController {

    private final ActivityService service;

    public PersonalActivityController(ActivityService service) {
        this.service = service;
    }

    @GetMapping
    public List<UserActivityView> getPersonalActivities(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        return service.getPersonalActivities(userDetails.getUsername());
    }

    @PostMapping
    public Activity addPersonalActivity(@RequestBody Activity activity,
                                        @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        try {
            return service.addPersonalActivity(activity, userDetails.getUsername());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public void deletePersonalActivity(@PathVariable Long id,
                                        @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        try {
            service.deletePersonalActivity(id, userDetails.getUsername());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }
}
