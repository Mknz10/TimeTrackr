package com.example.proiectpaw.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/session")
public class SessionController {

    @GetMapping
    public Map<String, String> getSession(HttpSession session) {
        String username = (String) session.getAttribute("username");
        if (username == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        return Map.of("username", username);
    }
}
