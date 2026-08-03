package com.researcher.tool.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final com.researcher.tool.repository.UserRepository userRepository;
    private final com.researcher.tool.service.AdminService adminService;
    private final ObjectMapper objectMapper;

    public JwtAuthenticationFilter(JwtService jwtService,
            com.researcher.tool.repository.UserRepository userRepository,
            @org.springframework.context.annotation.Lazy com.researcher.tool.service.AdminService adminService) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.adminService = adminService;
        this.objectMapper = new ObjectMapper();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String token = null;

        // Try to get token from Authorization header ONLY (Stateless JWT)
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }

        if (token != null) {
            String email = jwtService.extractUsername(token);
            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                if (jwtService.isTokenValid(token, email)) {
                    // Check if this is a regular user
                    java.util.Optional<com.researcher.tool.model.User> userOpt = userRepository.findByEmail(email);

                    if (userOpt.isPresent()) {
                        com.researcher.tool.model.User user = userOpt.get();

                        // CRITICAL: Check user status on EVERY request
                        com.researcher.tool.model.AccountStatus status = user.getStatus();

                        // Check if blocked and still within block period
                        boolean isBlockedActive = (status == com.researcher.tool.model.AccountStatus.BLOCKED ||
                                status == com.researcher.tool.model.AccountStatus.TEMP_BANNED) &&
                                (user.getBlockedUntil() == null || user.getBlockedUntil().isAfter(LocalDateTime.now()));

                        // Determine if user should be denied access
                        if (status == com.researcher.tool.model.AccountStatus.BANNED ||
                                status == com.researcher.tool.model.AccountStatus.PERMANENT_BANNED ||
                                status == com.researcher.tool.model.AccountStatus.DELETED ||
                                isBlockedActive) {

                            // User is blocked/banned - return 403 with account status info
                            SecurityContextHolder.clearContext();
                            sendAccountBlockedResponse(response, status.toString(), user.getBlockedUntil());
                            return; // Stop processing - do not continue filter chain
                        }

                        // Check if block has expired and auto-restore to ACTIVE
                        if ((status == com.researcher.tool.model.AccountStatus.BLOCKED ||
                                status == com.researcher.tool.model.AccountStatus.TEMP_BANNED) &&
                                user.getBlockedUntil() != null &&
                                user.getBlockedUntil().isBefore(LocalDateTime.now())) {
                            // Block expired - restore to ACTIVE
                            user.setStatus(com.researcher.tool.model.AccountStatus.ACTIVE);
                            user.setBlockedUntil(null);
                            userRepository.save(user);
                            System.out.println("[JwtAuthFilter] Auto-restored user " + email + " from expired block");
                        }

                        // User is active/valid - proceed with authentication
                        String role = jwtService.extractClaim(token, claims -> claims.get("role", String.class));
                        java.util.List<org.springframework.security.core.authority.SimpleGrantedAuthority> authorities = Collections
                                .emptyList();

                        if ("ADMIN".equals(role)) {
                            authorities = java.util.Collections.singletonList(
                                    new org.springframework.security.core.authority.SimpleGrantedAuthority(
                                            "ROLE_ADMIN"));
                        }

                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                email, null, authorities);
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    } else {
                        // User not in DB. Check if it's ADMIN.
                        String role = jwtService.extractClaim(token, claims -> claims.get("role", String.class));
                        if ("ADMIN".equals(role)) {
                            // Validate Session from DB
                            if (adminService.validateSession(token)) {
                                // Allow Admin
                                java.util.List<org.springframework.security.core.authority.SimpleGrantedAuthority> authorities = java.util.Collections
                                        .singletonList(
                                                new org.springframework.security.core.authority.SimpleGrantedAuthority(
                                                        "ROLE_ADMIN"));
                                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                        email, null, authorities);
                                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                                SecurityContextHolder.getContext().setAuthentication(authToken);
                            } else {
                                // Session Invalid
                                SecurityContextHolder.clearContext();
                            }
                        }
                    }
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Send a 403 response with account blocked information.
     * This stops the filter chain - the request ends here.
     */
    private void sendAccountBlockedResponse(HttpServletResponse response, String status, LocalDateTime blockedUntil)
            throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        Map<String, Object> errorBody = new HashMap<>();
        errorBody.put("error", "ACCOUNT_BLOCKED");
        errorBody.put("status", status);
        errorBody.put("message", getBlockMessage(status));
        if (blockedUntil != null) {
            errorBody.put("blockedUntil", blockedUntil.toString());
        }

        response.getWriter().write(objectMapper.writeValueAsString(errorBody));
        response.getWriter().flush();
    }

    private String getBlockMessage(String status) {
        return switch (status) {
            case "BLOCKED", "TEMP_BANNED" -> "Your account has been temporarily suspended by an administrator.";
            case "BANNED", "PERMANENT_BANNED" -> "Your account has been permanently disabled.";
            case "DELETED" -> "This account no longer exists.";
            default -> "Your account access has been restricted.";
        };
    }
}
