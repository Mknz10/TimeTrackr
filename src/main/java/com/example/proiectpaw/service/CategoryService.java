package com.example.proiectpaw.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.proiectpaw.model.Category;
import com.example.proiectpaw.model.User;
import com.example.proiectpaw.repository.CategoryRepository;
import com.example.proiectpaw.repository.UserRepository;

@Service
public class CategoryService {

    private static final List<String> DEFAULT_CATEGORIES = List.of("Muncă", "Studii", "Relaxare");

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    public CategoryService(CategoryRepository categoryRepository, UserRepository userRepository) {
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public List<String> getPersonalCategories(String username) {
        List<Category> categories = categoryRepository.findByUserUsernameOrderByNameAsc(username);
        if (categories.isEmpty()) {
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            List<Category> defaults = new ArrayList<>();
            for (String defaultName : DEFAULT_CATEGORIES) {
                defaults.add(new Category(defaultName, user));
            }
            categoryRepository.saveAll(defaults);
            categories = categoryRepository.findByUserUsernameOrderByNameAsc(username);
        }
        List<String> names = new ArrayList<>(categories.size());
        for (Category category : categories) {
            names.add(category.getName());
        }
        return names;
    }

    @Transactional
    public List<String> addPersonalCategory(String username, String categoryName) {
        String sanitizedName = sanitize(categoryName);
        if (sanitizedName.isEmpty()) {
            throw new IllegalArgumentException("Category name is required");
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        boolean exists = categoryRepository.existsByUserUsernameAndNameIgnoreCase(username, sanitizedName);
        if (exists) {
            throw new IllegalArgumentException("Category already exists");
        }

        Category category = new Category(sanitizedName, user);
        categoryRepository.save(category);

        return getPersonalCategories(username);
    }

    @Transactional
    public List<String> removePersonalCategory(String username, String categoryName) {
        String sanitizedName = sanitize(categoryName);
        if (sanitizedName.isEmpty()) {
            throw new IllegalArgumentException("Category name is required");
        }

        boolean exists = categoryRepository.existsByUserUsernameAndNameIgnoreCase(username, sanitizedName);
        if (!exists) {
            throw new IllegalArgumentException("Category not found");
        }

        int deletedCount = categoryRepository.deleteByUserUsernameAndNameIgnoreCase(username, sanitizedName);
        if (deletedCount == 0) {
            throw new IllegalArgumentException("Category removal failed");
        }
        return getPersonalCategories(username);
    }

    private String sanitize(String rawName) {
        if (rawName == null) {
            return "";
        }
        return rawName.trim();
    }
}
