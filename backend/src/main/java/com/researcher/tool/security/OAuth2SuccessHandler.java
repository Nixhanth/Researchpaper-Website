package com.researcher.tool.security;

import com.researcher.tool.model.User;
import com.researcher.tool.model.OnboardingSession;
import com.researcher.tool.repository.UserRepository;
import com.researcher.tool.repository.OnboardingSessionRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Optional;

@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final OnboardingSessionRepository sessionRepository;

    public OAuth2SuccessHandler(JwtService jwtService, UserRepository userRepository,
            OnboardingSessionRepository sessionRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");

        // Check if user exists in database (completed onboarding)
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isPresent() && Boolean.TRUE.equals(userOpt.get().getProfileCompleted())) {
            User user = userOpt.get();
            // Status Check
            if (user.getStatus() == com.researcher.tool.model.AccountStatus.BANNED) {
                getRedirectStrategy().sendRedirect(request, response,
                        "http://localhost:5173/login?error=" + java.net.URLEncoder
                                .encode("Your account has been permanently banned.", "UTF-8"));
                return;
            }
            if (user.getStatus() == com.researcher.tool.model.AccountStatus.DELETED) {
                getRedirectStrategy().sendRedirect(request, response,
                        "http://localhost:5173/login?error="
                                + java.net.URLEncoder.encode("Invalid account.", "UTF-8"));
                return;
            }
            if (user.getStatus() == com.researcher.tool.model.AccountStatus.BLOCKED) {
                if (user.getBlockedUntil() != null && user.getBlockedUntil().isAfter(java.time.LocalDateTime.now())) {
                    getRedirectStrategy().sendRedirect(request, response,
                            "http://localhost:5173/login?error=" + java.net.URLEncoder
                                    .encode("Your account is temporarily blocked until " + user.getBlockedUntil(),
                                            "UTF-8"));
                    return;
                } else {
                    // Auto unblock
                    user.setStatus(com.researcher.tool.model.AccountStatus.ACTIVE);
                    user.setBlockedUntil(null);
                    userRepository.save(user);
                }
            }

            // User exists and completed onboarding - generate real JWT
            String token = jwtService.generateToken(email);

            getRedirectStrategy().sendRedirect(request, response,
                    "http://localhost:5173/oauth/callback?token=" + token);
        } else {
            // User doesn't exist or hasn't completed onboarding
            // Find their onboarding session and redirect with session token
            Optional<OnboardingSession> sessionOpt = sessionRepository.findByEmail(email);

            if (sessionOpt.isPresent()) {
                OnboardingSession session = sessionOpt.get();
                // Redirect with session token for onboarding
                getRedirectStrategy().sendRedirect(request, response,
                        "http://localhost:5173/oauth/callback?session_token=" + session.getSessionToken() + "&email="
                                + email);
            } else {
                // Should not happen, but handle gracefully
                getRedirectStrategy().sendRedirect(request, response,
                        "http://localhost:5173/login?error=session_not_found");
            }
        }
    }
}
