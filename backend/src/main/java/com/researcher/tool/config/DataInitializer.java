package com.researcher.tool.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

        private final com.researcher.tool.repository.UserRepository userRepository;
        private final com.researcher.tool.repository.ResearcherProfileRepository profileRepository;
        private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

        public DataInitializer(com.researcher.tool.repository.UserRepository userRepository,
                        com.researcher.tool.repository.ResearcherProfileRepository profileRepository,
                        org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
                this.userRepository = userRepository;
                this.profileRepository = profileRepository;
                this.passwordEncoder = passwordEncoder;
        }

        @Override
        public void run(String... args) throws Exception {
                /*
                 * if (userRepository.count() == 0) {
                 * createResearcher("Geoffrey Hinton", "ghinton", "Toronto",
                 * "Deep Learning, Neural Networks",
                 * "University of Toronto", "Professor Emeritus");
                 * createResearcher("Yann LeCun", "yannl", "New York",
                 * "Machine Learning, Computer Vision",
                 * "Meta AI / NYU", "Chief AI Scientist");
                 * createResearcher("Feifei Li", "feifeili", "Stanford",
                 * "Computer Vision, AI Ethics",
                 * "Stanford University", "Professor of Computer Science");
                 * createResearcher("Ashish Vaswani", "ashishv", "Earth",
                 * "AI, Transformers, NLP",
                 * "Google DeepMind", "Distinguished Research Scientist");
                 * }
                 */
        }

        private void createResearcher(String name, String username, String country, String interests,
                        String institution, String title) {
                com.researcher.tool.model.User user = new com.researcher.tool.model.User();
                user.setEmail(username + "@example.com");
                user.setPassword(passwordEncoder.encode("password123"));
                user.setAuthProvider(com.researcher.tool.model.AuthProvider.LOCAL);
                user.setEmailVerified(true);
                user.setProfileCompleted(true);
                user = userRepository.save(user);

                com.researcher.tool.model.ResearcherProfile profile = new com.researcher.tool.model.ResearcherProfile(
                                user);
                profile.setFullName(name);
                profile.setDisplayName(username);
                profile.setCountry(country);
                profile.setInstitution(institution);
                profile.setCurrentTitle(title);
                profile.setBio("Pioneering research in " + interests
                                + ". Focused on advancing the field through innovation and collaboration.");
                profile.setResearchInterests(java.util.Arrays.asList(interests.split(", ")));
                profile.setOnboardingStep(3);
                profileRepository.save(profile);
        }
}
