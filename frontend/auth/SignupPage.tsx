import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../src/services/api";
import { useAuth } from "../src/context/AuthContext";
import { toast } from "sonner";
import PageTitle from "../src/components/PageTitle";

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  // const { login, setIsNewSignup } = useAuth(); // Unused

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validation States
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [isEmailTaken, setIsEmailTaken] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0); // 0-4 scale

  // Email Format Validation
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email) {
      setEmailValid(emailRegex.test(email));
    } else {
      setEmailValid(null);
    }
  }, [email]);

  // Reset "Email Taken" error when user changes email
  useEffect(() => {
    if (isEmailTaken) setIsEmailTaken(false);
  }, [email]);

  // Password Strength Logic
  useEffect(() => {
    let score = 0;
    if (password.length > 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    setPasswordStrength(score);
  }, [password]);

  const checkEmailAvailability = async () => {
    if (!email || !emailValid) return;
    setCheckingEmail(true);
    try {
      const response = await api.get(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
      // API returns available: boolean
      if (response.data && response.data.available === false) {
        setIsEmailTaken(true);
        // Toast is optional here, the inline error is better
      }
    } catch (err) {
      console.error("Failed to check email availability", err);
    } finally {
      setCheckingEmail(false);
    }
  };

  const getStrengthLabel = () => {
    switch (passwordStrength) {
      case 0: return { label: "", color: "bg-gray-200" };
      case 1: return { label: "Weak", color: "bg-red-400" };
      case 2: return { label: "Fair", color: "bg-orange-400" };
      case 3: return { label: "Good", color: "bg-yellow-400" };
      case 4: return { label: "Strong", color: "bg-green-500" };
      default: return { label: "", color: "bg-gray-200" };
    }
  };

  const strength = getStrengthLabel();

  const handleGoogleSignup = () => {
    try {
      window.location.href = "http://localhost:8080/oauth2/authorization/google";
    } catch (err) {
      toast.error("Failed to connect to Google Signup");
    }
  };

  const handleORCIDSignup = () => {
    window.location.href = "http://localhost:8080/oauth2/authorization/orcid";
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || passwordStrength < 2 || isEmailTaken) {
      if (isEmailTaken) toast.error("Email is already registered. Please login.");
      else toast.warning("Please ensure email is valid and password is strong enough.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/api/auth/signup", {
        fullName,
        email,
        password
      });

      // Save partial auth data to hold until registration is complete
      sessionStorage.setItem('pending_registration', JSON.stringify({
        fullName,
        email,
        password
      }));

      toast.success("OTP sent to your email!");
      navigate(`/verify-otp?email=${encodeURIComponent(email)}&type=REGISTRATION`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#f8f7f4] font-sans text-[#1a1a1a] antialiased overflow-x-hidden items-center justify-center py-12">
      <PageTitle title="Create Account" />
      <div className="w-full max-w-[480px] bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

        {/* Header Section */}
        <div className="pt-10 pb-6 text-center px-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-[#1a1a1a]">
            Join References
          </h1>
          <p className="text-[#6e6e6e] text-[15px]">
            Connect with researchers and track publications.
          </p>
        </div>

        {/* Social Buttons */}
        <div className="px-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleGoogleSignup}
            className="flex h-12 items-center justify-center gap-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all font-semibold text-[#333] text-[15px]"
          >
            <span className="inline-flex w-5 h-5">
              <svg viewBox="0 0 48 48" className="w-full h-full">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
            </span>
            Continue with Google
          </button>


        </div>

        {/* Divider */}
        <div className="px-8 py-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-[11px] uppercase text-gray-400 tracking-wider font-semibold">
            Or continue with email
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="px-8 flex flex-col gap-5 pb-8">
          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[14px] font-semibold text-[#1a1a1a]">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Marie Curie"
              className="h-[50px] rounded-xl border border-gray-200 bg-white px-4 text-[15px] placeholder:text-gray-400 focus:border-[#f5c84b] focus:ring-2 focus:ring-[#f5c84b]/20 outline-none transition-all"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[14px] font-semibold text-[#1a1a1a]">Institutional Email</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={checkEmailAvailability}
                placeholder="name@university.edu"
                className={`h-[50px] w-full rounded-xl border ${(emailValid === false || isEmailTaken)
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                  : 'border-gray-200 focus:border-[#f5c84b] focus:ring-[#f5c84b]/20'
                  } bg-white px-4 pr-10 text-[15px] placeholder:text-gray-400 outline-none transition-all`}
              />
              {checkingEmail && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
              )}
              {!checkingEmail && emailValid && !isEmailTaken && (
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-[20px]">
                  check_circle
                </span>
              )}
              {!checkingEmail && isEmailTaken && (
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-red-500 text-[20px]" title="Email already taken">
                  error
                </span>
              )}
            </div>
            {isEmailTaken && (
              <p className="text-[13px] font-medium text-red-500 mt-1 animate-in fade-in slide-in-from-top-1">
                This email is already associated with an account. <Link to="/login" className="underline hover:text-red-600">Log in instead?</Link>
              </p>
            )}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[14px] font-semibold text-[#1a1a1a]">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="h-[50px] w-full rounded-xl border border-gray-200 bg-white px-4 pr-12 text-[15px] placeholder:text-gray-400 focus:border-[#f5c84b] focus:ring-2 focus:ring-[#f5c84b]/20 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 h-full px-4 text-gray-400 hover:text-[#1a1a1a] transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>

            {/* Strength Meter */}
            {password && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${(passwordStrength / 4) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-500 min-w-[40px] text-right">{strength.label}</span>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="h-[52px] mt-2 rounded-xl bg-[#f5c84b] text-[#1a1a1a] font-bold text-[16px] hover:bg-[#f4b82a] hover:-translate-y-0.5 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin"></div>
            ) : "Create Account"}
          </button>
        </form>

        {/* Footer */}
        <div className="bg-[#faf9f7] py-5 text-center border-t border-gray-100">
          <p className="text-[15px] text-[#6e6e6e]">
            Already have an account?
            <Link
              to="/login"
              className="ml-1.5 font-bold text-[#bfa04d] hover:text-[#9e843d] hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>

      {/* Legal */}
      <div className="mt-8 px-4 text-center max-w-sm mx-auto">
        <p className="text-[13px] leading-relaxed text-[#9ca3af]">
          By clicking &quot;Create Account&quot;, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
