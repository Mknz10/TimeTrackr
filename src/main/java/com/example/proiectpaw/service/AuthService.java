package com.example.proiectpaw.service;

import java.util.Optional;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.proiectpaw.model.User;
import com.example.proiectpaw.repository.UserRepository;
import com.example.proiectpaw.security.CustomUserDetails;
import com.example.proiectpaw.security.CustomUserDetailsService;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CustomUserDetailsService userDetailsService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       CustomUserDetailsService userDetailsService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.userDetailsService = userDetailsService;
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public User register(String name, String username, String password) {
        if (userRepository.findByUsername(username).isPresent()) {
            throw new IllegalArgumentException("Username already exists");
        }
        User user = new User(name, username, passwordEncoder.encode(password));
        return userRepository.save(user);
    }

    public User updateAccountDetails(String currentUsername, String desiredDisplayName, String desiredUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        boolean shouldRefreshAuth = false;

        String trimmedDisplayName = desiredDisplayName == null ? null : desiredDisplayName.trim();
        if (trimmedDisplayName != null && trimmedDisplayName.isEmpty()) {
            throw new IllegalArgumentException("Display name cannot be blank");
        }

        if (trimmedDisplayName != null && !trimmedDisplayName.isEmpty() && !trimmedDisplayName.equals(user.getName())) {
            user.setName(trimmedDisplayName);
            shouldRefreshAuth = true;
        }

        String trimmedUsername = desiredUsername == null ? null : desiredUsername.trim();
        if (trimmedUsername != null && trimmedUsername.isEmpty()) {
            throw new IllegalArgumentException("Username cannot be blank");
        }
        if (trimmedUsername != null && !trimmedUsername.isEmpty() && !trimmedUsername.equals(user.getUsername())) {
            userRepository.findByUsername(trimmedUsername).ifPresent(existing -> {
                throw new IllegalArgumentException("Username already exists");
            });
            user.setUsername(trimmedUsername);
            shouldRefreshAuth = true;
        }

        User updatedUser = userRepository.save(user);
        if (shouldRefreshAuth) {
            refreshAuthentication(updatedUser);
        }
        return updatedUser;
    }

    public void updatePassword(String username, String currentPassword, String newPassword) {
        if (newPassword == null) {
            throw new IllegalArgumentException("New password must be at least 6 characters long");
        }

        String sanitizedPassword = newPassword.trim();
        if (sanitizedPassword.length() < 6) {
            throw new IllegalArgumentException("New password must be at least 6 characters long");
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(sanitizedPassword));
        User updatedUser = userRepository.save(user);
        refreshAuthentication(updatedUser);
    }

    private void refreshAuthentication(User user) {
        CustomUserDetails userDetails = (CustomUserDetails) userDetailsService.loadUserByUsername(user.getUsername());
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(userDetails, userDetails.getPassword(), userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
