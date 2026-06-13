package com.ace.techfolio.controller;

import com.ace.techfolio.entity.AppUser;
import com.ace.techfolio.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/**
 * Controller for managing user profile endpoints.
 */
@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Get details of the currently authenticated user.
     * Auto-syncs/registers the user from the Supabase JWT.
     */
    @GetMapping("/me")
    public ResponseEntity<AppUser> getCurrentUser(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) {
            return ResponseEntity.badRequest().build();
        }
        AppUser user = userService.getOrCreateUserFromJwt(jwt);
        return ResponseEntity.ok(user);
    }

    /**
     * Update current user's profile and settings.
     */
    @PutMapping("/me")
    public ResponseEntity<AppUser> updateCurrentUser(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody Map<String, String> updates) {
        if (jwt == null) {
            return ResponseEntity.badRequest().build();
        }
        
        UUID userId = UUID.fromString(jwt.getSubject());
        String displayName = updates.get("displayName");
        String avatarUrl = updates.get("avatarUrl");
        String currency = updates.get("currency");
        String riskAppetite = updates.get("riskAppetite");
        
        AppUser updated = userService.updateUserProfile(userId, displayName, avatarUrl, currency, riskAppetite);
        return ResponseEntity.ok(updated);
    }
}
