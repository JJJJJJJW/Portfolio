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
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
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

                // 4. Secure api endpoints (except health, auth, and public market data endpoints)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/health").permitAll()
                        .requestMatchers("/api/v1/ping").permitAll()
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers("/api/v1/assets/price").permitAll()
                        .requestMatchers("/api/v1/market/**").permitAll()
                        .requestMatchers("/api/v1/cron/**").permitAll()
                        .requestMatchers("/api/v1/internal/**").permitAll()
                        .requestMatchers("/api/v1/users/me").authenticated()
                        .anyRequest().authenticated());

        return http.build();
    }

    /**
     * Lazy-initializing JWT decoder that defers the Supabase JWKS fetch
     * to the first authenticated request instead of blocking at startup.
     *
     * <p>This prevents cold-start crashes on Render free tier when the
     * JWKS endpoint is temporarily unreachable during container spin-up.
     * Public endpoints (/ping, /health, /cron/**) never trigger this
     * because they are marked {@code permitAll()}.</p>
     *
     * <p>Thread-safe via volatile + double-checked locking. Includes
     * retry logic (3 attempts with 2s backoff) for network resilience.</p>
     */
    @Bean
    public JwtDecoder jwtDecoder() {
        return new LazyJwtDecoder(supabaseUrl, supabaseAnonKey);
    }

    /**
     * JwtDecoder wrapper that lazily fetches JWKS on first decode() call.
     * This allows Spring context to initialize successfully even if
     * Supabase is unreachable during cold start.
     */
    private static class LazyJwtDecoder implements JwtDecoder {

        private static final Logger log = LoggerFactory.getLogger(LazyJwtDecoder.class);
        private static final int MAX_RETRIES = 3;
        private static final long RETRY_DELAY_MS = 2000;

        private final String supabaseUrl;
        private final String supabaseAnonKey;

        // Volatile for safe double-checked locking
        private volatile NimbusJwtDecoder delegate;

        LazyJwtDecoder(String supabaseUrl, String supabaseAnonKey) {
            this.supabaseUrl = supabaseUrl;
            this.supabaseAnonKey = supabaseAnonKey;
        }

        @Override
        public Jwt decode(String token) throws JwtException {
            if (delegate == null) {
                synchronized (this) {
                    if (delegate == null) {
                        delegate = initializeDecoder();
                    }
                }
            }
            return delegate.decode(token);
        }

        private NimbusJwtDecoder initializeDecoder() {
            String jwksUri = supabaseUrl.replaceAll("/+$", "") + "/auth/v1/.well-known/jwks.json";
            log.info("Lazily initializing JWT decoder — fetching JWKS from {}", jwksUri);

            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.set("apikey", supabaseAnonKey);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            Exception lastException = null;

            for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    ResponseEntity<String> response = restTemplate.exchange(
                            jwksUri, HttpMethod.GET, entity, String.class);

                    JWKSet jwkSet = JWKSet.parse(response.getBody());

                    ImmutableJWKSet<SecurityContext> jwkSource = new ImmutableJWKSet<>(jwkSet);
                    DefaultJWTProcessor<SecurityContext> jwtProcessor = new DefaultJWTProcessor<>();
                    jwtProcessor.setJWSKeySelector(
                            new JWSVerificationKeySelector<>(JWSAlgorithm.ES256, jwkSource));

                    log.info("JWT decoder initialized successfully on attempt {}", attempt);
                    return new NimbusJwtDecoder(jwtProcessor);

                } catch (ParseException e) {
                    lastException = e;
                    log.error("Failed to parse JWKS response on attempt {}/{}", attempt, MAX_RETRIES, e);
                } catch (Exception e) {
                    lastException = e;
                    log.warn("JWKS fetch attempt {}/{} failed: {}", attempt, MAX_RETRIES, e.getMessage());
                }

                if (attempt < MAX_RETRIES) {
                    try {
                        Thread.sleep(RETRY_DELAY_MS);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new JwtException("Interrupted while retrying JWKS fetch", ie);
                    }
                }
            }

            throw new JwtException(
                    "Failed to fetch JWKS from " + jwksUri + " after " + MAX_RETRIES + " attempts",
                    lastException);
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
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "X-Cron-Secret"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // Apply this CORS configuration to all API endpoints
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}




