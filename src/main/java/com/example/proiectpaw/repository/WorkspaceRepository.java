package com.example.proiectpaw.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.proiectpaw.model.Workspace;

public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {
    List<Workspace> findByMembersUserUsernameOrderByNameAsc(String username);
}
