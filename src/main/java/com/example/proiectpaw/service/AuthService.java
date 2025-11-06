package com.example.proiectpaw.service;

import com.example.proiectpaw.model.User;
import com.example.proiectpaw.repository.UserRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class AuthService {

    private final UserRepository userRepository;

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public boolean login(String username, String password) {
        System.out.println("Trying login: " + username + " / " + password);
        return userRepository.findByUsername(username)
                .map(user -> {
                    System.out.println("DB password: " + user.getPassword());
                    return user.getPassword().equals(password);
                })
                .orElse(false);
    }


    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
}
