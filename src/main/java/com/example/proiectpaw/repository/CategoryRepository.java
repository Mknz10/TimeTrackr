package com.example.proiectpaw.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import com.example.proiectpaw.model.Category;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByUserUsernameOrderByNameAsc(String username);
    boolean existsByUserUsernameAndNameIgnoreCase(String username, String name);
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    int deleteByUserUsernameAndNameIgnoreCase(String username, String name);
}
