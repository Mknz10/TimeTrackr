package com.example.proiectpaw.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.proiectpaw.model.WorkspaceMember;

public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, Long> {
    Optional<WorkspaceMember> findByWorkspaceIdAndUserUsername(Long workspaceId, String username);
    List<WorkspaceMember> findByUserUsernameOrderByJoinedAtAsc(String username);
    List<WorkspaceMember> findByWorkspaceId(Long workspaceId);
    boolean existsByWorkspaceIdAndUserUsername(Long workspaceId, String username);
}
