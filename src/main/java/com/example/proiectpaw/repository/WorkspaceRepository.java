package com.example.proiectpaw.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.proiectpaw.model.User;
import com.example.proiectpaw.model.Workspace;

public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {
    List<Workspace> findByOwner(User owner);
    Optional<Workspace> findFirstByMembersUserUsernameOrderByCreatedAtAsc(String username);
    List<Workspace> findByMembersUserUsernameOrderByNameAsc(String username);
}
