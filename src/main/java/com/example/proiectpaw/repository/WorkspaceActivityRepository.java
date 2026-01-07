package com.example.proiectpaw.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.proiectpaw.model.WorkspaceActivity;

@Repository
public interface WorkspaceActivityRepository extends JpaRepository<WorkspaceActivity, Long> {
    List<WorkspaceActivity> findByWorkspaceIdOrderByStartTimeAsc(Long workspaceId);
    List<WorkspaceActivity> findByWorkspaceIdAndUserUsername(Long workspaceId, String username);
    List<WorkspaceActivity> findByUserUsernameOrderByStartTimeAsc(String username);
}
