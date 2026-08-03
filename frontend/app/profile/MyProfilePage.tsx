import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import profileService, { Profile } from "../../src/services/profile.service";
import articleService, { Article } from "../../src/services/article.service";
import followService from "../../src/services/follow.service";
import { useAuth } from "../../src/context/AuthContext";
import { toast } from "sonner";
import PageTitle from "../../src/components/PageTitle";
import FollowButton from "../../src/components/FollowButton";
import ArticleCard from "./ArticleCard";
import PubMedSearchModal from "../../src/components/PubMedSearchModal";
import ConfirmationModal from "../../src/components/ConfirmationModal";
import { isValidScholarUrl, isValidLinkedinUrl, isValidUrl, formatUrl } from "../../src/utils/social-validator";
import { researchDomains, departments as departmentsList } from "../../src/utils/countries";

const MyProfilePage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { userId: urlUserId, username } = useParams<{ userId: string; username: string }>();
    const isOwnProfile = (!urlUserId && !username) || urlUserId === user?.id || (username && username === user?.displayName);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Handle specific entry into edit mode (e.g., from Profile Integrity Modal)
    useEffect(() => {
        if (searchParams.get("edit") === "true" || location.state?.editMode) {
            setIsEditing(true);
            // Clean up the location state so it doesn't stay in edit mode on refresh
            if (location.state?.editMode) {
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [location.search, location.state, navigate]);

    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedArticles, setSelectedArticles] = useState<number[]>([]);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

    // Articles State
    const [articles, setArticles] = useState<Article[]>([]);
    const [articleLoading, setArticleLoading] = useState(false);

    const [isFollowing, setIsFollowing] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [isPubMedSearchOpen, setIsPubMedSearchOpen] = useState(false);

    // State for Profile Data
    const [profile, setProfile] = useState({
        userId: "",
        name: "",
        displayName: "",
        title: "",
        institution: "",
        country: "",
        role: "",
        department: "",
        bio: "",
        avatar: "",
        pubmedAuthorId: "",
        pubmedLastSync: "",
        stats: {
            views: "0",
            followers: "0",
            following: "0",
            publications: "0"
        },
        socials: {
            orcid: "",
            scholar: "",
            linkedin: "",
            website: "",
            email: ""
        },
        verificationStatus: {} as any
    });
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // State for Expertise Tags
    const [expertise, setExpertise] = useState<string[]>([]);

    // Expertise Dropdown State
    const [interestSearch, setInterestSearch] = useState("");
    const [showInterestsDropdown, setShowInterestsDropdown] = useState(false);
    const interestsRef = useRef<HTMLDivElement>(null);

    // Department Dropdown State
    const [deptSearch, setDeptSearch] = useState("");
    const [showDeptDropdown, setShowDeptDropdown] = useState(false);
    const deptRef = useRef<HTMLDivElement>(null);

    // Pagination State
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const pageSize = 5;

    // Email Verification State
    const [verifyingEmail, setVerifyingEmail] = useState(false);
    const [emailOtpSent, setEmailOtpSent] = useState(false);
    const [emailOtp, setEmailOtp] = useState("");
    const [emailVerifyingLoading, setEmailVerifyingLoading] = useState(false);
    const [initialEmail, setInitialEmail] = useState("");

    // Reset selection mode when not editing
    useEffect(() => {
        if (!isEditing) {
            setIsSelectionMode(false);
            setSelectedArticles([]);
        }
    }, [isEditing]);

    // Click Outside Handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (interestsRef.current && !interestsRef.current.contains(event.target as Node)) {
                setShowInterestsDropdown(false);
            }
            if (deptRef.current && !deptRef.current.contains(event.target as Node)) {
                setShowDeptDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                let data;
                if (isOwnProfile) {
                    data = await profileService.getMyProfile();
                } else if (urlUserId) {
                    data = await profileService.getProfile(urlUserId);
                } else if (username) {
                    data = await profileService.getProfileByUsername(username);
                }

                if (data) {
                    setProfile(prev => ({
                        ...prev,
                        userId: data.userId,
                        name: data.name || (isOwnProfile ? user?.fullName : "Researcher") || "",
                        displayName: data.displayName || "",
                        title: data.title || "",
                        institution: data.institution || "",
                        country: data.country || "",
                        role: data.role || "",
                        department: data.department || "",
                        bio: data.bio || "",
                        avatar: data.avatarUrl || prev.avatar,
                        socials: {
                            orcid: data.socialLinks?.orcid || "",
                            scholar: data.socialLinks?.scholar || "",
                            linkedin: data.socialLinks?.linkedin || "",
                            website: data.socialLinks?.website || "",
                            email: data.socialLinks?.email || prev.socials.email || (isOwnProfile ? user?.email : "") || ""
                        },
                        pubmedAuthorId: data.pubmedAuthorId || "",
                        pubmedLastSync: data.pubmedLastSync || "",
                        stats: {
                            views: String(data.stats?.views || 0),
                            followers: String(data.stats?.followers || 0),
                            following: String(data.stats?.following || 0),
                            publications: String(data.stats?.publications || 0)
                        },
                        verificationStatus: data.verificationStatus || {}
                    }));
                    setInitialEmail(data.socialLinks?.email || (isOwnProfile ? user?.email : "") || "");
                    setExpertise(data.interests || []);
                    fetchArticles(0, data.userId);

                    if (!isOwnProfile && data.userId) {
                        try {
                            const relationshipStatus = await followService.getRelationshipStatus(data.userId);
                            setIsFollowing(relationshipStatus === "FOLLOWING");
                        } catch (e) {
                            console.error("Failed to check relationship status", e);
                        }
                    }
                }
            } catch (error: any) {
                console.error("Failed to fetch profile", error);
                if (error.response?.status !== 404) {
                    toast.error("Failed to load profile data");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user, urlUserId, username, isOwnProfile]);

    const fetchArticles = async (pageNo: number, targetUserId?: string) => {
        try {
            setArticleLoading(true);
            let data;
            const effectiveUserId = targetUserId || urlUserId;

            if (isOwnProfile) {
                data = await articleService.getMyArticles(pageNo, pageSize);
            } else if (effectiveUserId) {
                data = await articleService.getUserArticles(effectiveUserId, pageNo, pageSize);
            }

            if (data) {
                setArticles(data.content);
                setTotalPages(data.totalPages);
                setTotalElements(data.totalElements);
                setPage(pageNo);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load articles");
        } finally {
            setArticleLoading(false);
        }
    };

    const handleFetchPubMed = () => {
        setIsPubMedSearchOpen(true);
    };

    // Article Handlers
    const handleDeleteClick = (id: number) => {
        setDeleteId(id);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await articleService.deleteArticle(deleteId);
            toast.success("Article deleted successfully");
            fetchArticles(page); // Refresh current page
            setDeleteId(null);
        } catch (error) {
            console.error("Failed to delete article", error);
            toast.error("Failed to delete article");
        }
    };

    const handleToggleSelection = (id: number, selected: boolean) => {
        if (selected) {
            setSelectedArticles(prev => [...prev, id]);
        } else {
            setSelectedArticles(prev => prev.filter(aId => aId !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedArticles.length === 0) return;
        try {
            await articleService.deleteArticlesBulk(selectedArticles);
            toast.success(`${selectedArticles.length} articles deleted successfully`);
            fetchArticles(page);
            setSelectedArticles([]);
            setIsSelectionMode(false);
            setIsBulkDeleteModalOpen(false);
        } catch (error) {
            console.error("Failed to delete articles", error);
            toast.error("Failed to delete articles");
        }
    };

    const validateField = (field: string, value: string) => {
        let error = "";
        const mandatoryFields = ['name', 'institution', 'country', 'department', 'title', 'bio', 'email'];

        if (mandatoryFields.includes(field) && !value.trim()) {
            error = "This field is mandatory.";
        } else if (!value && !mandatoryFields.includes(field)) {
            setValidationErrors(prev => ({ ...prev, [field]: "" }));
            return "";
        }

        switch (field) {
            case 'scholar':
                if (value && !isValidUrl(value)) error = "Invalid URL format.";
                else if (value && !isValidScholarUrl(value)) error = "Must be a scholar.google.com or google.com/citations link.";
                break;
            case 'linkedin':
                if (value && !isValidUrl(value)) error = "Invalid URL format.";
                else if (value && !isValidLinkedinUrl(value)) error = "Must be a valid LinkedIn profile URL.";
                break;
            case 'website':
                if (value && !isValidUrl(value)) error = "Invalid Website URL.";
                break;
            case 'email':
                if (value) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) error = "Invalid email address format.";
                }
                break;
        }

        setValidationErrors(prev => ({ ...prev, [field]: error }));
        return error;
    };

    // Handlers
    const handleInputChange = (field: string, value: string) => {
        setProfile(prev => ({ ...prev, [field]: value }));

        if (field === 'department') {
            setDeptSearch(value);
            setShowDeptDropdown(true);
        }
    };

    const handleSocialChange = (field: string, value: string) => {
        setProfile(prev => ({
            ...prev,
            socials: { ...prev.socials, [field]: value }
        }));
        if (isEditing) validateField(field, value);
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setSaving(true);
            const response = await profileService.uploadAvatar(file);
            setProfile(prev => ({ ...prev, avatar: response.avatarUrl }));
            toast.success("Avatar updated successfully!");
        } catch (error) {
            console.error("Failed to upload avatar", error);
            toast.error("Failed to upload image. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAvatar = async () => {
        try {
            setSaving(true);
            await profileService.deleteAvatar();
            setProfile(prev => ({ ...prev, avatar: undefined }));
            toast.success("Avatar removed successfully!");
        } catch (error) {
            console.error("Failed to delete avatar", error);
            toast.error("Failed to remove avatar. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleRequestEmailVerification = async () => {
        if (validationErrors.email) {
            toast.error("Please enter a valid email first.");
            return;
        }
        if (!profile.socials.email) {
            toast.error("Please enter an email address.");
            return;
        }

        try {
            setEmailVerifyingLoading(true);
            await profileService.requestEmailOtp(profile.socials.email);
            setEmailOtpSent(true);
            setVerifyingEmail(true);
            toast.success(`OTP sent to ${profile.socials.email}`);
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
            await profileService.verifyEmailOtp(emailOtp);
            setProfile(prev => ({
                ...prev,
                verificationStatus: { ...prev.verificationStatus, email: 'VERIFIED' }
            }));
            setVerifyingEmail(false);
            setEmailOtpSent(false);
            setEmailOtp("");
            toast.success("Email verified successfully!");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Invalid or expired OTP");
        } finally {
            setEmailVerifyingLoading(false);
        }
    };

    // Expertise Handlers
    const toggleInterest = (domain: string) => {
        const newInterests = expertise.includes(domain)
            ? expertise.filter(i => i !== domain)
            : [...expertise, domain];

        if (newInterests.length > 15) {
            toast.error("Maximum 15 research interests allowed.");
            return;
        }
        setExpertise(newInterests);
    };

    const removeTag = (tagToRemove: string) => {
        setExpertise(expertise.filter(tag => tag !== tagToRemove));
    };

    const getVerificationBadge = (field: string) => {
        const val = profile.socials[field as keyof typeof profile.socials] || "";
        const status = profile.verificationStatus?.[field];

        if (!val) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-100/50 text-gray-400 text-[9px] font-black uppercase tracking-widest border border-gray-100">
                    Not Connected
                </span>
            );
        }

        switch (status) {
            case 'VERIFIED':
            case 'VALID':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100/50">
                        <span className="material-symbols-outlined text-[14px] filled">verified</span>
                        Verified
                    </span>
                );
            case 'PENDING':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest border border-amber-100/50">
                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                        Pending
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50/50 text-blue-600 text-[9px] font-black uppercase tracking-widest border border-blue-100/50">
                        <span className="material-symbols-outlined text-[12px] filled">link</span>
                        Connected
                    </span>
                );
        }
    };

    const handleSave = async () => {
        // Check for validation errors
        if (Object.values(validationErrors).some(err => err !== "")) {
            toast.error("Please fix the validation errors before saving.");
            return;
        }

        if (!profile.name?.trim() || !profile.socials.email?.trim() || !profile.institution?.trim() || !profile.country?.trim() || !profile.department?.trim() || !profile.title?.trim() || !profile.bio?.trim()) {
            toast.error("Please fill in all mandatory fields (Email is mandatory)");
            return;
        }

        if (profile.socials.email !== initialEmail && profile.verificationStatus?.email !== 'VERIFIED') {
            toast.error("Please verify your new contact email before saving.");
            return;
        }

        try {
            setSaving(true);
            await profileService.updateMyProfile({
                name: profile.name,
                title: profile.title,
                institution: profile.institution,
                country: profile.country,
                role: profile.role,
                department: profile.department,
                bio: profile.bio,
                interests: expertise,
                socialLinks: {
                    orcid: profile.socials.orcid,
                    scholar: profile.socials.scholar,
                    linkedin: profile.socials.linkedin,
                    website: profile.socials.website,
                    email: profile.socials.email
                }
            });
            toast.success("Profile saved successfully!");
            setInitialEmail(profile.socials.email); // Update initial email after successful save
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save profile", error);
            toast.error("Failed to save changes. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleShare = () => {
        setShowShareModal(true);
    };

    const handleFollowStatusChange = async () => {
        if (!profile.userId) return;
        try {
            // Re-fetch profile stats to reflect changes
            const data = await profileService.getProfile(profile.userId);
            if (data && data.stats) {
                setProfile(prev => ({
                    ...prev,
                    stats: {
                        ...prev.stats,
                        followers: String(data.stats.followers || 0),
                        following: String(data.stats.following || 0),
                        publications: String(data.stats.publications || 0)
                    }
                }));

                // Update local isFollowing state
                const relationshipStatus = await followService.getRelationshipStatus(profile.userId);
                setIsFollowing(relationshipStatus === "FOLLOWING");
            }
        } catch (error) {
            console.error("Failed to refresh profile after follow action", error);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f5c84b]"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-6 py-8">
            <PageTitle title={isOwnProfile ? "My Profile" : `${profile.name}'s Profile`} />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex flex-col">
                    {!isOwnProfile && (
                        <div className="flex items-center gap-4 mb-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-2xl text-[#1f1b2a] hover:bg-gray-50 transition shadow-sm font-bold text-sm"
                            >
                                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                                Back
                            </button>
                            <div className="h-4 w-px bg-gray-300" />
                            <span className="text-sm font-medium text-[#8a8396]">Viewing Public Profile</span>
                        </div>
                    )}
                    <h1 className="text-3xl md:text-4xl font-black text-[#1f1b2a] tracking-tight">
                        {isOwnProfile ? "My Profile" : `${profile.name}'s Profile`}
                    </h1>
                    <p className="text-[#6e6189] text-sm md:text-base mt-2 font-medium">
                        {isOwnProfile ? "Manage your public researcher identity and affiliations." : `Viewing ${profile.name}'s professional research profile.`}
                    </p>
                </div>

                <div className="flex gap-3">
                    {isOwnProfile && (
                        !isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-8 h-12 rounded-2xl bg-[#f5c84b] text-[#1f1b2a] font-bold text-sm hover:bg-[#f4b82a] transition-all shadow-lg shadow-[#f5c84b]/20 flex items-center gap-2 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[20px]">edit_square</span>
                                EDIT PROFILE
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-6 h-12 rounded-2xl border border-[#e8e4f0] bg-white text-[#6e6189] font-bold text-sm hover:bg-[#faf9f7] transition active:scale-95"
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-6 h-12 rounded-2xl bg-[#f5c84b] text-[#1f1b2a] font-bold text-sm hover:bg-[#f4b82a] transition-all shadow-lg shadow-[#f5c84b]/20 flex items-center gap-2 disabled:opacity-70 active:scale-95"
                                >
                                    {saving ? (
                                        <span className="w-4 h-4 border-2 border-[#1f1b2a] border-t-transparent rounded-full animate-spin"></span>
                                    ) : (
                                        <span className="material-symbols-outlined text-[20px]">save</span>
                                    )}
                                    SAVE CHANGES
                                </button>
                            </div>
                        )
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Sidebar - Profile Card */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-[#e8e4f0] p-8 shadow-sm sticky top-6 text-center hover:shadow-2xl hover:shadow-[#1f1b2a]/5 hover:-translate-y-1 transition-all duration-500 group/card bg-gradient-to-b from-white to-[#fafafa]">
                        <div className="flex flex-col items-center text-center">
                            {/* Avatar Section */}
                            <div className="relative mb-6 group">
                                <div className={`w-36 h-36 rounded-full p-1.5 border-2 ${isEditing ? 'border-dashed border-[#f5c84b]' : 'border-[#e8e4f0]'} overflow-hidden relative transition-all duration-300 group-hover/card:scale-105 group-hover/card:rotate-1`}>
                                    {profile.avatar ? (
                                        <img
                                            src={profile.avatar}
                                            alt="Profile"
                                            className="w-full h-full rounded-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-gradient-to-br from-[#f0f0f0] to-[#e8e4f0] flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[#8a8396] text-6xl transition-transform duration-500 group-hover/card:scale-125">person</span>
                                        </div>
                                    )}
                                    {isOwnProfile && isEditing && (
                                        <div
                                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                            onClick={() => document.getElementById('avatar-upload')?.click()}
                                        >
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {isOwnProfile && isEditing && (
                                    <>
                                        <input
                                            type="file"
                                            id="avatar-upload"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleAvatarChange}
                                        />
                                        {profile.avatar && (
                                            <button
                                                onClick={handleDeleteAvatar}
                                                className="absolute -top-1 -right-1 w-9 h-9 bg-white border border-[#ffcfcf] text-red-500 rounded-full shadow-lg hover:bg-red-50 hover:scale-110 transition flex items-center justify-center z-10"
                                                title="Remove Photo"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        )}
                                        {/* Camera Icon Mini Badge */}
                                        <button
                                            onClick={() => document.getElementById('avatar-upload')?.click()}
                                            className="absolute bottom-2 -right-1 w-10 h-10 bg-[#f5c84b] text-[#1f1b2a] border-4 border-white rounded-full shadow-lg hover:scale-110 transition flex items-center justify-center z-10"
                                            title="Upload Photo"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <h2 className="text-xl font-black text-[#1f1b2a] mb-1 leading-tight">{profile.name}</h2>
                        <p className="text-xs text-[#8a8396] font-bold uppercase tracking-wider mb-2">
                            {profile.title}
                        </p>
                        <p className="text-sm text-[#6e6189] mb-4 bg-[#faf8f5] inline-block px-3 py-1 rounded-lg">@{profile.displayName}</p>

                        <div className="inline-block px-4 py-1.5 rounded-xl bg-[#fffcf0] border border-[#f5c84b]/20 text-[10px] uppercase font-black text-[#b58c14] tracking-widest mb-8">
                            {profile.department || "RESEARCHER"}
                        </div>

                        {!isOwnProfile && profile.userId && (
                            <div className="flex gap-2 mb-8">
                                <FollowButton
                                    userId={profile.userId}
                                    className="flex-1 h-11"
                                    onStatusChange={handleFollowStatusChange}
                                />
                                <button
                                    onClick={handleShare}
                                    className="w-11 h-11 rounded-xl border border-[#e8e4f0] bg-white text-[#1f1b2a] hover:bg-[#faf9f7] transition-all flex items-center justify-center active:scale-95 shadow-sm"
                                    title="Share Profile"
                                >
                                    <span className="material-symbols-outlined text-[20px]">share</span>
                                </button>
                            </div>
                        )}

                        {isOwnProfile && (
                            <div className="mb-8">
                                <button
                                    onClick={handleShare}
                                    className="w-full h-12 rounded-xl border-2 border-[#e8e4f0] bg-white text-[#1f1b2a] font-bold text-xs hover:border-[#f5c84b]/50 hover:bg-[#fffcf0] transition-all flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[18px]">share</span>
                                    SHARE PROFILE
                                </button>
                            </div>
                        )}

                        {/* Unified Stats Component */}
                        <div className="w-full bg-[#faf8f5] border border-[#e8e4f0] rounded-[2rem] p-5 flex flex-col gap-4 group/stats hover:border-[#f5c84b]/30 hover:bg-white transition-all duration-300 shadow-inner">
                            {/* Publications - Anchored Stat */}
                            <div className="flex flex-col items-center justify-center pb-4 border-b border-[#e8e4f0] cursor-default group-hover/stats:border-[#f5c84b]/10 transition-colors">
                                <div className="text-3xl font-black text-[#1f1b2a] tracking-tight group-hover/stats:scale-110 transition-transform">{profile.stats.publications}</div>
                                <div className="text-[10px] text-[#8a8396] font-black uppercase tracking-[0.2em] mt-1">Publications</div>
                            </div>

                            {/* Social Metrics - Followers & Following */}
                            <div className="grid grid-cols-2 gap-2">
                                <div
                                    onClick={() => navigate('/network?tab=followers')}
                                    className="flex flex-col items-center justify-center cursor-pointer group/followers py-1"
                                >
                                    <div className="text-xl font-black text-[#1f1b2a] group-hover/followers:text-[#f5c84b] transition-all transform group-hover/followers:scale-110">{profile.stats.followers}</div>
                                    <div className="text-[9px] text-[#8a8396] font-black uppercase tracking-widest mt-1">Followers</div>
                                </div>
                                <div
                                    onClick={() => navigate('/network?tab=following')}
                                    className="flex flex-col items-center justify-center cursor-pointer group/following py-1 border-l border-[#e8e4f0]"
                                >
                                    <div className="text-xl font-black text-[#1f1b2a] group-hover/following:text-[#f5c84b] transition-all transform group-hover/following:scale-110">{profile.stats.following}</div>
                                    <div className="text-[9px] text-[#8a8396] font-black uppercase tracking-widest mt-1">Following</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Content */}
                <div className="lg:col-span-9 space-y-6">
                    {/* Personal Information */}
                    <div className="bg-white rounded-3xl border border-[#e8e4f0] p-8 md:p-10 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#f5c84b]" />
                        <div className="flex items-center gap-3 mb-8">
                            <span className="material-symbols-outlined text-[#f5c84b] text-[24px]">badge</span>
                            <h3 className="font-black text-[#1f1b2a] text-xs uppercase tracking-[0.2em]">Personal Information</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                            {/* Full Name */}
                            <div className="col-span-full">
                                <label className="block text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em] mb-2.5">
                                    Full Name <span className="text-rose-500">*</span>
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={profile.name}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                        className="w-full h-14 px-5 rounded-xl bg-[#faf8f5] border border-[#e8e4f0] text-sm font-bold text-[#1f1b2a] focus:outline-none focus:border-[#f5c84b] focus:bg-white transition"
                                    />
                                ) : (
                                    <div className="text-lg font-bold text-[#1f1b2a] px-1">{profile.name}</div>
                                )}
                            </div>

                            {/* Username Row */}
                            <div className="col-span-full">
                                <label className="block text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em] mb-2.5">Username</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={"@" + profile.displayName}
                                        disabled
                                        className="w-full h-14 px-5 rounded-xl bg-[#faf8f5] border border-[#e8e4f0] text-sm text-[#6e6189] font-bold cursor-not-allowed"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-[#fff8e1] text-[#f5c84b] text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-[#f5c84b]/10">
                                        <span className="material-symbols-outlined text-[14px]">lock</span>
                                        Fixed
                                    </div>
                                </div>
                            </div>

                            {/* Two-Column Grid Info */}
                            <div>
                                <label className="block text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em] mb-2.5">
                                    Country <span className="text-rose-500">*</span>
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={profile.country}
                                        onChange={(e) => handleInputChange('country', e.target.value)}
                                        className="w-full h-14 px-5 rounded-xl bg-[#faf8f5] border border-[#e8e4f0] text-sm font-bold text-[#1f1b2a] focus:outline-none focus:border-[#f5c84b] transition"
                                    />
                                ) : (
                                    <div className="text-base font-bold text-[#1f1b2a] px-1">{profile.country || <span className="text-[#8a8396] italic">Not set</span>}</div>
                                )}
                            </div>

                            <div className="relative" ref={deptRef}>
                                <label className="block text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em] mb-2.5">
                                    Department <span className="text-rose-500">*</span>
                                </label>
                                {isEditing ? (
                                    <>
                                        <input
                                            type="text"
                                            value={profile.department}
                                            onChange={(e) => handleInputChange('department', e.target.value)}
                                            onFocus={() => setShowDeptDropdown(true)}
                                            className="w-full h-14 px-5 rounded-xl bg-[#faf8f5] border border-[#e8e4f0] text-sm font-bold text-[#1f1b2a] focus:outline-none focus:border-[#f5c84b] transition"
                                            placeholder="Search department..."
                                        />
                                        {showDeptDropdown && (
                                            <div className="absolute z-[60] mt-1 w-full bg-white border border-[#e8e4f0] rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                                {departmentsList
                                                    .filter(d => d.toLowerCase().includes(deptSearch.toLowerCase()))
                                                    .map((dept) => (
                                                        <button
                                                            key={dept}
                                                            type="button"
                                                            onClick={() => {
                                                                handleInputChange('department', dept);
                                                                setShowDeptDropdown(false);
                                                            }}
                                                            className="w-full px-4 py-3 text-left text-sm hover:bg-[#faf9f7] text-[#6e6189] hover:text-[#1f1b2a] transition border-b border-[#faf8f5]"
                                                        >
                                                            {dept}
                                                        </button>
                                                    ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-base font-bold text-[#1f1b2a] px-1">{profile.department || <span className="text-[#8a8396] italic">Not set</span>}</div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em] mb-2.5">
                                    Institution <span className="text-rose-500">*</span>
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={profile.institution}
                                        onChange={(e) => handleInputChange('institution', e.target.value)}
                                        className="w-full h-14 px-5 rounded-xl bg-[#faf8f5] border border-[#e8e4f0] text-sm font-bold text-[#1f1b2a] focus:outline-none focus:border-[#f5c84b] transition"
                                    />
                                ) : (
                                    <div className="flex items-center gap-2 text-base font-bold text-[#1f1b2a] px-1">
                                        <span className="material-symbols-outlined text-[#8a8396] text-[20px]">domain</span>
                                        {profile.institution || <span className="text-[#8a8396] italic">Not set</span>}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em] mb-2.5">
                                    Title / Position <span className="text-rose-500">*</span>
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={profile.title}
                                        onChange={(e) => handleInputChange('title', e.target.value)}
                                        className="w-full h-14 px-5 rounded-xl bg-[#faf8f5] border border-[#e8e4f0] text-sm font-bold text-[#1f1b2a] focus:outline-none focus:border-[#f5c84b] transition"
                                    />
                                ) : (
                                    <div className="text-base font-bold text-[#1f1b2a] px-1">{profile.title || <span className="text-[#8a8396] italic">Not set</span>}</div>
                                )}
                            </div>

                            {/* Bio */}
                            <div className="col-span-full border-t border-[#e8e4f0]/60 pt-8">
                                <label className="block text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em] mb-2.5">
                                    Bio <span className="text-rose-500">*</span>
                                </label>
                                {isEditing ? (
                                    <textarea
                                        value={profile.bio}
                                        onChange={(e) => handleInputChange('bio', e.target.value)}
                                        rows={4}
                                        className="w-full p-5 rounded-xl bg-[#faf8f5] border border-[#e8e4f0] text-sm font-bold text-[#1f1b2a] focus:outline-none focus:border-[#f5c84b] transition leading-relaxed"
                                    />
                                ) : (
                                    <div className="text-base font-bold text-[#1f1b2a] leading-relaxed whitespace-pre-wrap px-1">
                                        {profile.bio || <span className="text-[#8a8396] italic">No bio provided.</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Expertise Section - Enhanced */}
                    <div className="bg-white rounded-3xl border border-[#e8e4f0] p-8 md:p-10 shadow-sm relative overflow-visible">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#f5c84b]" />
                        <h3 className="font-black text-[#1f1b2a] text-xl mb-8 tracking-tight">Expertise & Skills</h3>

                        <div className="relative" ref={interestsRef}>
                            <label className="block text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em] mb-3">Research Interests</label>

                            {/* Display Tags */}
                            <div
                                className={`w-full min-h-[60px] p-4 rounded-xl border transition-all flex flex-wrap gap-2 ${isEditing
                                    ? 'bg-[#faf8f5] border-[#e8e4f0] focus-within:border-[#f5c84b] cursor-text'
                                    : 'bg-transparent border-transparent px-0'}`}
                                onClick={() => isEditing && setShowInterestsDropdown(true)}
                            >
                                {expertise.length === 0 ? (
                                    isEditing ? <span className="text-[#8a8396] text-sm italic">Add research interests...</span> : <span className="text-[#8a8396] text-sm italic">No interests listed.</span>
                                ) : (
                                    expertise.map((tag, idx) => (
                                        <span key={idx} className="animate-in zoom-in duration-200 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#fff9e6] border border-[#f5c84b]/30 text-xs font-bold text-[#1f1b2a] shadow-sm">
                                            {tag}
                                            {isEditing && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                                                    className="w-4 h-4 rounded-full hover:bg-[#f5c84b]/20 flex items-center justify-center text-[#b58c14] transition"
                                                >
                                                    <span className="material-symbols-outlined text-[12px]">close</span>
                                                </button>
                                            )}
                                        </span>
                                    ))
                                )}
                            </div>

                            {/* Dropdown for Adding - Only in Edit Mode */}
                            {isEditing && showInterestsDropdown && (
                                <div className="absolute z-50 mt-2 w-full bg-white border border-[#e8e4f0] rounded-xl shadow-2xl max-h-72 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2">
                                    <div className="p-3 border-b border-[#faf8f5] bg-white sticky top-0">
                                        <input
                                            type="text"
                                            placeholder="Search or type custom interest..."
                                            className="w-full px-4 py-2.5 bg-[#faf8f5] border border-[#e8e4f0] rounded-lg focus:border-[#f5c84b] outline-none text-sm font-medium"
                                            value={interestSearch}
                                            onChange={(e) => setInterestSearch(e.target.value)}
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && interestSearch.trim()) {
                                                    e.preventDefault();
                                                    if (!expertise.includes(interestSearch.trim())) {
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
                                                    className={`w-full px-4 py-3 flex items-center justify-between text-left text-sm hover:bg-[#faf9f7] transition ${expertise.includes(domain)
                                                        ? 'bg-[#fff9e6] text-[#1f1b2a] font-bold'
                                                        : 'text-[#6e6189] font-medium'
                                                        }`}
                                                >
                                                    {domain}
                                                    {expertise.includes(domain) && (
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
                                                className="w-full px-4 py-3 text-left text-sm text-[#f5c84b] font-bold border-t border-[#faf8f5] hover:bg-[#fffcf0]"
                                            >
                                                Add custom: "{interestSearch}"
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {isEditing && (
                                <p className="text-[10px] text-[#8a8396] font-bold mt-2 uppercase tracking-widest text-right">
                                    Max 15 Interests
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Academic IDs */}
                    <div className="bg-white rounded-3xl border border-[#e8e4f0] p-8 md:p-10 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#f5c84b]" />
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[#f5c84b] text-[24px]">school</span>
                                <h3 className="font-black text-[#1f1b2a] text-xs uppercase tracking-[0.2em]">Academic IDs & Links</h3>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* ORCID */}
                            <div>
                                <div className="flex items-center justify-between mb-2.5">
                                    <label className="block text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em]">ORCID iD</label>
                                    {getVerificationBadge('orcid')}
                                </div>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        autoComplete="off"
                                        value={profile.socials.orcid}
                                        onChange={(e) => handleSocialChange('orcid', e.target.value)}
                                        placeholder="0000-0000-0000-0000"
                                        className="w-full h-12 px-5 rounded-xl bg-[#faf8f5] border border-[#e8e4f0] text-sm font-bold text-[#1f1b2a] focus:outline-none focus:border-[#f5c84b] transition"
                                    />
                                ) : (
                                    <div className="h-12 flex items-center px-5 rounded-xl bg-[#faf8f5] border border-[#e8e4f0] text-sm font-bold text-[#1f1b2a]">
                                        <span>{profile.socials.orcid || <span className="text-[#8a8396] italic">Not Connected</span>}</span>
                                    </div>
                                )}
                            </div>

                            {/* Google Scholar */}
                            <div>
                                <div className="flex items-center justify-between mb-2.5">
                                    <label className="block text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em]">Google Scholar</label>
                                    {getVerificationBadge('scholar')}
                                </div>
                                {isEditing ? (
                                    <div className="flex flex-col gap-1 w-full">
                                        <input
                                            type="text"
                                            autoComplete="off"
                                            value={profile.socials.scholar}
                                            onChange={(e) => handleSocialChange('scholar', e.target.value)}
                                            onBlur={(e) => {
                                                const formatted = formatUrl(e.target.value);
                                                handleSocialChange('scholar', formatted);
                                            }}
                                            placeholder="Scholar Profile URL"
                                            className={`w-full h-12 px-5 rounded-xl bg-[#faf8f5] border text-sm font-bold text-[#1f1b2a] focus:outline-none focus:border-[#f5c84b] transition ${validationErrors.scholar ? 'border-rose-500 bg-rose-50/10' : 'border-[#e8e4f0]'}`}
                                        />
                                        {validationErrors.scholar && <span className="text-[10px] text-rose-500 font-bold">{validationErrors.scholar}</span>}
                                    </div>
                                ) : (
                                    <div className="h-12 flex items-center px-5 rounded-xl bg-[#faf8f5] border border-[#e8e4f0] text-sm font-bold text-[#1f1b2a]">
                                        {profile.socials.scholar ? (
                                            <a href={profile.socials.scholar} target="_blank" rel="noreferrer" className="hover:text-[#f5c84b] transition underline decoration-dotted underline-offset-4">
                                                {profile.socials.scholar}
                                            </a>
                                        ) : <span className="text-[#8a8396] italic">Not Connected</span>}
                                    </div>
                                )}
                            </div>

                            {/* LinkedIn */}
                            <div>
                                <div className="flex items-center justify-between mb-2.5">
                                    <label className="block text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em]">LinkedIn</label>
                                    {getVerificationBadge('linkedin')}
                                </div>
                                {isEditing ? (
                                    <div className="flex flex-col gap-1 w-full">
                                        <input
                                            type="text"
                                            autoComplete="off"
                                            value={profile.socials.linkedin}
                                            onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                                            onBlur={(e) => {
                                                const formatted = formatUrl(e.target.value);
                                                handleSocialChange('linkedin', formatted);
                                            }}
                                            placeholder="linkedin.com/in/username"
                                            className={`w-full h-12 px-5 rounded-xl bg-[#faf8f5] border text-sm font-bold text-[#1f1b2a] focus:outline-none focus:border-[#f5c84b] transition ${validationErrors.linkedin ? 'border-rose-500 bg-rose-50/10' : 'border-[#e8e4f0]'}`}
                                        />
                                        {validationErrors.linkedin && <span className="text-[10px] text-rose-500 font-bold">{validationErrors.linkedin}</span>}
                                    </div>
                                ) : (
                                    <div className="h-12 flex items-center px-5 rounded-xl bg-[#faf8f5] border border-[#e8e4f0] text-sm font-bold text-[#1f1b2a]">
                                        {profile.socials.linkedin ? (
                                            <a href={profile.socials.linkedin} target="_blank" rel="noreferrer" className="hover:text-[#f5c84b] transition underline decoration-dotted underline-offset-4">
                                                {profile.socials.linkedin}
                                            </a>
                                        ) : <span className="text-[#8a8396] italic">Not Connected</span>}
                                    </div>
                                )}
                            </div>

                            {/* Email */}
                            <div>
                                <div className="flex items-center justify-between mb-2.5">
                                    <label className="block text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em]">
                                        Contact Email <span className="text-rose-500">*</span>
                                    </label>
                                    {getVerificationBadge('email')}
                                </div>
                                {isEditing ? (
                                    <div className="flex flex-col gap-2 w-full">
                                        <div className="relative">
                                            <input
                                                type="email"
                                                autoComplete="off"
                                                value={profile.socials.email}
                                                onChange={(e) => handleSocialChange('email', e.target.value)}
                                                placeholder="email@example.com"
                                                className={`w-full h-12 px-5 rounded-xl bg-[#faf8f5] border text-sm font-bold text-[#1f1b2a] focus:outline-none focus:border-[#f5c84b] transition ${validationErrors.email ? 'border-rose-500 bg-rose-50/10' : 'border-[#e8e4f0]'}`}
                                            />
                                            {isOwnProfile && profile.socials.email && profile.verificationStatus?.email !== 'VERIFIED' && !verifyingEmail && profile.socials.email !== initialEmail && (
                                                <button
                                                    onClick={handleRequestEmailVerification}
                                                    disabled={emailVerifyingLoading}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#fff8e1] text-[#f5c84b] text-[10px] font-black uppercase tracking-widest rounded-lg border border-[#f5c84b]/10 hover:bg-[#f5c84b] hover:text-white transition active:scale-95 disabled:opacity-50"
                                                >
                                                    {emailVerifyingLoading ? 'Sending...' : 'Verify'}
                                                </button>
                                            )}
                                        </div>
                                        {verifyingEmail && (
                                            <div className="flex gap-2 animate-in slide-in-from-top-2">
                                                <input
                                                    type="text"
                                                    maxLength={6}
                                                    placeholder="Enter 6-digit OTP"
                                                    value={emailOtp}
                                                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                                                    className="flex-1 h-12 px-5 rounded-xl bg-white border border-[#f5c84b] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-[#f5c84b]/10 transition"
                                                />
                                                <button
                                                    onClick={handleVerifyEmail}
                                                    disabled={emailVerifyingLoading || emailOtp.length !== 6}
                                                    className="px-5 h-12 bg-[#f5c84b] text-[#1f1b2a] font-bold text-xs rounded-xl hover:bg-[#f4b82a] transition disabled:opacity-50"
                                                >
                                                    {emailVerifyingLoading ? '...' : 'CONFIRM'}
                                                </button>
                                                <button
                                                    onClick={() => { setVerifyingEmail(false); setEmailOtp(""); }}
                                                    className="w-12 h-12 rounded-xl border border-[#e8e4f0] text-[#8a8396] hover:bg-gray-50 flex items-center justify-center transition"
                                                >
                                                    <span className="material-symbols-outlined">close</span>
                                                </button>
                                            </div>
                                        )}
                                        {validationErrors.email && <span className="text-[10px] text-rose-500 font-bold">{validationErrors.email}</span>}
                                    </div>
                                ) : (
                                    <div className="h-12 flex items-center px-5 rounded-xl bg-[#faf8f5] border border-[#e8e4f0] text-sm font-bold text-[#1f1b2a]">
                                        {profile.socials.email || <span className="text-[#8a8396] italic">Not Connected</span>}
                                    </div>
                                )}
                            </div>

                            {/* Website */}
                            <div className="md:col-span-2">
                                <div className="flex items-center justify-between mb-2.5">
                                    <label className="block text-[10px] font-black text-[#8a8396] uppercase tracking-[0.2em]">Personal Website</label>
                                    {getVerificationBadge('website')}
                                </div>
                                {isEditing ? (
                                    <div className="flex flex-col gap-1 w-full">
                                        <input
                                            type="text"
                                            value={profile.socials.website}
                                            onChange={(e) => handleSocialChange('website', e.target.value)}
                                            onBlur={(e) => {
                                                const formatted = formatUrl(e.target.value);
                                                handleSocialChange('website', formatted);
                                            }}
                                            placeholder="https://example.com"
                                            autoComplete="off"
                                            className={`w-full h-12 px-5 rounded-xl bg-[#faf8f5] border text-sm font-bold text-[#1f1b2a] focus:outline-none focus:border-[#f5c84b] transition ${validationErrors.website ? 'border-rose-500 bg-rose-50/10' : 'border-[#e8e4f0]'}`}
                                        />
                                        {validationErrors.website && <span className="text-[10px] text-rose-500 font-bold">{validationErrors.website}</span>}
                                    </div>
                                ) : (
                                    <div className="h-12 flex items-center px-5 rounded-xl bg-[#faf8f5] border border-[#e8e4f0] text-sm font-bold text-[#1f1b2a]">
                                        {profile.socials.website ? (
                                            <a href={profile.socials.website} target="_blank" rel="noreferrer" className="hover:text-[#f5c84b] transition underline decoration-dotted underline-offset-4">
                                                {profile.socials.website}
                                            </a>
                                        ) : <span className="text-[#8a8396] italic">Not Connected</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Published Articles Section */}
                    <div className="bg-white rounded-3xl border border-[#e8e4f0] p-8 md:p-10 shadow-sm relative overflow-visible">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#f5c84b]" />
                        <div className="flex justify-between items-center mb-10">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[#f5c84b] text-[24px]">article</span>
                                <h3 className="font-black text-[#1f1b2a] text-xs uppercase tracking-[0.2em]">Published Articles</h3>
                            </div>
                            {isOwnProfile && isEditing && (
                                <div className="flex gap-2">
                                    {!isSelectionMode ? (
                                        <>
                                            {articles.length > 0 && (
                                                <button
                                                    onClick={() => setIsSelectionMode(true)}
                                                    className="px-6 h-12 bg-white border border-[#e8e4f0] text-[#6e6189] font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition flex items-center gap-2 active:scale-95"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">checklist</span>
                                                    Select
                                                </button>
                                            )}
                                            {isEditing && (
                                                <button
                                                    onClick={handleFetchPubMed}
                                                    className="px-6 h-12 bg-[#f5c84b] text-[#1f1b2a] font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-[#f4b82a] transition shadow-xl shadow-[#f5c84b]/10 flex items-center gap-2 active:scale-95 group"
                                                >
                                                    <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">add</span>
                                                    Add Article
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => { setIsSelectionMode(false); setSelectedArticles([]); }}
                                                className="px-6 h-12 bg-white border border-[#e8e4f0] text-[#6e6189] font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition flex items-center gap-2 active:scale-95"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => setIsBulkDeleteModalOpen(true)}
                                                disabled={selectedArticles.length === 0}
                                                className="px-6 h-12 bg-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-rose-700 transition shadow-xl shadow-rose-200 flex items-center gap-2 active:scale-95 disabled:opacity-50"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                                Delete ({selectedArticles.length})
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Article List */}
                        {articles.length === 0 ? (
                            <div className="text-center py-16 bg-[#faf8f5] rounded-3xl border border-[#e8e4f0] border-dashed">
                                <div className="w-20 h-20 bg-white rounded-full border border-[#e8e4f0] flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-4xl text-[#d1d5db]">article</span>
                                </div>
                                <p className="text-[#1f1b2a] font-bold text-lg mb-1">No articles added yet</p>
                                <p className="text-[#8a8396] text-sm mb-6 max-w-xs mx-auto">Build your academic portfolio by adding your published research.</p>
                                {isOwnProfile && (
                                    <button onClick={handleFetchPubMed} className="text-[#f5c84b] font-bold text-sm hover:underline">
                                        Import from PubMed
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {articles.filter(a => a.confirmed !== false).map(article => (
                                    <ArticleCard
                                        key={article.id}
                                        article={article}
                                        isOwner={isOwnProfile && isEditing}
                                        onDelete={handleDeleteClick}
                                        isSelectionMode={isSelectionMode}
                                        isSelected={selectedArticles.includes(article.id!)}
                                        onSelect={handleToggleSelection}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center mt-8 pt-6 border-t border-[#f5f5f5]">
                                <button
                                    onClick={() => fetchArticles(page - 1)}
                                    disabled={page === 0}
                                    className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[#6e6189] bg-[#faf8f5] rounded-xl disabled:opacity-50 hover:bg-[#f3f4f6] transition flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                    Prev
                                </button>
                                <span className="text-xs font-bold text-[#1f1b2a] bg-[#faf8f5] px-4 py-2 rounded-lg">
                                    Page {page + 1} of {totalPages}
                                </span>
                                <button
                                    onClick={() => fetchArticles(page + 1)}
                                    disabled={page === totalPages - 1}
                                    className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[#6e6189] bg-[#faf8f5] rounded-xl disabled:opacity-50 hover:bg-[#f3f4f6] transition flex items-center gap-2"
                                >
                                    Next
                                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <ConfirmationModal
                    isOpen={!!deleteId}
                    onClose={() => setDeleteId(null)}
                    onConfirm={handleConfirmDelete}
                    title="Delete Article"
                    message="Are you sure you want to delete this article? This action cannot be undone."
                    confirmText="Delete"
                    type="danger"
                />

                <ConfirmationModal
                    isOpen={isBulkDeleteModalOpen}
                    onClose={() => setIsBulkDeleteModalOpen(false)}
                    onConfirm={handleBulkDelete}
                    title="Delete Multiple Articles"
                    message={`Are you sure you want to delete ${selectedArticles.length} articles? This action cannot be undone.`}
                    confirmText="Delete Selected"
                    type="danger"
                />

                {/* Share Profile Modal */}
                {showShareModal && createPortal(
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300 px-4" onClick={() => setShowShareModal(false)}>
                        <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-[#e8e4f0] relative overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-[#1f1b2a] tracking-tight">Share Profile</h3>
                                <button
                                    onClick={() => setShowShareModal(false)}
                                    className="w-10 h-10 rounded-full hover:bg-[#faf9f7] flex items-center justify-center text-[#8a8396] transition"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <p className="text-[#6e6189] text-sm mb-6 font-medium">
                                Share this researcher's profile with your network or colleagues.
                            </p>

                            <div className="bg-[#faf9f7] border border-[#e8e4f0] rounded-2xl p-4 mb-8 flex items-center gap-3">
                                <span className="material-symbols-outlined text-[#8a8396] text-[20px]">link</span>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-xs font-bold text-[#1f1b2a] truncate">{`${window.location.origin}/u/${profile.displayName}`}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/u/${profile.displayName}`);
                                        toast.success("Link copied!");
                                    }}
                                    className="px-4 py-2 bg-[#f5c84b] text-[#1f1b2a] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#f4b82a] transition active:scale-95"
                                >
                                    Copy
                                </button>
                            </div>

                            <button
                                onClick={() => setShowShareModal(false)}
                                className="w-full h-14 rounded-2xl bg-[#1f1b2a] text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-[#1f1b2a]/20 hover:bg-[#2d273a] transition-all active:scale-[0.98]"
                            >
                                Done
                            </button>
                        </div>
                    </div>,
                    document.body
                )}

                <PubMedSearchModal
                    isOpen={isPubMedSearchOpen}
                    onClose={() => setIsPubMedSearchOpen(false)}
                    onArticlesAdded={() => fetchArticles(0)}
                />
            </div>
        </div>
    );
};

export default MyProfilePage;
