package com.ace.techfolio.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.text.ParseException;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    @Value("${techfolio.supabase.url}")
    private String supabaseUrl;

    @Value("${techfolio.supabase.anon-key}")
    private String supabaseAnonKey;

    @Value("${FRONTEND_URL:}")
    private String frontendUrl;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 1. Enable CORS and disable CSRF (safe since we use JWTs, not session cookies)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())

                // 2. Enforce strict statelessness for the 512MB memory limit
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 3. Configure OAuth2 Resource Server for JWT authentication
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(Customizer.withDefaults()))

                // 4. Secure api endpoints (except health and auth endpoints)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/health").permitAll()
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers("/api/v1/users/me").authenticated()
                        .anyRequest().authenticated());

        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        // Supabase issues ES256 (ECDSA) JWTs signed with an asymmetric key pair.
        // The JWKS endpoint requires the 'apikey' header, so we fetch it manually
        // at startup and construct the decoder from the parsed key set.
        String jwksUri = supabaseUrl.replaceAll("/+$", "") + "/auth/v1/.well-known/jwks.json";
        log.info("Fetching JWKS from: {}", jwksUri);

        try {
            // Fetch JWKS with the required apikey header
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.set("apikey", supabaseAnonKey);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    jwksUri, HttpMethod.GET, entity, String.class);

            log.info("JWKS response status: {}", response.getStatusCode());
            log.debug("JWKS body: {}", response.getBody());

            // Parse the JWK set from the response
            JWKSet jwkSet = JWKSet.parse(response.getBody());
            log.info("Parsed {} key(s) from JWKS", jwkSet.getKeys().size());

            // Build a JWT processor that uses the fetched keys for ES256 verification
            ImmutableJWKSet<SecurityContext> jwkSource = new ImmutableJWKSet<>(jwkSet);
            DefaultJWTProcessor<SecurityContext> jwtProcessor = new DefaultJWTProcessor<>();
            jwtProcessor.setJWSKeySelector(
                    new JWSVerificationKeySelector<>(JWSAlgorithm.ES256, jwkSource));

            return new NimbusJwtDecoder(jwtProcessor);

        } catch (ParseException e) {
            throw new RuntimeException("[Techfolio Security] Failed to parse JWKS response", e);
        } catch (Exception e) {
            log.error("FATAL: Could not fetch JWKS from {}", jwksUri, e);
            throw new RuntimeException("Failed to initialize JWT decoder from Supabase JWKS", e);
        }
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Allow local dev + production frontend origins
        java.util.List<String> origins = new java.util.ArrayList<>(List.of(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000"));
        if (frontendUrl != null && !frontendUrl.isBlank()) {
            origins.add(frontendUrl);
        }
        configuration.setAllowedOrigins(origins);

        // Allow standard REST methods
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));

        // Allow standard headers (important for Authorization: Bearer <token>)
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // Apply this CORS configuration to all API endpoints
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}



