package com.example.proiectpaw.security;

import java.util.regex.Pattern;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.example.proiectpaw.repository.UserRepository;

import org.springframework.security.crypto.password.PasswordEncoder;

@Component
public class PasswordMigrationRunner implements CommandLineRunner {

    private static final Pattern BCRYPT_PATTERN = Pattern.compile("^\\$2[aby]\\$.*");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public PasswordMigrationRunner(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        userRepository.findAll().stream()
                .filter(user -> !BCRYPT_PATTERN.matcher(user.getPassword()).matches())
                .forEach(user -> {
                    user.setPassword(passwordEncoder.encode(user.getPassword()));
                    userRepository.save(user);
                });
    }
}