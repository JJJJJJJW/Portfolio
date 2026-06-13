package com.ace.techfolio.controller;

import com.ace.techfolio.dto.LoginRequest;
import com.ace.techfolio.dto.RegisterRequest;
import com.ace.techfolio.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Controller for public authentication endpoints.
 * Bridges email/password auth requests to Supabase GoTrue.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Registers a new user.
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok(Map.of("success", true, "message", "Registration successful"));
    }

    /**
     * Authenticates a user and returns Supabase JWT.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        Map<String, Object> tokenResponse = authService.login(request);
        return ResponseEntity.ok(tokenResponse);
    }
}
