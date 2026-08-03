import React, { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { countries, researchDomains, departments } from "../utils/countries";
import { isValidOrcid, cleanOrcid, checkOrcidRegistry } from "../utils/orcid-validator";
import { isValidScholarUrl, isValidLinkedinUrl, isValidPubmedId, isValidUrl, formatUrl } from "../utils/social-validator";

type OnboardingWizardProps = {
    onComplete: () => void;
};

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
    const { user, login, sessionToken, hasPassword: contextHasPassword } = useAuth();

    // Start at step 0 if they don't have a password yet. 
    // Both session users and authenticated OAuth users might need this.
    const initialStep = !contextHasPassword ? 0 : 1;

    const [step, setStep] = useState(initialStep);
    const [loading, setLoading] = useState(false);
    const [usernameChecking, setUsernameChecking] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [showInterestsDropdown, setShowInterestsDropdown] = useState(false);
    const interestsRef = useRef<HTMLDivElement>(null);
    const [interestSearch, setInterestSearch] = useState("");

    const [showDeptDropdown, setShowDeptDropdown] = useState(false);
    const deptRef = useRef<HTMLDivElement>(null);
    const [deptSearch, setDeptSearch] = useState("");

    const lastSelectedUni = useRef<string>("");
    const [orcidStatus, setOrcidStatus] = useState<'IDLE' | 'VALIDATING' | 'VALID' | 'INVALID_FORMAT' | 'INVALID_CHECKSUM' | 'NOT_FOUND'>('IDLE');
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Step 0: Initial Password for OAuth
    const [passwords, setPasswords] = useState({ password: "", confirm: "" });
    const [showPasswords, setShowPasswords] = useState({ password: false, confirm: false });
    const passwordInputRef = useRef<HTMLInputElement>(null);
    const confirmInputRef = useRef<HTMLInputElement>(null);

    const [uniLoading, setUniLoading] = useState(false);
    const [universities, setUniversities] = useState<string[]>([]);
    const [showUniDropdown, setShowUniDropdown] = useState(false);
    const uniRef = useRef<HTMLDivElement>(null);

    // Form State mapped to ProfileDto
    const [formData, setFormData] = useState({
        name: "",
        displayName: "",
        country: "",
        institution: "",
        role: "",
        avatarUrl: "",
        gender: "",
        department: "",
        title: "",
        bio: "",
        interests: [] as string[],
        socialLinks: {
            orcid: "",
            scholar: "",
            linkedin: "",
            website: "",
            email: ""
        }
    });

    // Email Verification State
    const [verifyingEmail, setVerifyingEmail] = useState(false);
    const [emailOtp, setEmailOtp] = useState("");
    const [emailVerifyingLoading, setEmailVerifyingLoading] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);

    // Auto-generate username from name
    useEffect(() => {
        if (formData.name && (formData.displayName === "" || formData.displayName === formData.name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))) {
            const suggested = formData.name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            setFormData(prev => ({ ...prev, displayName: suggested }));
        }
    }, [formData.name]);

    // University search
    useEffect(() => {
        const fetchUniversities = async () => {
            if (!formData.institution || formData.institution.length < 3 || formData.institution === lastSelectedUni.current) {
                setUniversities([]);
                return;
            }

            setUniLoading(true);
            try {
                // Free API for universities
                const response = await fetch(`http://universities.hipolabs.com/search?name=${encodeURIComponent(formData.institution)}`);
                const data = await response.json();
                const names = data.map((u: any) => u.name).filter((v: any, i: any, a: any) => a.indexOf(v) === i); // unique names
                setUniversities(names.slice(0, 10)); // Top 10 results

                if (names.length > 0 && names[0] !== formData.institution) {
                    setShowUniDropdown(true);
                } else {
                    setShowUniDropdown(false);
                }
            } catch (error) {
                console.error("University fetch failed", error);
            } finally {
                setUniLoading(false);
            }
        };

        const debounce = setTimeout(fetchUniversities, 500);
        return () => clearTimeout(debounce);
    }, [formData.institution]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (interestsRef.current && !interestsRef.current.contains(event.target as Node)) {
                setShowInterestsDropdown(false);
            }
            if (uniRef.current && !uniRef.current.contains(event.target as Node)) {
                setShowUniDropdown(false);
            }
            if (deptRef.current && !deptRef.current.contains(event.target as Node)) {
                setShowDeptDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Scroll to top on step change
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [step]);

    const formatUrl = (url: string) => {
        if (!url || url.trim() === "") return "";
        let formatted = url.trim();
        if (!/^https?:\/\//i.test(formatted)) {
            formatted = 'https://' + formatted;
        }
        return formatted;
    };

    const validateSocialLinks = () => {
        const { orcid } = formData.socialLinks;

        // ORCID Validation: Exactly 0000-0000-0000-0000 format
        if (orcid) {
            const clean = cleanOrcid(orcid);
            if (!isValidOrcid(clean)) {
                toast.error("ORCID iD failed checksum validation. Please verify your ORCID.");
                return false;
            }
            if (orcidStatus === 'NOT_FOUND') {
                toast.error("This ORCID iD does not exist in the ORCID registry.");
                return false;
            }
        }

        // Check if there are any other validation errors from inline validation
        const errors = Object.values(validationErrors).filter(err => err !== "");
        if (errors.length > 0) {
            toast.error("Please fix the validation errors before continuing.");
            return false;
        }

        return true;
    };

    // Sync form data once user is available (from OAuth/Session)
    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: prev.name || user.fullName || "",
                // We keep avatarUrl empty by default as requested, forcing a default or manual upload
                avatarUrl: prev.avatarUrl || "",
                socialLinks: {
                    ...prev.socialLinks,
                    email: prev.socialLinks.email || user.email || ""
                }
            }));
        }
    }, [user]);

    const roles = ["Student", "Research Scholar", "Faculty", "Independent Researcher"];

    // Real-time username availability check
    useEffect(() => {
        const checkUsername = async () => {
            if (!formData.displayName || formData.displayName.length < 3) {
                setUsernameAvailable(null);
                return;
            }

            setUsernameChecking(true);
            try {
                const response = await api.get(`/api/v1/profiles/check-username?username=${formData.displayName}`);
                setUsernameAvailable(response.data.available);
            } catch (error) {
                console.error("Username check failed", error);
            } finally {
                setUsernameChecking(false);
            }
        };

        const debounce = setTimeout(checkUsername, 500);
        return () => clearTimeout(debounce);
    }, [formData.displayName]);

    // Real-time ORCID check
    useEffect(() => {
        const validate = async () => {
            const raw = formData.socialLinks.orcid;
            if (!raw) {
                setOrcidStatus('IDLE');
                return;
            }

            const clean = cleanOrcid(raw);

            // Format check
            const pattern = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
            if (!pattern.test(clean)) {
                setOrcidStatus('INVALID_FORMAT');
                return;
            }

            // Checksum check
            if (!isValidOrcid(clean)) {
                setOrcidStatus('INVALID_CHECKSUM');
                return;
            }

            setOrcidStatus('VALIDATING');
            const exists = await checkOrcidRegistry(clean);
            if (exists) {
                setOrcidStatus('VALID');
                // Automatically clean if format matches but was messy
                if (raw !== clean) {
                    setFormData(prev => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, orcid: clean }
                    }));
                }
            } else {
                setOrcidStatus('NOT_FOUND');
            }
        };

        const debounce = setTimeout(validate, 800);
        return () => clearTimeout(debounce);
    }, [formData.socialLinks.orcid]);

    const validateField = (field: string, value: string) => {
        let error = "";
        if (!value) {
            setValidationErrors(prev => ({ ...prev, [field]: "" }));
            return "";
        }

        switch (field) {
            case 'scholar':
                if (!isValidUrl(value)) error = "Invalid URL format.";
                else if (!isValidScholarUrl(value)) error = "Must be a scholar.google.com or google.com/citations link.";
                break;
            case 'linkedin':
                if (!isValidUrl(value)) error = "Invalid URL format.";
                else if (!isValidLinkedinUrl(value)) error = "Must be a valid LinkedIn profile URL.";
                break;
            case 'website':
                if (!isValidUrl(value)) error = "Invalid Website URL.";
                break;
            case 'pubmed':
                if (!isValidPubmedId(value)) error = "PubMed ID must be numeric only.";
                break;
        }

        setValidationErrors(prev => ({ ...prev, [field]: error }));
        return error;
    };

    const togglePasswordVisibility = (field: 'password' | 'confirm') => {
        const inputRef = field === 'password' ? passwordInputRef : confirmInputRef;
        const cursorPosition = inputRef.current?.selectionStart;

        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));

        // Restore cursor position after the type change re-render
        requestAnimationFrame(() => {
            if (inputRef.current && cursorPosition !== null && cursorPosition !== undefined) {
                inputRef.current.focus();
                inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
            }
        });
    };

    const handleNext = async () => {
        if (step === 0) {
            if (!passwords.password || passwords.password.length < 8) {
                toast.error("Password must be at least 8 characters.");
                return;
            }
            if (passwords.password !== passwords.confirm) {
                toast.error("Passwords do not match.");
                return;
            }
            setLoading(true);
            try {
                // Pass session token if available, otherwise it uses authentication context
                const params = sessionToken ? `?sessionToken=${sessionToken}` : "";
                await api.post(`/api/auth/set-password${params}`, { newPassword: passwords.password });
                toast.success("Security credentials set!");
                setStep(1);
            } catch (err) {
                toast.error("Failed to set password.");
            } finally {
                setLoading(false);
            }
            return;
        }

        if (step === 1) {
            // Validate Step 1
            if (!formData.name || !formData.displayName || !formData.country || !formData.institution || !formData.role || !formData.gender) {
                toast.error("All identity fields are mandatory.");
                return;
            }
            if (!usernameAvailable) {
                toast.error("Please choose an available username.");
                return;
            }
            setStep(2);
        } else {
            // Validate Step 2 - Bio, Department, Title, Research Interests are mandatory
            if (!formData.department || !formData.title || !formData.bio) {
                toast.error("Professional details (Department, Title, Bio) are mandatory.");
                return;
            }
            if (formData.interests.length === 0) {
                toast.error("Please select at least one research interest.");
                return;
            }

            // Check all social link validations
            if (Object.values(validationErrors).some(err => err !== "")) {
                toast.error("Please fix the errors in your profile links.");
                return;
            }

            if (!validateSocialLinks()) {
                return;
            }
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (step > initialStep) setStep(step - 1);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Unified completion endpoint handles both session-based and authenticated users
            const response = await api.post("/api/auth/complete-onboarding", formData);

            // Use the fresh token from the response
            if (response.data && response.data.token) {
                // Clear session token as we are now fully onboarded
                sessionStorage.removeItem('onboarding_session_token');
                sessionStorage.removeItem('pending_registration');
                sessionStorage.removeItem('pending_otp');

                await login(response.data.token);
                sessionStorage.setItem('first_time_welcome', 'true');
                toast.success("Onboarding completed!");
                onComplete();
            } else {
                toast.error("Failed to receive authentication token.");
            }
        } catch (err: any) {
            console.error("Onboarding submission error:", err);
            const errorMsg = err.response?.data?.message || err.response?.data || "Failed to complete onboarding.";
            toast.error(typeof errorMsg === 'string' ? errorMsg : "Failed to complete onboarding.");
        } finally {
            setLoading(false);
        }
    };

    const toggleInterest = (domain: string) => {
        const newInterests = formData.interests.includes(domain)
            ? formData.interests.filter(i => i !== domain)
            : [...formData.interests, domain];
        setFormData({ ...formData, interests: newInterests });
    };

    const removeInterest = (domain: string) => {
        setFormData({ ...formData, interests: formData.interests.filter(i => i !== domain) });
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setLoading(true);
            const data = new FormData();
            data.append("file", file);
            const response = await api.post("/api/v1/profiles/avatar", data, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setFormData({ ...formData, avatarUrl: response.data.avatarUrl });
            toast.success("Avatar uploaded!");
        } catch (error) {
            console.error("Avatar upload failed", error);
            toast.error("Failed to upload image.");
        } finally {
            setLoading(false);
        }
    };

    const handleRequestEmailVerification = async () => {
        if (!formData.socialLinks.email) {
            toast.error("Please enter a contact email.");
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.socialLinks.email)) {
            toast.error("Invalid email format.");
            return;
        }

        try {
            setEmailVerifyingLoading(true);
            await api.post(`/api/v1/profiles/verify-contact-email/request?email=${formData.socialLinks.email}`);
            setVerifyingEmail(true);
            toast.success(`OTP sent to ${formData.socialLinks.email}`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to send OTP");
        } finally {
            setEmailVerifyingLoading(false);
        }
    };

    const handleVerifyEmail = async () => {
        if (!emailOtp || emailOtp.length !== 6) {
            toast.error("Please enter a valid 6-digit OTP.");
            return;
        }

        try {
            setEmailVerifyingLoading(true);
            await api.post(`/api/v1/profiles/verify-contact-email/confirm?otp=${emailOtp}`);
            setEmailVerified(true);
            setVerifyingEmail(false);
            setEmailOtp("");
            toast.success("Email verified successfully!");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Invalid or expired OTP");
        } finally {
            setEmailVerifyingLoading(false);
        }
    };

    const progress = initialStep === 0 ? ((step) / 3) * 100 : ((step) / 2) * 100;

    return (
        <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center px-4 py-8 md:py-16">
            <div className="max-w-4xl w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_-20px_rgba(31,27,42,0.15)] md:shadow-[0_40px_80px_-30px_rgba(31,27,42,0.2)] p-6 md:p-12 border border-[#e8e4f0] relative overflow-hidden">
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-[#faf8f5]">
                    <div
                        className="h-full bg-[#f5c84b] transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="mb-12 flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-black text-[#1f1b2a] tracking-tight">
                            {step === 0 ? "Set Secure Password" : step === 1 ? "Researcher Identity" : "Professional Profile"}
                        </h2>
                        <p className="text-[#8a8396] text-sm mt-2 font-medium">
                            {step === 0 ? "Step 1: Account Security" : step === 1 ? "Step 2: Core details" : "Step 3: Professional details"}
                        </p>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="px-4 py-1.5 rounded-full bg-[#fffcf0] border border-[#f5c84b]/20 text-[#f5c84b] font-black text-xs uppercase tracking-widest shadow-sm">
                            Step {initialStep === 0 ? step + 1 : step} of {initialStep === 0 ? 3 : 2}
                        </div>
                    </div>
                </div>

                {/* Step 0: Initial Password (for OAuth) */}
                {step === 0 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="bg-[#fff9e6] p-6 rounded-2xl border border-[#f5c84b]/20 mb-8">
                            <div className="flex gap-4">
                                <span className="material-symbols-outlined text-[#f5c84b] text-3xl">shield</span>
                                <div>
                                    <h3 className="font-bold text-[#1f1b2a]">Create your system password</h3>
                                    <p className="text-sm text-[#6e6189] mt-1">Since you signed in via {user?.authProvider}, we need you to set a local password for extra security and account recovery.</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div className="form-group">
                                <label className="block text-sm font-bold text-[#1f1b2a] mb-2">Password</label>
                                <div className="relative group h-[52px]">
                                    <input
                                        ref={passwordInputRef}
                                        type={showPasswords.password ? "text" : "password"}
                                        placeholder="Enter your password"
                                        className="w-full h-full pl-4 pr-12 bg-[#faf8f5] border border-[#e8e4f0] rounded-xl focus:border-[#f5c84b] outline-none font-medium transition-colors group-hover:border-[#d4d0da]"
                                        value={passwords.password}
                                        onChange={(e) => setPasswords({ ...passwords, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => togglePasswordVisibility('password')}
                                        className="absolute right-4 z-10 flex items-center justify-center w-8 h-8 rounded-full text-[#8a8396] hover:text-[#1f1b2a] hover:bg-black/5 transition-colors cursor-pointer"
                                        style={{ top: '50%', transform: 'translateY(-50%)' }}
                                    >
                                        <span className="material-symbols-outlined text-[20px]">
                                            {showPasswords.password ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>

                                {/* Password Strength Meter */}
                                {passwords.password && (
                                    <div className="mt-3 flex items-center gap-2">
                                        <div className="flex-1 flex gap-1 h-1.5">
                                            {[1, 2, 3, 4].map((level) => {
                                                const strength =
                                                    (passwords.password.length >= 8 ? 1 : 0) +
                                                    (/[A-Z]/.test(passwords.password) ? 1 : 0) +
                                                    (/[0-9]/.test(passwords.password) ? 1 : 0) +
                                                    (/[^A-Za-z0-9]/.test(passwords.password) ? 1 : 0);

                                                let color = "bg-[#e8e4f0]";
                                                if (strength >= level) {
                                                    if (strength <= 1) color = "bg-red-400";
                                                    else if (strength === 2) color = "bg-orange-400";
                                                    else if (strength === 3) color = "bg-yellow-400";
                                                    else color = "bg-green-500";
                                                }
                                                return <div key={level} className={`flex-1 rounded-full transition-colors duration-300 ${color}`}></div>
                                            })}
                                        </div>
                                        <span className="text-xs font-medium text-[#6e6189] min-w-[60px] text-right">
                                            {(() => {
                                                const strength =
                                                    (passwords.password.length >= 8 ? 1 : 0) +
                                                    (/[A-Z]/.test(passwords.password) ? 1 : 0) +
                                                    (/[0-9]/.test(passwords.password) ? 1 : 0) +
                                                    (/[^A-Za-z0-9]/.test(passwords.password) ? 1 : 0);
                                                if (strength <= 1) return "Weak";
                                                if (strength === 2) return "Fair";
                                                if (strength === 3) return "Good";
                                                return "Strong";
                                            })()}
                                        </span>
                                    </div>
                                )}

                                <p className="text-[11px] text-[#8a8396] mt-2 font-medium flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[14px]">info</span>
                                    Min 8 chars • Uppercase • Number • Special
                                </p>
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-bold text-[#1f1b2a] mb-2">Confirm Password</label>
                                <div className="relative group h-[52px]">
                                    <input
                                        ref={confirmInputRef}
                                        type={showPasswords.confirm ? "text" : "password"}
                                        placeholder="Confirm your password"
                                        className="w-full h-full pl-4 pr-12 bg-[#faf8f5] border border-[#e8e4f0] rounded-xl focus:border-[#f5c84b] outline-none font-medium transition-colors group-hover:border-[#d4d0da]"
                                        value={passwords.confirm}
                                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => togglePasswordVisibility('confirm')}
                                        className="absolute right-4 z-10 flex items-center justify-center w-8 h-8 rounded-full text-[#8a8396] hover:text-[#1f1b2a] hover:bg-black/5 transition-colors cursor-pointer"
                                        style={{ top: '50%', transform: 'translateY(-50%)' }}
                                    >
                                        <span className="material-symbols-outlined text-[20px]">
                                            {showPasswords.confirm ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                                {passwords.confirm && passwords.password !== passwords.confirm && (
                                    <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">error</span>
                                        Passwords do not match
                                    </p>
                                )}
                                {passwords.confirm && passwords.password === passwords.confirm && (
                                    <p className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                        Passwords match
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 1: Core Identity */}
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Avatar Upload */}
                        <div className="flex flex-col items-center mb-6">
                            <div
                                onClick={() => document.getElementById('avatar-input')?.click()}
                                className="relative w-28 h-28 rounded-full border-2 border-dashed border-[#f5c84b] flex items-center justify-center cursor-pointer group hover:bg-[#fffcf0] transition-all overflow-hidden"
                            >
                                {formData.avatarUrl ? (
                                    <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-gradient-to-br from-[#f0f0f0] to-[#e8e4f0] flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[#8a8396] text-[48px] font-filled">person</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <span className="text-white text-[10px] font-bold uppercase">{formData.avatarUrl ? 'Change' : 'Add Info'}</span>
                                </div>
                            </div>
                            <input
                                type="file"
                                id="avatar-input"
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                            />
                            <p className="text-[10px] text-[#8a8396] mt-2 font-bold uppercase tracking-tight">Professional headshot recommended</p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="form-group">
                                <label className="block text-sm font-bold text-[#1f1b2a] mb-2 uppercase tracking-wider">Full Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="Marie Curie"
                                    className="w-full px-5 py-4 bg-[#faf8f5] border border-[#e8e4f0] rounded-xl focus:border-[#f5c84b] outline-none text-base font-medium"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-bold text-[#1f1b2a] mb-2 uppercase tracking-wider">
                                    Username <span className="text-red-500">*</span> <span className="text-xs text-[#8a8396] normal-case">(unique, cannot be changed later)</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="marie_curie"
                                        className={`w-full px-5 py-4 bg-[#faf8f5] border rounded-xl outline-none text-base font-medium ${usernameAvailable === true ? 'border-green-500 focus:border-green-500' :
                                            usernameAvailable === false ? 'border-red-500 focus:border-red-500' :
                                                'border-[#e8e4f0] focus:border-[#f5c84b]'
                                            }`}
                                        value={formData.displayName}
                                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                                    />
                                    {usernameChecking && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <div className="w-5 h-5 border-2 border-[#f5c84b] border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                    {!usernameChecking && usernameAvailable === true && (
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 material-symbols-outlined">check_circle</span>
                                    )}
                                    {!usernameChecking && usernameAvailable === false && (
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 material-symbols-outlined">cancel</span>
                                    )}
                                </div>
                                {usernameAvailable === false && (
                                    <p className="text-xs text-red-500 mt-1">Username already taken</p>
                                )}
                                {usernameAvailable === true && (
                                    <p className="text-xs text-green-600 mt-1">Username available!</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="form-group col-span-2">
                                <label className="block text-sm font-bold text-[#1f1b2a] mb-2 uppercase tracking-wider flex items-center gap-2">
                                    Primary Contact Email
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                                        <span className="material-symbols-outlined text-[12px] font-filled">verified</span>
                                        Verified
                                    </span>
                                </label>
                                <div className="relative group h-[52px]">
                                    <input
                                        type="email"
                                        disabled
                                        className="w-full h-full px-5 bg-gray-50 border border-[#e8e4f0] rounded-xl text-gray-500 cursor-not-allowed text-base font-medium"
                                        value={formData.socialLinks.email || user?.email || ""}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-300 text-[20px]">lock</span>
                                </div>
                                <p className="text-[10px] text-[#8a8396] mt-2 font-bold uppercase tracking-tight">Email verified via your primary authentication</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="form-group">
                                <label className="block text-sm font-bold text-[#1f1b2a] mb-2 uppercase tracking-wider">Country <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <select
                                        className="w-full px-5 py-4 bg-[#faf8f5] border border-[#e8e4f0] rounded-xl focus:border-[#f5c84b] outline-none appearance-none cursor-pointer text-base font-medium"
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                    >
                                        <option value="">Select Country</option>
                                        {countries.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                                </div>
                            </div>
                            <div className="form-group relative" ref={uniRef}>
                                <label className="block text-sm font-bold text-[#1f1b2a] mb-2 uppercase tracking-wider">Institution / University <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="e.g. Stanford University"
                                        className="w-full px-5 py-4 bg-[#faf8f5] border border-[#e8e4f0] rounded-xl focus:border-[#f5c84b] outline-none text-base font-medium"
                                        value={formData.institution}
                                        onChange={(e) => {
                                            setFormData({ ...formData, institution: e.target.value });
                                            setShowUniDropdown(true);
                                        }}
                                        onFocus={() => {
                                            if (universities.length > 0) setShowUniDropdown(true);
                                        }}
                                    />
                                    {uniLoading && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <div className="w-4 h-4 border-2 border-[#f5c84b] border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>

                                {showUniDropdown && universities.length > 0 && (
                                    <div className="absolute z-[60] mt-1 w-full bg-white border border-[#e8e4f0] rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                        {universities.map((uni) => (
                                            <button
                                                key={uni}
                                                type="button"
                                                onClick={() => {
                                                    lastSelectedUni.current = uni;
                                                    setFormData({ ...formData, institution: uni });
                                                    setShowUniDropdown(false);
                                                    setUniversities([]);
                                                }}
                                                className="w-full px-4 py-3 text-left text-sm hover:bg-[#faf9f7] text-[#6e6189] hover:text-[#1f1b2a] transition border-b border-[#faf8f5] last:border-0"
                                            >
                                                {uni}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="block text-sm font-bold text-[#1f1b2a] mb-3 uppercase tracking-wider">Current Role <span className="text-red-500">*</span></label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {roles.map(role => (
                                    <button
                                        key={role}
                                        onClick={() => setFormData({ ...formData, role })}
                                        className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${formData.role === role
                                            ? "border-[#f5c84b] bg-[#fffcf0] text-[#1f1b2a]"
                                            : "border-[#e8e4f0] text-[#6e6189] hover:border-[#f5c84b]/50"
                                            }`}
                                    >
                                        {role}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group border-t border-[#e8e4f0] pt-6">
                            <label className="block text-sm font-bold text-[#1f1b2a] mb-3 uppercase tracking-wider">Gender <span className="text-red-500">*</span></label>
                            <div className="flex gap-4">
                                {["Male", "Female", "Other"].map(g => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, gender: g })}
                                        className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${formData.gender === g
                                            ? "border-[#f5c84b] bg-[#fffcf0] text-[#1f1b2a]"
                                            : "border-[#e8e4f0] text-[#6e6189] hover:border-[#f5c84b]/50"
                                            }`}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined text-[20px]">
                                                {g === 'Male' ? 'male' : g === 'Female' ? 'female' : 'person'}
                                            </span>
                                            {g}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Professional Profile */}
                {step === 2 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="form-group relative" ref={deptRef}>
                                <label className="block text-sm font-bold text-[#1f1b2a] mb-2 uppercase tracking-wider">Department <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search for your department..."
                                        className="w-full px-4 py-3.5 bg-[#faf8f5] border border-[#e8e4f0] rounded-xl focus:border-[#f5c84b] outline-none"
                                        value={formData.department}
                                        onChange={(e) => {
                                            setFormData({ ...formData, department: e.target.value });
                                            setDeptSearch(e.target.value);
                                            setShowDeptDropdown(true);
                                        }}
                                        onFocus={() => setShowDeptDropdown(true)}
                                    />
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">search</span>
                                </div>

                                {showDeptDropdown && (
                                    <div className="absolute z-[60] mt-1 w-full bg-white border border-[#e8e4f0] rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                        {departments
                                            .filter(d => d.toLowerCase().includes(deptSearch.toLowerCase()))
                                            .map((dept) => (
                                                <button
                                                    key={dept}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, department: dept });
                                                        setShowDeptDropdown(false);
                                                    }}
                                                    className="w-full px-4 py-3 text-left text-sm hover:bg-[#faf9f7] text-[#6e6189] hover:text-[#1f1b2a] transition border-b border-[#faf8f5] last:border-0"
                                                >
                                                    {dept}
                                                </button>
                                            ))}
                                        {deptSearch && !departments.some(d => d.toLowerCase() === deptSearch.toLowerCase()) && (
                                            <button
                                                type="button"
                                                onClick={() => setShowDeptDropdown(false)}
                                                className="w-full px-4 py-3 text-left text-sm text-[#f5c84b] italic font-medium"
                                            >
                                                Using custom: "{deptSearch}"
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-bold text-[#1f1b2a] mb-2 uppercase tracking-wider">Current Position / Title <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="e.g. Senior Researcher"
                                    className="w-full px-4 py-3.5 bg-[#faf8f5] border border-[#e8e4f0] rounded-xl focus:border-[#f5c84b] outline-none"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="block text-sm font-bold text-[#1f1b2a] mb-2 uppercase tracking-wider">Bio / Research Description <span className="text-red-500">*</span></label>
                            <textarea
                                rows={3}
                                placeholder="Describe your research interests and academic background..."
                                className="w-full px-4 py-3.5 bg-[#faf8f5] border border-[#e8e4f0] rounded-xl focus:border-[#f5c84b] outline-none text-sm"
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            />
                        </div>

                        {/* Research Interests - Multi-select Dropdown */}
                        <div className="form-group relative" ref={interestsRef}>
                            <label className="block text-sm font-bold text-[#1f1b2a] mb-2 uppercase tracking-wider">
                                Research Interests / Domains <span className="text-red-500">*</span>
                            </label>

                            {/* Selected Tags Display */}
                            <div
                                onClick={() => setShowInterestsDropdown(!showInterestsDropdown)}
                                className="w-full min-h-[52px] px-4 py-3 bg-[#faf8f5] border border-[#e8e4f0] rounded-xl focus:border-[#f5c84b] cursor-pointer flex flex-wrap items-center gap-2"
                            >
                                {formData.interests.length === 0 ? (
                                    <span className="text-gray-400 text-sm">Select or type research interests...</span>
                                ) : (
                                    formData.interests.map(interest => (
                                        <span
                                            key={interest}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#fff9e6] border border-[#f5c84b] rounded-lg text-xs font-bold text-[#1f1b2a]"
                                        >
                                            {interest}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeInterest(interest); }}
                                                className="hover:text-red-500 transition"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">close</span>
                                            </button>
                                        </span>
                                    ))
                                )}
                                <span className="material-symbols-outlined ml-auto text-gray-400">
                                    {showInterestsDropdown ? 'expand_less' : 'expand_more'}
                                </span>
                            </div>

                            {/* Dropdown Options with Search */}
                            {showInterestsDropdown && (
                                <div className="absolute z-50 mt-2 w-full bg-white border border-[#e8e4f0] rounded-xl shadow-xl max-h-72 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2">
                                    <div className="p-3 border-b border-[#faf8f5] bg-white sticky top-0">
                                        <input
                                            type="text"
                                            placeholder="Search or type custom interest..."
                                            className="w-full px-4 py-2 bg-[#faf8f5] border border-[#e8e4f0] rounded-lg focus:border-[#f5c84b] outline-none text-sm"
                                            value={interestSearch}
                                            onChange={(e) => setInterestSearch(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && interestSearch.trim()) {
                                                    e.preventDefault();
                                                    if (!formData.interests.includes(interestSearch.trim())) {
                                                        toggleInterest(interestSearch.trim());
                                                    }
                                                    setInterestSearch("");
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="overflow-y-auto max-h-56">
                                        {researchDomains
                                            .filter(d => d.toLowerCase().includes(interestSearch.toLowerCase()))
                                            .map(domain => (
                                                <button
                                                    key={domain}
                                                    type="button"
                                                    onClick={() => toggleInterest(domain)}
                                                    className={`w-full px-4 py-3 flex items-center justify-between text-left text-sm hover:bg-[#faf9f7] transition ${formData.interests.includes(domain)
                                                        ? 'bg-[#fff9e6] text-[#1f1b2a] font-semibold'
                                                        : 'text-[#6e6189]'
                                                        }`}
                                                >
                                                    {domain}
                                                    {formData.interests.includes(domain) && (
                                                        <span className="material-symbols-outlined text-[#f5c84b] text-[18px]">check</span>
                                                    )}
                                                </button>
                                            ))}
                                        {interestSearch && !researchDomains.some(d => d.toLowerCase() === interestSearch.toLowerCase()) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    toggleInterest(interestSearch.trim());
                                                    setInterestSearch("");
                                                }}
                                                className="w-full px-4 py-3 text-left text-sm text-[#f5c84b] font-medium border-t border-[#faf8f5]"
                                            >
                                                Add custom: "{interestSearch}"
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="form-group">
                                <label className="block text-sm font-bold text-[#1f1b2a] mb-2 uppercase tracking-wider">
                                    ORCID iD
                                    {orcidStatus === 'VALID' && (
                                        <span className="ml-2 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-black animate-in fade-in zoom-in">VERIFIED</span>
                                    )}
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="0000-0000-0000-0000"
                                        className={`w-full px-4 py-3.5 bg-[#faf8f5] border rounded-xl outline-none transition-all ${orcidStatus === 'VALID' ? 'border-emerald-500 shadow-sm shadow-emerald-500/10' :
                                            orcidStatus === 'INVALID_FORMAT' || orcidStatus === 'INVALID_CHECKSUM' || orcidStatus === 'NOT_FOUND' ? 'border-rose-500 bg-rose-50/10' :
                                                'border-[#e8e4f0] focus:border-[#f5c84b]'
                                            }`}
                                        value={formData.socialLinks.orcid}
                                        onChange={(e) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, orcid: e.target.value } })}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        {orcidStatus === 'VALIDATING' && (
                                            <div className="w-4 h-4 border-2 border-[#f5c84b] border-t-transparent rounded-full animate-spin"></div>
                                        )}
                                        {orcidStatus === 'VALID' && (
                                            <span className="material-symbols-outlined text-emerald-500 filled text-[20px] animate-in zoom-in">verified</span>
                                        )}
                                        {(orcidStatus === 'INVALID_FORMAT' || orcidStatus === 'INVALID_CHECKSUM' || orcidStatus === 'NOT_FOUND') && (
                                            <span className="material-symbols-outlined text-rose-500 text-[20px] animate-in zoom-in">error</span>
                                        )}
                                    </div>
                                </div>
                                {orcidStatus === 'INVALID_FORMAT' && (
                                    <p className="text-[11px] text-rose-500 mt-1.5 font-bold animate-in slide-in-from-top-1">Invalid ORCID iD. Please enter a valid ORCID in the format 0000-0000-0000-0000.</p>
                                )}
                                {orcidStatus === 'INVALID_CHECKSUM' && (
                                    <p className="text-[11px] text-rose-500 mt-1.5 font-bold animate-in slide-in-from-top-1">ORCID iD failed checksum validation. Please verify your ORCID.</p>
                                )}
                                {orcidStatus === 'NOT_FOUND' && (
                                    <p className="text-[11px] text-rose-500 mt-1.5 font-bold animate-in slide-in-from-top-1">This ORCID iD does not exist. Register at <a href="https://orcid.org" target="_blank" rel="noreferrer" className="underline">orcid.org</a>.</p>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-bold text-[#1f1b2a] mb-2 uppercase tracking-wider">Scholar URL</label>
                                <input
                                    type="text"
                                    placeholder="Scholar Profile URL"
                                    className={`w-full px-4 py-3.5 bg-[#faf8f5] border rounded-xl outline-none transition-all ${validationErrors.scholar ? 'border-rose-500 bg-rose-50/10' : 'border-[#e8e4f0] focus:border-[#f5c84b]'}`}
                                    value={formData.socialLinks.scholar}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({ ...formData, socialLinks: { ...formData.socialLinks, scholar: val } });
                                        validateField('scholar', val);
                                    }}
                                    onBlur={(e) => {
                                        const formatted = formatUrl(e.target.value);
                                        setFormData({ ...formData, socialLinks: { ...formData.socialLinks, scholar: formatted } });
                                        validateField('scholar', formatted);
                                    }}
                                />
                                {validationErrors.scholar && (
                                    <p className="text-[11px] text-rose-500 mt-1.5 font-bold animate-in slide-in-from-top-1">{validationErrors.scholar}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="form-group">
                                <label className="block text-sm font-bold text-[#1f1b2a] mb-2 uppercase tracking-wider">LinkedIn</label>
                                <input
                                    type="text"
                                    placeholder="https://linkedin.com/in/username"
                                    className={`w-full px-4 py-3.5 bg-[#faf8f5] border rounded-xl outline-none transition-all ${validationErrors.linkedin ? 'border-rose-500 bg-rose-50/10' : 'border-[#e8e4f0] focus:border-[#f5c84b]'}`}
                                    value={formData.socialLinks.linkedin}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({ ...formData, socialLinks: { ...formData.socialLinks, linkedin: val } });
                                        validateField('linkedin', val);
                                    }}
                                    onBlur={(e) => {
                                        const formatted = formatUrl(e.target.value);
                                        setFormData({ ...formData, socialLinks: { ...formData.socialLinks, linkedin: formatted } });
                                        validateField('linkedin', formatted);
                                    }}
                                />
                                {validationErrors.linkedin && (
                                    <p className="text-[11px] text-rose-500 mt-1.5 font-bold animate-in slide-in-from-top-1">{validationErrors.linkedin}</p>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-bold text-[#1f1b2a] mb-2 uppercase tracking-wider">Website</label>
                                <input
                                    type="text"
                                    placeholder="https://yourwebsite.com"
                                    className={`w-full px-4 py-3.5 bg-[#faf8f5] border rounded-xl outline-none transition-all ${validationErrors.website ? 'border-rose-500 bg-rose-50/10' : 'border-[#e8e4f0] focus:border-[#f5c84b]'}`}
                                    value={formData.socialLinks.website}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({ ...formData, socialLinks: { ...formData.socialLinks, website: val } });
                                        validateField('website', val);
                                    }}
                                    onBlur={(e) => {
                                        const formatted = formatUrl(e.target.value);
                                        setFormData({ ...formData, socialLinks: { ...formData.socialLinks, website: formatted } });
                                        validateField('website', formatted);
                                    }}
                                />
                                {validationErrors.website && (
                                    <p className="text-[11px] text-rose-500 mt-1.5 font-bold animate-in slide-in-from-top-1">{validationErrors.website}</p>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="block text-sm font-bold text-[#1f1b2a] mb-2 uppercase tracking-wider">
                                PubMed Author ID
                            </label>
                            <input
                                type="text"
                                placeholder="Enter your PubMed Author ID to fetch publications"
                                className={`w-full px-4 py-3.5 bg-[#faf8f5] border rounded-xl outline-none transition-all ${validationErrors.pubmed ? 'border-rose-500 bg-rose-50/10' : 'border-[#e8e4f0] focus:border-[#f5c84b]'}`}
                                value={(formData as any).pubmedAuthorId || ""}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData({ ...formData, pubmedAuthorId: val } as any);
                                    validateField('pubmed', val);
                                }}
                            />
                            {validationErrors.pubmed && (
                                <p className="text-[11px] text-rose-500 mt-1.5 font-bold animate-in slide-in-from-top-1">{validationErrors.pubmed}</p>
                            )}
                            <p className="text-[10px] text-[#8a8396] mt-2 font-bold uppercase tracking-tight flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px]">science</span>
                                Enables automatic publication import
                            </p>
                        </div>
                    </div>
                )}

                <div className="mt-14 flex justify-between items-center bg-[#faf8f5] -mx-6 md:-mx-12 -mb-6 md:-mb-12 p-6 md:p-12 border-t border-[#e8e4f0]">
                    <button
                        onClick={handleBack}
                        disabled={step <= initialStep || loading}
                        className={`text-sm font-black uppercase tracking-widest transition-all ${step <= initialStep ? "text-gray-300 cursor-not-allowed" : "text-[#8a8396] hover:text-[#1f1b2a] active:scale-95"}`}
                    >
                        Back
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={loading || (step === 1 && !usernameAvailable)}
                        className="px-8 md:px-12 h-14 bg-[#f5c84b] text-[#1f1b2a] font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-[#f4b82a] transition-all shadow-xl shadow-[#f5c84b]/10 active:scale-95 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-[#1f1b2a] border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                {step === 2 ? "Complete Setup" : step === 0 ? "Set Password" : "Continue"}
                                <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingWizard;
