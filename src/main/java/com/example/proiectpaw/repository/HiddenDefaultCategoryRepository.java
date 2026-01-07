package com.example.proiectpaw.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.proiectpaw.model.HiddenDefaultCategory;

public interface HiddenDefaultCategoryRepository extends JpaRepository<HiddenDefaultCategory, Long> {
    List<HiddenDefaultCategory> findByUserUsername(String username);
    boolean existsByUserUsernameAndNameIgnoreCase(String username, String name);
    void deleteByUserUsernameAndNameIgnoreCase(String username, String name);
}
