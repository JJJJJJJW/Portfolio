package com.ace.techfolio.service;

import com.ace.techfolio.entity.AppUser;
import com.ace.techfolio.repository.UserRepository;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Service class for managing {@link AppUser} profiles and settings.
 * Handles shadow user syncing from Supabase OAuth (Google) JWT tokens.
 */
@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Finds a user by ID.
     */
    @Transactional(readOnly = true)
    public Optional<AppUser> findById(UUID id) {
        return userRepository.findById(id);
    }

    /**
     * Resolves the current user. If they don't exist in our app_users table,
     * they are synchronized automatically from the JWT payload.
     *
     * @param jwt the validated JWT from Supabase Auth
     * @return the synchronized AppUser
     */
    @Transactional
    public AppUser getOrCreateUserFromJwt(Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String email = jwt.getClaimAsString("email");
        
        return userRepository.findById(userId).orElseGet(() -> {
            // Self-healing: Delete any stale user profile with the same email but different ID
            // (e.g. created during previous attempts due to ID generation bugs)
            if (email != null) {
                userRepository.findByEmail(email).ifPresent(staleUser -> {
                    if (!staleUser.getId().equals(userId)) {
                        userRepository.delete(staleUser);
                        userRepository.flush(); // Ensure deletion is committed before insert
                    }
                });
            }

            // Create shadow user profile from JWT details
            AppUser newUser = new AppUser();
            newUser.setId(userId);
            newUser.setEmail(email);
            
            // Extract profile metadata provided by Google OAuth via Supabase
            Map<String, Object> userMetadata = jwt.getClaim("user_metadata");
            if (userMetadata != null) {
                // Read display name
                String name = (String) userMetadata.get("full_name");
                if (name == null) {
                    name = (String) userMetadata.get("name");
                }
                newUser.setDisplayName(name != null ? name : "Google User");
                
                // Read avatar URL
                String avatarUrl = (String) userMetadata.get("avatar_url");
                newUser.setAvatarUrl(avatarUrl);
            } else {
                newUser.setDisplayName("User");
            }
            
            return userRepository.save(newUser);
        });
    }

    /**
     * Updates user profile fields.
     */
    @Transactional
    public AppUser updateUserProfile(UUID userId, String displayName, String avatarUrl, String currency, String riskAppetite) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        
        if (displayName != null && !displayName.trim().isEmpty()) {
            user.setDisplayName(displayName.trim());
        }
        if (avatarUrl != null) {
            user.setAvatarUrl(avatarUrl.trim());
        }
        if (currency != null && currency.length() == 3) {
            user.setCurrency(currency.toUpperCase());
        }
        if (riskAppetite != null && !riskAppetite.trim().isEmpty()) {
            user.setRiskAppetite(riskAppetite.trim());
        }
        
        return userRepository.save(user);
    }
}
