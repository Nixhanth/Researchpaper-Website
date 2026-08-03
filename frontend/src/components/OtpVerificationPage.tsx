import React, { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PageTitle from "./PageTitle";
import { useAuth } from "../context/AuthContext";

interface OtpVerificationPageProps {
    email: string;
    onSuccess: (token: string) => void;
    onCancel: () => void;
    purpose?: "REGISTRATION" | "FORGOT_PASSWORD" | "LOGIN";
}

const OtpVerificationPage: React.FC<OtpVerificationPageProps> = ({
    email: initialEmail,
    onSuccess,
    onCancel,
    purpose = "REGISTRATION"
}) => {
    // Try to get email from URL or props
    const urlParams = new URLSearchParams(window.location.search);
    const email = initialEmail || urlParams.get("email") || "";
    const type = purpose || urlParams.get("type") || "REGISTRATION";

    const { login, setSessionToken } = useAuth();
    const navigate = useNavigate();

    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [timer, setTimer] = useState(60);
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        let interval: any;
        if (timer > 0) {
            interval = setInterval(() => setTimer(prev => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleChange = (element: HTMLInputElement, index: number) => {
        if (isNaN(Number(element.value))) return false;

        setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

        if (element.nextSibling && element.value !== "" && index < 5) {
            (element.nextSibling as HTMLInputElement).focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleSuccessNavigation = (token?: string) => {
        if (type === "LOGIN") {
            navigate("/home");
            return;
        }
        if (type === "FORGOT_PASSWORD") {
            navigate("/login?reset=success");
            return;
        }
        onSuccess(token || "");
    };

    const handleCancel = () => {
        if (type === "LOGIN") {
            navigate("/login");
        } else if (type === "FORGOT_PASSWORD") {
            navigate("/login");
        } else {
            onCancel();
        }
    };

    const handleVerify = async () => {
        const fullOtp = otp.join("");
        if (fullOtp.length < 6) {
            toast.error("Please enter the full 6-digit OTP.");
            return;
        }

        try {
            let endpoint = "";
            if (type === "FORGOT_PASSWORD") {
                endpoint = "/api/auth/verify-forgot-password-otp";
            } else if (type === "LOGIN") {
                endpoint = "/api/auth/verify-login-otp";
            } else {
                endpoint = "/api/auth/verify-email";
            }

            const response = await api.post(endpoint, {
                email,
                otp: fullOtp
            });

            toast.success("Verification successful!");

            if (type === "REGISTRATION") {
                // For new signups, handle session_token
                const { session_token, token } = response.data;

                if (session_token) {
                    sessionStorage.setItem('onboarding_session_token', session_token);
                    setSessionToken(session_token);
                    handleSuccessNavigation(session_token);
                } else if (token) {
                    await login(token);
                    handleSuccessNavigation(token);
                } else {
                    handleSuccessNavigation("");
                }
            } else if (type === "LOGIN") {
                if (response.data.token) {
                    await login(response.data.token);
                    handleSuccessNavigation(response.data.token);
                }
            } else {
                if (response.data.token) {
                    await login(response.data.token);
                }
                handleSuccessNavigation(response.data.token || "");
            }
        } catch (err: any) {
            toast.error(err.response?.data || "Verification failed. Check your OTP.");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (timer > 0) return;
        setResendLoading(true);
        try {
            await api.post(`/api/auth/resend-otp?email=${email}&type=${type}`);
            toast.success("New OTP sent to your email.");
            setTimer(60);
        } catch (err) {
            toast.error("Failed to resend OTP.");
        } finally {
            setResendLoading(false);
        }
    };

    if (!email) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#faf9f7]">
                <p className="text-gray-500 mb-4">No email provided for verification.</p>
                <button onClick={handleCancel} className="text-[#f5c84b] font-bold hover:underline">Go Back</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#faf9f7] animate-in fade-in duration-500">
            <PageTitle title="Verify Email | References" />

            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 border border-gray-100 flex flex-col items-center">
                <div className="w-16 h-16 bg-[#fff9e6] rounded-2xl flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-[#f5c84b] text-3xl">mark_email_unread</span>
                </div>

                <h1 className="text-2xl font-black text-[#1f1b2a] mb-2">
                    {type === "LOGIN" ? "Verify Login" : "Check your email"}
                </h1>
                <p className="text-center text-sm text-[#8a8396] font-medium mb-8 leading-relaxed">
                    We've sent a 6-digit verification code to <br />
                    <span className="text-[#1f1b2a] font-bold">{email}</span>
                </p>

                <div className="flex gap-3 mb-8">
                    {otp.map((data, index) => (
                        <input
                            key={index}
                            type="text"
                            maxLength={1}
                            value={data}
                            ref={el => { inputs.current[index] = el; }}
                            onChange={e => handleChange(e.target, index)}
                            onKeyDown={e => handleKeyDown(e, index)}
                            className="w-12 h-14 border-2 border-gray-100 rounded-xl bg-gray-50 text-center text-xl font-black focus:border-[#f5c84b] focus:bg-white focus:ring-4 focus:ring-[#f5c84b]/10 outline-none transition-all"
                        />
                    ))}
                </div>

                <button
                    onClick={handleVerify}
                    disabled={loading}
                    className="w-full h-12 bg-[#f5c84b] text-[#1f1b2a] font-bold rounded-xl shadow-lg shadow-[#f5c84b]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center mb-6"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-[#1f1b2a] border-t-transparent rounded-full animate-spin"></div>
                    ) : (type === "LOGIN" ? "Verify & Login" : "Verify Account")}
                </button>

                <div className="text-center">
                    <p className="text-xs text-[#8a8396] font-bold uppercase tracking-widest mb-2">Didn't receive code?</p>
                    <button
                        onClick={handleResend}
                        disabled={timer > 0 || resendLoading}
                        className={`text-sm font-black ${timer > 0 ? 'text-gray-300' : 'text-[#f5c84b] hover:text-[#e4b93b] hover:underline'} transition-colors`}
                    >
                        {resendLoading ? "Sending..." : timer > 0 ? `Resend code in ${timer}s` : "Resend code"}
                    </button>
                </div>
            </div>

            <button
                onClick={handleCancel}
                className="mt-8 flex items-center gap-2 text-[#8a8396] font-bold text-sm hover:text-[#1f1b2a] transition-colors"
            >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                {type === "LOGIN" ? "Back to login" : "Back to signup"}
            </button>
        </div>
    );
};

export default OtpVerificationPage;
