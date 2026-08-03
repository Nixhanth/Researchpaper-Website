package com.researcher.tool.service;

import com.researcher.tool.model.User;
import com.researcher.tool.model.AuthProvider;
import com.researcher.tool.model.OnboardingSession;
import com.researcher.tool.repository.UserRepository;
import com.researcher.tool.repository.OnboardingSessionRepository;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;
    private final OnboardingSessionRepository sessionRepository;

    public CustomOAuth2UserService(UserRepository userRepository,
            OnboardingSessionRepository sessionRepository) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
    }

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        String provider = userRequest.getClientRegistration().getRegistrationId();

        return processOAuth2User(oAuth2User, provider);
    }

    private OAuth2User processOAuth2User(OAuth2User oAuth2User, String providerName) {
        String email = oAuth2User.getAttribute("email");
        String providerId = oAuth2User.getAttribute("sub"); // Google
        if (providerId == null) {
            providerId = oAuth2User.getAttribute("orcid"); // ORCID
        }

        AuthProvider authProvider = AuthProvider.valueOf(providerName.toUpperCase());
        String name = oAuth2User.getAttribute("name");
        if (name == null) {
            String givenName = oAuth2User.getAttribute("given_name");
            String familyName = oAuth2User.getAttribute("family_name");
            if (givenName != null && familyName != null) {
                name = givenName + " " + familyName;
            } else if (givenName != null) {
                name = givenName;
            }
        }

        String picture = oAuth2User.getAttribute("picture");
        if (picture == null) {
            picture = oAuth2User.getAttribute("avatar_url"); // some providers use this
        }

        // Log for debugging
        System.out.println("Processing OAuth2 User: " + email + ", Name: " + name + ", Picture: " + picture);

        // 1. Check if user already exists (completed onboarding before)
        Optional<User> existingUser = userRepository.findByAuthProviderAndProviderId(authProvider, providerId);
        if (existingUser.isEmpty() && email != null) {
            existingUser = userRepository.findByEmail(email);
        }

        if (existingUser.isPresent()) {
            // User exists - they've completed onboarding before
            // Just update their OAuth info and return
            User user = existingUser.get();
            user.setAuthProvider(authProvider);
            user.setProviderId(providerId);
            userRepository.save(user);
            return oAuth2User;
        }

        // 2. User doesn't exist - create temporary onboarding session
        // DO NOT create User record yet!
        Optional<OnboardingSession> existingSession = sessionRepository.findByAuthProviderAndProviderId(authProvider,
                providerId);

        if (existingSession.isEmpty() && email != null) {
            existingSession = sessionRepository.findByEmail(email);
        }

        OnboardingSession session;
        if (existingSession.isPresent()) {
            session = existingSession.get();
            // Update session data
            session.setFullName(name);
            session.setAvatarUrl(picture);
            session.setAuthProvider(authProvider);
            session.setProviderId(providerId);
        } else {
            // Create new session
            session = new OnboardingSession(
                    email != null ? email : providerId + "@orcid.org",
                    authProvider,
                    providerId,
                    name,
                    picture);
        }

        sessionRepository.save(session);

        // Return OAuth2User for Spring Security context
        // The session token will be used in OAuth2SuccessHandler
        return oAuth2User;
    }
}
