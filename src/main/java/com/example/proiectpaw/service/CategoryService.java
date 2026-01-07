package com.example.proiectpaw.service;

import com.example.proiectpaw.model.Category;
import com.example.proiectpaw.model.User;
import com.example.proiectpaw.repository.CategoryRepository;
import com.example.proiectpaw.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class CategoryService {

    private static final List<String> DEFAULT_CATEGORIES = List.of("Muncă", "Studii", "Relaxare", "Altele");

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    public CategoryService(CategoryRepository categoryRepository, UserRepository userRepository) {
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
    }

    public List<String> getCategoriesForUser(String username) {
        Set<String> categories = new LinkedHashSet<>(DEFAULT_CATEGORIES);
        categoryRepository.findByUserUsernameOrderByNameAsc(username)
                .stream()
                .map(Category::getName)
                .forEach(categories::add);
        return new ArrayList<>(categories);
    }

    public List<String> addCategory(String username, String categoryName) {
        String sanitizedName = sanitize(categoryName);
        if (sanitizedName.isEmpty()) {
            throw new IllegalArgumentException("Category name is required");
        }

        // Prevent duplicates across defaults and existing custom categories
        boolean isDefault = DEFAULT_CATEGORIES.stream()
                .anyMatch(defaultCategory -> defaultCategory.equalsIgnoreCase(sanitizedName));
        boolean exists = categoryRepository.existsByUserUsernameAndNameIgnoreCase(username, sanitizedName);
        if (isDefault || exists) {
            throw new IllegalArgumentException("Category already exists");
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Category category = new Category(sanitizedName, user);
        categoryRepository.save(category);

        return getCategoriesForUser(username);
    }

    private String sanitize(String rawName) {
        if (rawName == null) {
            return "";
        }
        return rawName.trim();
    }
}
