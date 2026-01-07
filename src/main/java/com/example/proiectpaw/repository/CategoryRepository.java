package com.example.proiectpaw.repository;

import com.example.proiectpaw.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByUserUsernameOrderByNameAsc(String username);
    boolean existsByUserUsernameAndNameIgnoreCase(String username, String name);
}
