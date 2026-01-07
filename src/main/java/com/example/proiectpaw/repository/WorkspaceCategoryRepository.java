package com.example.proiectpaw.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import com.example.proiectpaw.model.WorkspaceCategory;

public interface WorkspaceCategoryRepository extends JpaRepository<WorkspaceCategory, Long> {
    List<WorkspaceCategory> findByWorkspaceIdOrderByNameAsc(Long workspaceId);
    boolean existsByWorkspaceIdAndNameIgnoreCase(Long workspaceId, String name);
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    int deleteByWorkspaceIdAndNameIgnoreCase(Long workspaceId, String name);
}
