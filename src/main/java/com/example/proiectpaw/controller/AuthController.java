package com.example.proiectpaw.controller;

import com.example.proiectpaw.model.User;
import com.example.proiectpaw.service.AuthService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@Controller
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/login")
    public String loginForm() {
        return "login";
    }

    @GetMapping("/index")
    public String mainPage() {
        return "index";
    }

    @PostMapping("/login")
    public String login(@RequestParam String username,
                        @RequestParam String password,
                        Model model) {
        if (authService.login(username, password)) {
            List<User> users = authService.getAllUsers();
            model.addAttribute("users", users);
            model.addAttribute("username", username);
            return "redirect:/home";
        } else {
            model.addAttribute("error", "Invalid credentials");
            return "login";
        }
    }

    @GetMapping("/home")
    public String homePage(Model model) {
        model.addAttribute("message", "Welcome to your account details page!");
        return "home";
    }
}
