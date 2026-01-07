package com.example.proiectpaw.controller;

import java.security.Principal;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.example.proiectpaw.model.User;
import com.example.proiectpaw.service.AuthService;

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

    @GetMapping("/home")
    public String homePage(Model model, Principal principal) {
        if (principal == null) {
            return "redirect:/login";
        }
        authService.findByUsername(principal.getName())
                .ifPresentOrElse(user -> model.addAttribute("displayName", user.getName()),
                        () -> model.addAttribute("displayName", principal.getName()));
        model.addAttribute("message", "Welcome to your account details page!");
        return "home";
    }

    @GetMapping("/workspace")
    public String workspacePage(Model model, Principal principal) {
        if (principal == null) {
            return "redirect:/login";
        }
        authService.findByUsername(principal.getName())
                .ifPresentOrElse(user -> model.addAttribute("displayName", user.getName()),
                        () -> model.addAttribute("displayName", principal.getName()));
        return "workspace";
    }

    @GetMapping("/register")
    public String registerForm() {
        return "register";
    }

    @PostMapping("/register")
    public String register(@RequestParam String name,
                           @RequestParam String username,
                           @RequestParam String password,
                           Model model) {
        try {
            authService.register(name, username, password);
            return "redirect:/login?registered";
        } catch (IllegalArgumentException ex) {
            model.addAttribute("error", ex.getMessage());
            return "register";
        }
    }

    @GetMapping("/profile")
    public String profile(Model model, Principal principal) {
        if (principal == null) {
            return "redirect:/login";
        }

        User user = authService.findByUsername(principal.getName())
                .orElse(null);

        if (user == null) {
            return "redirect:/login";
        }

        model.addAttribute("displayName", user.getName());
        if (!model.containsAttribute("currentUsername")) {
            model.addAttribute("currentUsername", user.getUsername());
        }
        if (!model.containsAttribute("currentName")) {
            model.addAttribute("currentName", user.getName());
        }
        return "profile";
    }

    @PostMapping("/profile/update-account")
    public String updateAccount(@RequestParam(required = false) String name,
                                @RequestParam(required = false) String username,
                                Principal principal,
                                RedirectAttributes redirectAttributes) {
        if (principal == null) {
            return "redirect:/login";
        }

        try {
            User updated = authService.updateAccountDetails(principal.getName(), name, username);
            redirectAttributes.addFlashAttribute("accountSuccess", "Account details updated.");
            redirectAttributes.addFlashAttribute("currentUsername", updated.getUsername());
            redirectAttributes.addFlashAttribute("currentName", updated.getName());
        } catch (IllegalArgumentException ex) {
            redirectAttributes.addFlashAttribute("accountError", ex.getMessage());
            if (name != null) {
                redirectAttributes.addFlashAttribute("currentName", name);
            }
            if (username != null) {
                redirectAttributes.addFlashAttribute("currentUsername", username);
            }
        }

        return "redirect:/profile";
    }

    @PostMapping("/profile/update-password")
    public String updatePassword(@RequestParam String currentPassword,
                                 @RequestParam String newPassword,
                                 @RequestParam String confirmPassword,
                                 Principal principal,
                                 RedirectAttributes redirectAttributes) {
        if (principal == null) {
            return "redirect:/login";
        }

        if (!newPassword.equals(confirmPassword)) {
            redirectAttributes.addFlashAttribute("passwordError", "New password confirmation does not match.");
            return "redirect:/profile";
        }

        try {
            authService.updatePassword(principal.getName(), currentPassword, newPassword);
            redirectAttributes.addFlashAttribute("passwordSuccess", "Password updated successfully.");
        } catch (IllegalArgumentException ex) {
            redirectAttributes.addFlashAttribute("passwordError", ex.getMessage());
        }

        return "redirect:/profile";
    }
}
