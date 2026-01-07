package com.example.proiectpaw.controller;

import com.example.proiectpaw.service.CategoryService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    public List<String> getCategories(HttpSession session) {
        String username = (String) session.getAttribute("username");
        if (username == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        return categoryService.getCategoriesForUser(username);
    }

    @PostMapping
    public List<String> addCategory(@RequestBody CategoryRequest request, HttpSession session) {
        String username = (String) session.getAttribute("username");
        if (username == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        try {
            return categoryService.addCategory(username, request.getName());
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
