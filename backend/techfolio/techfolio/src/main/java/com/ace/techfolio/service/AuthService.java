package com.ace.techfolio.service;

import com.ace.techfolio.dto.LoginRequest;
import com.ace.techfolio.dto.RegisterRequest;
import com.ace.techfolio.entity.AppUser;
import com.ace.techfolio.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final RestTemplate restTemplate;

    @Value("${techfolio.supabase.url}")
    private String supabaseUrl;

    @Value("${techfolio.supabase.anon-key}")
    private String supabaseAnonKey;

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Registers a new user with Supabase Auth and creates a shadow AppUser profile.
     */
    @Transactional
    public void register(RegisterRequest request) {
        String url = supabaseUrl.replaceAll("/+$", "") + "/auth/v1/signup";
        log.info("Sending signup request to Supabase for email: {}", request.email());

        // Prepare request headers
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("apikey", supabaseAnonKey);

        // Prepare request body
        Map<String, Object> options = new HashMap<>();
        Map<String, Object> userMetadata = new HashMap<>();
        userMetadata.put("full_name", request.firstName() + " " + request.lastName());
        options.put("data", userMetadata);

        Map<String, Object> body = new HashMap<>();
        body.put("email", request.email());
        body.put("password", request.password());
        body.put("options", options);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();

            if (responseBody == null) {
                throw new RuntimeException("Empty response received from Supabase Auth during registration");
            }

            // Extract User ID from response
            String userIdStr = null;
            if (responseBody.containsKey("id")) {
                userIdStr = (String) responseBody.get("id");
            } else if (responseBody.containsKey("user")) {
                Map<String, Object> userMap = (Map<String, Object>) responseBody.get("user");
                if (userMap != null) {
                    userIdStr = (String) userMap.get("id");
                }
            }

            if (userIdStr == null) {
                throw new RuntimeException("Could not resolve user ID from Supabase Auth response");
            }

            // Save shadow user profile
            UUID userId = UUID.fromString(userIdStr);
            if (!userRepository.existsById(userId)) {
                AppUser shadowUser = new AppUser();
                shadowUser.setId(userId);
                shadowUser.setEmail(request.email());
                shadowUser.setDisplayName(request.firstName() + " " + request.lastName());
                shadowUser.setCurrency(request.currency().toUpperCase());
                shadowUser.setRiskAppetite(request.riskAppetite());

                userRepository.save(shadowUser);
                log.info("Successfully created shadow user profile for email: {} with ID: {}", request.email(), userId);
            }
        } catch (HttpClientErrorException e) {
            log.error("Supabase registration HTTP error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new IllegalArgumentException("Registration failed: " + e.getResponseBodyAsString());
        } catch (Exception e) {
            log.error("Failed to register user in Supabase", e);
            throw new RuntimeException("Registration failed: " + e.getMessage());
        }
    }

    /**
     * Authenticates user with Supabase Auth using email/password.
     * Returns the token response payload.
     */
    public Map<String, Object> login(LoginRequest request) {
        String url = supabaseUrl.replaceAll("/+$", "") + "/auth/v1/token?grant_type=password";
        log.info("Sending login request to Supabase for email: {}", request.email());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("apikey", supabaseAnonKey);

        Map<String, Object> body = new HashMap<>();
        body.put("email", request.email());
        body.put("password", request.password());

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            return (Map<String, Object>) response.getBody();
        } catch (HttpClientErrorException e) {
            log.error("Supabase login HTTP error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new IllegalArgumentException("Login failed: " + e.getResponseBodyAsString());
        } catch (Exception e) {
            log.error("Failed to log in user in Supabase", e);
            throw new RuntimeException("Login failed: " + e.getMessage());
        }
    }
}
