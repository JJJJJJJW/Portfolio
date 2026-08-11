package com.ace.techfolio.service;

import com.ace.techfolio.entity.AppUser;
import com.ace.techfolio.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private Jwt jwt;

    @InjectMocks
    private UserService userService;

    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
    }

    @Test
    void getOrCreateUserFromJwt_ExistingUser_ReturnsUser() {
        AppUser existingUser = new AppUser();
        existingUser.setId(userId);
        existingUser.setEmail("existing@example.com");

        when(jwt.getSubject()).thenReturn(userId.toString());
        when(jwt.getClaimAsString("email")).thenReturn("existing@example.com");
        when(userRepository.findById(userId)).thenReturn(Optional.of(existingUser));

        AppUser result = userService.getOrCreateUserFromJwt(jwt);

        assertNotNull(result);
        assertEquals(userId, result.getId());
        assertEquals("existing@example.com", result.getEmail());
        verify(userRepository, never()).save(any(AppUser.class));
    }

    @Test
    void getOrCreateUserFromJwt_NewUser_CreatesShadowUser() {
        when(jwt.getSubject()).thenReturn(userId.toString());
        when(jwt.getClaimAsString("email")).thenReturn("newuser@example.com");
        when(jwt.getClaim("user_metadata")).thenReturn(Map.of(
                "full_name", "Test User",
                "avatar_url", "https://example.com/avatar.png"
        ));

        when(userRepository.findById(userId)).thenReturn(Optional.empty());
        when(userRepository.findByEmail("newuser@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(AppUser.class))).thenAnswer(i -> i.getArgument(0));

        AppUser result = userService.getOrCreateUserFromJwt(jwt);

        assertNotNull(result);
        assertEquals(userId, result.getId());
        assertEquals("newuser@example.com", result.getEmail());
        assertEquals("Test User", result.getDisplayName());
        assertEquals("https://example.com/avatar.png", result.getAvatarUrl());

        verify(userRepository, times(1)).save(any(AppUser.class));
    }

    @Test
    void getOrCreateUserFromJwt_StaleEmailUser_DeletesStaleUserAndSavesNew() {
        UUID staleUserId = UUID.randomUUID();
        AppUser staleUser = new AppUser();
        staleUser.setId(staleUserId);
        staleUser.setEmail("stale@example.com");

        when(jwt.getSubject()).thenReturn(userId.toString());
        when(jwt.getClaimAsString("email")).thenReturn("stale@example.com");

        when(userRepository.findById(userId)).thenReturn(Optional.empty());
        when(userRepository.findByEmail("stale@example.com")).thenReturn(Optional.of(staleUser));
        when(userRepository.save(any(AppUser.class))).thenAnswer(i -> i.getArgument(0));

        AppUser result = userService.getOrCreateUserFromJwt(jwt);

        assertNotNull(result);
        verify(userRepository, times(1)).delete(staleUser);
        verify(userRepository, times(1)).flush();
        verify(userRepository, times(1)).save(any(AppUser.class));
    }

    @Test
    void updateUserProfile_Success() {
        AppUser user = new AppUser();
        user.setId(userId);
        user.setDisplayName("Old Name");
        user.setCurrency("USD");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(AppUser.class))).thenAnswer(i -> i.getArgument(0));

        AppUser updated = userService.updateUserProfile(userId, "New Name", "https://avatar.com", "MYR", "BALANCED");

        assertNotNull(updated);
        assertEquals("New Name", updated.getDisplayName());
        assertEquals("https://avatar.com", updated.getAvatarUrl());
        assertEquals("MYR", updated.getCurrency());
        assertEquals("BALANCED", updated.getRiskAppetite());
    }

    @Test
    void updateUserProfile_UserNotFound_ThrowsException() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () ->
                userService.updateUserProfile(userId, "Name", null, null, null));
    }
}
