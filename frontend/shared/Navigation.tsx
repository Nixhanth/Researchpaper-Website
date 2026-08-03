import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../src/context/AuthContext";
import { useNotification } from "../src/context/NotificationContext";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import clsx from "clsx";

const Navigation: React.FC = () => {
    const { user, logout } = useAuth();
    const { unreadCount } = useNotification();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const isViewingOtherProfile = (pathname.startsWith('/profile/') || pathname.startsWith('/u/') || pathname.startsWith('/post/')) &&
        !pathname.includes(user?.id || 'none') &&
        !pathname.includes('/u/' + (user?.displayName || 'none'));

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const navItems = [
        { path: "/home", icon: "home", label: "Home" },
        {
            path: "/profile",
            icon: "person",
            label: "My Profile",
            customActive: pathname === "/profile" || (pathname.startsWith("/profile/") && pathname.includes(user?.id || 'none'))
        },
        { path: "/activity", icon: "timeline", label: "Activity" },
        { path: "/network", icon: "group", label: "Network" },
        { path: "/notifications", icon: "notifications", label: "Notifications", badge: unreadCount }
    ];

    return (
        <nav className="w-[72px] lg:w-[260px] bg-white border-r border-[#e8e4f0] h-full flex flex-col relative">
            {/* Logo */}
            <div className="flex items-center gap-3 px-3 lg:px-4 py-4 mb-2 justify-center lg:justify-start border-b border-[#e8e4f0]">
                <div className="min-w-10 w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden border border-[#e8e4f0] shadow-sm">
                    <img src="/logo.png" alt="Logo" className="w-full h-full object-contain p-1" />
                </div>
                <div className="hidden lg:block">
                    <div className="font-bold text-base text-[#1f1b2a] tracking-tight">References</div>
                    <div className="text-[10px] text-[#f5c84b] font-semibold tracking-wider uppercase">Research Platform</div>
                </div>
            </div>

            {/* Back Button for Public Views */}
            {isViewingOtherProfile && (
                <button
                    onClick={() => navigate(-1)}
                    className="flex lg:hidden items-center justify-center mx-3 mb-2 h-12 rounded-xl bg-[#faf9f7] text-[#1f1b2a] border-l-4 border-[#f5c84b] font-medium"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
            )}

            {/* Navigation Items */}
            <div className="flex flex-col gap-1 px-3 lg:px-4 py-2 flex-1">
                {navItems.map((item) => {
                    const isActive = item.customActive !== undefined ? item.customActive : pathname === item.path;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={clsx(
                                "flex items-center gap-3 px-3 h-12 rounded-xl text-left group relative font-medium",
                                isActive
                                    ? "bg-[#faf9f7] text-[#1f1b2a] border-l-4 border-[#f5c84b]"
                                    : "text-[#6e6189] hover:bg-[#faf9f7] hover:text-[#1f1b2a] border-l-4 border-transparent"
                            )}
                        >
                            {({ isActive }) => (
                                <>
                                    <span className={clsx("material-symbols-outlined text-[22px]", isActive ? "font-filled" : "")}>
                                        {item.icon}
                                    </span>
                                    <span className="text-[14px] flex-1 hidden lg:block font-medium">{item.label}</span>
                                    {item.badge !== undefined && item.badge > 0 && (
                                        <span className="absolute top-2 right-2 lg:static lg:ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-[#f5c84b] text-[#1f1b2a] text-[11px] font-bold flex items-center justify-center border-2 border-white lg:border-none shadow-sm">
                                            {item.badge > 99 ? '99+' : item.badge}
                                        </span>
                                    )}

                                    {/* Tooltip for mobile */}
                                    <div className="absolute left-full ml-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 lg:group-hover:opacity-0 pointer-events-none whitespace-nowrap z-50">
                                        {item.label}
                                    </div>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </div>

            {/* User Profile at Bottom - Fixed & Sticky */}
            <div className="mt-auto border-t border-[#e8e4f0] bg-white sticky bottom-0 z-30">
                <div className="p-3 lg:px-4 lg:py-4 relative" ref={menuRef}>
                    {/* User Dropdown Menu - Refined */}
                    {showUserMenu && (
                        <div className="absolute bottom-[calc(100%-8px)] left-4 w-[calc(100%-32px)] lg:w-[220px] mb-2 bg-white rounded-2xl shadow-2xl border border-[#e8e4f0] py-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <div className="px-4 py-2 border-b border-[#faf8f5] mb-1">
                                <p className="text-[10px] font-black text-[#8a8396] uppercase tracking-widest">Account</p>
                            </div>
                            <button
                                onClick={() => {
                                    navigate("/profile");
                                    setShowUserMenu(false);
                                }}
                                className="w-full px-4 h-11 flex items-center gap-3 text-[13px] font-bold text-[#6e6189] hover:bg-[#faf8f5] hover:text-[#f5c84b] transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px]">account_circle</span>
                                My Profile
                            </button>
                            <button
                                onClick={() => {
                                    navigate("/settings");
                                    setShowUserMenu(false);
                                }}
                                className="w-full px-4 h-11 flex items-center gap-3 text-[13px] font-bold text-[#6e6189] hover:bg-[#faf8f5] hover:text-[#f5c84b] transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px]">settings</span>
                                Settings
                            </button>
                            <div className="h-px bg-[#f3f0f7] my-2 mx-3" />
                            <button
                                onClick={() => {
                                    handleLogout();
                                    setShowUserMenu(false);
                                }}
                                className="w-full px-4 h-11 flex items-center gap-3 text-[13px] font-bold text-[#ef4444] hover:bg-rose-50 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px]">logout</span>
                                Logout
                            </button>
                        </div>
                    )}

                    <div
                        className={clsx(
                            "flex items-center gap-3 px-2 lg:px-3 h-14 cursor-pointer group rounded-xl transition-all duration-200",
                            showUserMenu ? "bg-[#faf9f7]" : "hover:bg-[#faf9f7]"
                        )}
                        onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                        <div className="w-10 h-10 min-w-[40px] rounded-xl border-2 border-[#f5c84b]/20 group-hover:border-[#f5c84b] p-0.5 overflow-hidden transition-colors bg-white shadow-sm">
                            {user?.avatarUrl ? (
                                <img
                                    src={user.avatarUrl}
                                    alt="Profile"
                                    className="w-full h-full rounded-[10px] object-cover"
                                />
                            ) : (
                                <div className="w-full h-full rounded-[10px] bg-[#f8f9fa] flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#8a8396] text-xl">person</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0 hidden lg:block">
                            <div className="text-[13px] font-black text-[#1f1b2a] truncate leading-tight">{user?.fullName || 'Researcher'}</div>
                            <div className="text-[10px] font-bold text-[#f5c84b] uppercase tracking-tight truncate">View Account</div>
                        </div>
                        <div className="hidden lg:flex items-center text-[#8a8396] group-hover:text-[#1f1b2a] transition-colors">
                            <span className={clsx("material-symbols-outlined text-[20px] transition-transform duration-300", showUserMenu ? "rotate-180" : "")}>
                                keyboard_arrow_up
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navigation;
