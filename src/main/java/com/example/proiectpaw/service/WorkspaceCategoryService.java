package com.example.proiectpaw.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.proiectpaw.model.Workspace;
import com.example.proiectpaw.model.WorkspaceCategory;
import com.example.proiectpaw.repository.WorkspaceCategoryRepository;

@Service
public class WorkspaceCategoryService {

    private static final List<String> DEFAULT_CATEGORIES = List.of("Muncă", "Studii", "Relaxare");

    private final WorkspaceCategoryRepository categoryRepository;
    private final WorkspaceService workspaceService;

    public WorkspaceCategoryService(WorkspaceCategoryRepository categoryRepository,
                                    WorkspaceService workspaceService) {
        this.categoryRepository = categoryRepository;
        this.workspaceService = workspaceService;
    }

    @Transactional
    public List<String> getCategoriesForWorkspace(String username, Long workspaceId) {
        Workspace workspace = workspaceService.getWorkspaceForUser(username, workspaceId);
        List<WorkspaceCategory> categories = categoryRepository.findByWorkspaceIdOrderByNameAsc(workspace.getId());
        if (categories.isEmpty()) {
            List<WorkspaceCategory> defaults = new ArrayList<>();
            for (String defaultName : DEFAULT_CATEGORIES) {
                defaults.add(new WorkspaceCategory(defaultName, workspace));
            }
            categoryRepository.saveAll(defaults);
            categories = categoryRepository.findByWorkspaceIdOrderByNameAsc(workspace.getId());
        }
        List<String> names = new ArrayList<>(categories.size());
        for (WorkspaceCategory category : categories) {
            names.add(category.getName());
        }
        return names;
    }

    @Transactional
    public List<String> addCategory(String username, Long workspaceId, String categoryName) {
        String sanitizedName = sanitize(categoryName);
        if (sanitizedName.isEmpty()) {
            throw new IllegalArgumentException("Category name is required");
        }

        Workspace workspace = workspaceService.getWorkspaceForUser(username, workspaceId);

        boolean exists = categoryRepository.existsByWorkspaceIdAndNameIgnoreCase(workspace.getId(), sanitizedName);
        if (exists) {
            throw new IllegalArgumentException("Category already exists");
        }

        WorkspaceCategory category = new WorkspaceCategory(sanitizedName, workspace);
        categoryRepository.save(category);

        return getCategoriesForWorkspace(username, workspaceId);
    }

    @Transactional
    public List<String> removeCategory(String username, Long workspaceId, String categoryName) {
        String sanitizedName = sanitize(categoryName);
        if (sanitizedName.isEmpty()) {
            throw new IllegalArgumentException("Category name is required");
        }

        Workspace workspace = workspaceService.getWorkspaceForUser(username, workspaceId);

        boolean exists = categoryRepository.existsByWorkspaceIdAndNameIgnoreCase(workspace.getId(), sanitizedName);
        if (!exists) {
            throw new IllegalArgumentException("Category not found");
        }

        int deletedCount = categoryRepository.deleteByWorkspaceIdAndNameIgnoreCase(workspace.getId(), sanitizedName);
        if (deletedCount == 0) {
            throw new IllegalArgumentException("Category removal failed");
        }
        return getCategoriesForWorkspace(username, workspaceId);
    }

    private String sanitize(String rawName) {
        if (rawName == null) {
            return "";
        }
        return rawName.trim();
    }
}
