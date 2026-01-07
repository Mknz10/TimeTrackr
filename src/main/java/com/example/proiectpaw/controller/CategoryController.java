package com.example.proiectpaw.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.proiectpaw.security.CustomUserDetails;
import com.example.proiectpaw.service.WorkspaceCategoryService;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final WorkspaceCategoryService categoryService;

    public CategoryController(WorkspaceCategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    public List<String> getCategories(@AuthenticationPrincipal CustomUserDetails userDetails,
                                      @RequestParam("workspaceId") Long workspaceId) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        return categoryService.getCategoriesForWorkspace(userDetails.getUsername(), workspaceId);
    }

    @PostMapping
    public List<String> addCategory(@RequestBody CategoryRequest request,
                                    @RequestParam("workspaceId") Long workspaceId,
                                    @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        try {
            if (request == null) {
                throw new IllegalArgumentException("Category name is required");
            }
            return categoryService.addCategory(userDetails.getUsername(), workspaceId, request.getName());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    @DeleteMapping
    public List<String> deleteCategory(@RequestParam("name") String name,
                                       @RequestParam("workspaceId") Long workspaceId,
                                       @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        try {
            return categoryService.removeCategory(userDetails.getUsername(), workspaceId, name);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    public static class CategoryRequest {
        private String name;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }
}
