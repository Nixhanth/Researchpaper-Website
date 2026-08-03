import React, { useState, useEffect } from "react";
import api from "../src/services/api";
import { toast } from "sonner";

type ForgotPasswordPageProps = {
  onGoToLogin?: () => void;
  onGoToSignup?: () => void;
};

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onGoToLogin,
}) => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"EMAIL" | "OTP" | "RESET">("EMAIL");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  // Email masking function: ni****@gmail.com
  const maskEmail = (email: string) => {
    if (!email) return "";
    const [name, domain] = email.split("@");
    if (name.length <= 2) return `${name}****@${domain}`;
    return `${name.substring(0, 2)}****@${domain}`;
  };

  // Timer logic for resend delay
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/api/auth/forgot-password?email=${email}`);
      toast.success("OTP sent to your email!");
      setStep("OTP");
      setTimer(30); // 30s resend delay
    } catch (err: any) {
      toast.error(err.response?.data || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;
    setLoading(true);
    try {
      await api.post(`/api/auth/forgot-password?email=${email}`);
      toast.success("A new OTP has been sent to your email.");
      setTimer(30);
    } catch (err: any) {
      toast.error("Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otp.join("");
    if (fullOtp.length < 6) {
      toast.error("Please enter the full 6-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/verify-reset-otp", {
        email,
        otp: fullOtp
      });
      toast.success("OTP verified!");
      setStep("RESET");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data || "Invalid OTP.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", {
        email,
        otp: otp.join(""),
        newPassword
      });
      toast.success("Password reset successfully!");
      onGoToLogin?.();
    } catch (err: any) {
      toast.error(err.response?.data || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (val: string, index: number) => {
    if (isNaN(Number(val))) return;
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className="w-full h-full font-sans text-[#1f1b2a] flex flex-col relative">
      {/* Decorative background elements for depth */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#f5c84b]/5 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#bfa04d]/5 rounded-full blur-[120px] pointer-events-none" />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 relative z-10">
        <div className="w-full max-w-[480px] animate-in fade-in slide-in-from-bottom-12 duration-1000">
          <div className="bg-white/80 backdrop-blur-2xl rounded-[3rem] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.08)] border border-white p-8 sm:p-14 relative group overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#f5c84b] via-[#fcd34d] to-[#bfa04d] opacity-90" />

            {/* Context-aware iconography */}
            <div className="text-center mb-12">
              <div className="w-24 h-24 bg-gradient-to-tr from-[#fff9e6] to-[#fffbe6] rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-[0_12px_30px_-10px_rgba(245,200,75,0.4)] transition-all duration-700 hover:scale-105 group-hover:rotate-3">
                <span className="material-symbols-outlined text-[#f5c84b] text-5xl font-light leading-none">
                  {step === "EMAIL" ? "account_circle" : step === "OTP" ? "alternate_email" : "lock_open"}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-[#1f1b2a] tracking-tight mb-4">
                {step === "EMAIL" ? "Lost Key?" : step === "OTP" ? "Auth Code" : "New Secure Key"}
              </h1>
              <p className="text-[#8a8396] text-[15px] sm:text-base font-medium leading-relaxed max-w-[320px] mx-auto opacity-80">
                {step === "EMAIL"
                  ? "Enter your research email address to recover access."
                  : step === "OTP"
                    ? `A unique code has been dispatched to ${maskEmail(email)}`
                    : "Create a sophisticated password to safeguard your research data."}
              </p>
            </div>

            <div className="space-y-8">
              {step === "EMAIL" && (
                <form className="space-y-8" onSubmit={handleSendOtp}>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-[#bfa04d] uppercase tracking-[0.25em] ml-1">Email Terminal</label>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-[20px] text-gray-300 group-focus-within/input:text-[#f5c84b] transition-colors">mail</span>
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="academic@institution.edu"
                        className="w-full h-16 pl-14 pr-6 rounded-2xl bg-[#faf9f7] border border-[#e8e4f0] text-[15px] font-bold focus:outline-none focus:ring-[6px] focus:ring-[#f5c84b]/10 focus:border-[#f5c84b]/40 focus:bg-white transition-all placeholder:text-gray-300 placeholder:font-medium"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full h-16 bg-[#f5c84b] text-[#1f1b2a] font-black rounded-2xl shadow-[0_15px_35px_-10px_rgba(245,200,75,0.4)] hover:shadow-[0_20px_45px_-5px_rgba(245,200,75,0.5)] hover:bg-[#e4b93b] hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-40 disabled:hover:translate-y-0 flex items-center justify-center gap-3"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span className="text-[16px]">Send Reset Code</span>
                        <span className="material-symbols-outlined text-[22px]">arrow_forward</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {step === "OTP" && (
                <form className="space-y-12" onSubmit={handleVerifyOtp}>
                  <div className="flex justify-between items-center gap-2.5 sm:gap-4">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-${i}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(e.target.value, i)}
                        onKeyDown={(e) => handleKeyDown(e, i)}
                        className="w-[14.5%] aspect-square border-2 border-[#e8e4f0] rounded-2xl bg-[#faf9f7] text-center text-2xl sm:text-3xl font-black text-[#1f1b2a] focus:border-[#f5c84b] focus:bg-white focus:ring-[8px] focus:ring-[#f5c84b]/10 outline-none transition-all shadow-sm"
                      />
                    ))}
                  </div>

                  <div className="space-y-8">
                    <button
                      type="submit"
                      disabled={loading || otp.join("").length < 6}
                      className="w-full h-16 bg-[#f5c84b] text-[#1f1b2a] font-black rounded-2xl shadow-xl hover:bg-[#e4b93b] hover:-translate-y-1 transition-all disabled:opacity-30 disabled:hover:translate-y-0 flex items-center justify-center"
                    >
                      {loading ? <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" /> : "Verify & Continue"}
                    </button>

                    <div className="flex flex-col items-center gap-6">
                      <div className="flex items-center gap-3">
                        <div className={`h-1 flex-1 min-w-[40px] ${timer > 0 ? 'bg-gray-100' : 'bg-[#fff9e6]'} rounded-full overflow-hidden`}>
                          {timer > 0 && <div className="h-full bg-[#f5c84b]/30 animate-[shrink_30s_linear]" style={{ width: `${(timer / 30) * 100}%` }} />}
                        </div>
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={timer > 0 || loading}
                          className={`text-xs font-black uppercase tracking-[0.2em] transition-all px-6 py-3 rounded-xl ${timer > 0 ? 'text-gray-300 cursor-not-allowed bg-gray-50' : 'text-[#f5c84b] hover:bg-[#fff9e6] active:scale-95'}`}
                        >
                          {timer > 0 ? `Retry in ${timer}s` : "Resend code"}
                        </button>
                        <div className={`h-1 flex-1 min-w-[40px] ${timer > 0 ? 'bg-gray-100' : 'bg-[#fff9e6]'} rounded-full`} />
                      </div>

                      <button
                        type="button"
                        onClick={() => setStep("EMAIL")}
                        className="group text-[12px] font-bold text-[#8a8396] hover:text-[#1f1b2a] flex items-center gap-2 transition-all p-2 rounded-lg hover:bg-gray-50"
                      >
                        <span className="material-symbols-outlined text-[18px] group-hover:rotate-12 transition-transform">edit_note</span>
                        Edit linked email address
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {step === "RESET" && (
                <form className="space-y-10" onSubmit={handleResetPassword}>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-[#bfa04d] uppercase tracking-widest ml-1">New Researcher Key</label>
                      <div className="relative group/key">
                        <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within/key:text-[#f5c84b] transition-colors">key</span>
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min. 8 sophisticated chars"
                          className="w-full h-16 pl-14 pr-6 rounded-2xl bg-[#faf9f7] border border-[#e8e4f0] text-[15px] font-bold focus:outline-none focus:ring-[6px] focus:ring-[#f5c84b]/10 transition-all focus:bg-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-[#bfa04d] uppercase tracking-widest ml-1">Verify Key Match</label>
                      <div className="relative group/verify">
                        <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within/verify:text-green-500 transition-colors">security</span>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm your key"
                          className={`w-full h-16 pl-14 pr-6 rounded-2xl bg-[#faf9f7] border text-[15px] font-bold focus:outline-none focus:ring-[6px] focus:ring-[#f5c84b]/10 transition-all focus:bg-white ${newPassword && confirmPassword && newPassword === confirmPassword ? 'border-green-200' : 'border-[#e8e4f0]'}`}
                        />
                        {newPassword && confirmPassword && newPassword === confirmPassword && (
                          <div className="absolute right-5 top-1/2 -translate-y-1/2 text-green-500 animate-in zoom-in spin-in-90 duration-500">
                            <span className="material-symbols-outlined text-[24px]">verified_user</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !newPassword || newPassword !== confirmPassword}
                    className="w-full h-16 bg-[#f5c84b] text-[#1f1b2a] font-black rounded-2xl shadow-[0_20px_40px_-10px_rgba(245,200,75,0.3)] hover:shadow-[0_25px_50px_-10px_rgba(245,200,75,0.4)] hover:bg-[#e4b93b] hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-3"
                  >
                    {loading ? <div className="w-6 h-6 border-3 border-[#1f1b2a]/20 border-t-[#1f1b2a] rounded-full animate-spin" /> : (
                      <>
                        <span className="text-[16px]">Establish New Key</span>
                        <span className="material-symbols-outlined text-[22px]">security_update_good</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Premium Footer */}
            <div className="p-8 sm:p-10 mt-12 mb-[-3.5rem] mx-[-3.5rem] bg-[#faf9f7]/80 border-t border-gray-100 flex flex-col items-center">
              <p className="text-sm font-bold text-[#8a8396]">
                Recalled your security key?
              </p>
              <button
                onClick={onGoToLogin}
                className="mt-3 px-8 py-2.5 text-[#bfa04d] hover:text-[#1f1b2a] text-sm font-black border-2 border-transparent hover:border-[#f5c84b]/20 rounded-full transition-all"
              >
                Log in securely
              </button>
            </div>
          </div>


        </div>
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}} />
    </div>
  );
};

export default ForgotPasswordPage;
