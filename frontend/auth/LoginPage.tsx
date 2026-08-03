import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../src/services/api";
import { useAuth } from "../src/context/AuthContext";
import { toast } from "sonner";
import PageTitle from "../src/components/PageTitle";

type LoginPageProps = {
  onCreateAccount?: () => void;
  onForgotPassword?: () => void;
  onLogin?: () => void;
  onGoBack?: () => void;
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login: authLogin, setIsNewSignup } = useAuth();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    if (errorParam) {
      toast.error(errorParam);
      setError(errorParam);
    }
  }, []);

  const handleGoogleLogin = () => {
    try {
      // Redirect to Spring Boot Backend OAuth2 endpoint
      window.location.href = "http://localhost:8080/oauth2/authorization/google";
    } catch (err) {
      toast.error("Failed to connect to Google Login");
      console.error("Login redirect error:", err);
    }
  };

  const handleORCIDLogin = () => {
    window.location.href = "http://localhost:8080/oauth2/authorization/orcid";
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/api/auth/login", { email, password });

      const { token: newToken, session_token, needsOnboarding, status } = response.data;

      if (status === "OTP_REQUIRED") {
        toast.info("Security verification required. Please check your email for OTP.");
        navigate(`/verify-otp?email=${encodeURIComponent(email)}&type=LOGIN`);
        return;
      }

      if (needsOnboarding && session_token) {
        sessionStorage.setItem('onboarding_session_token', session_token);
        toast.info("Please complete your profile setup.");
        navigate('/onboarding');
        return;
      }

      setIsNewSignup(false);
      await authLogin(newToken);

      toast.success("Logged in successfully!");
      navigate('/home');
    } catch (err: any) {
      if (err.response?.status === 403 && err.response?.data?.includes("verify your email")) {
        toast.info("Your email is not verified. Redirecting to verification page...");
        navigate(`/verify-otp?email=${encodeURIComponent(email)}&type=REGISTRATION`);
        return;
      }
      const errorMessage = err.response?.data?.message || err.response?.data || "Invalid credentials. Please try again.";
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageTitle title="Login" />
      <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-[0_18px_40px_-28px_rgba(30,20,60,0.6)] border border-[#e6e0f0]">
        <div className="p-6 sm:p-8 flex flex-col gap-6">
          {/* Heading */}
          <div>
            <p className="text-[32px] font-bold leading-tight">Welcome back</p>
            <p className="text-[#6e6189] text-sm">
              Log in to access your research profile and publications.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleManualLogin} className="flex flex-col gap-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                <span className="material-symbols-outlined text-base">error</span>
                {error}
              </div>
            )}
            {/* Email */}
            <label className="flex flex-col">
              <span className="pb-2 font-medium">Email address</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@institution.edu"
                className="h-14 rounded-xl border border-[#dedbe6] bg-white px-4 text-[15px] placeholder:text-[#a098b2] focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>

            {/* Password */}
            <label className="flex flex-col">
              <span className="pb-2 font-medium">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-14 w-full rounded-xl border border-[#dedbe6] bg-white px-4 pr-12 text-[15px] placeholder:text-[#a098b2] focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-[#6e6189] hover:text-[#3c2e59]"
                >
                  {showPassword ? "visibility" : "visibility_off"}
                </span>
              </div>
              <div className="text-right pt-2">
                <Link
                  to="/forgot-password"
                  className="text-sm text-brand-blue hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </label>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="h-14 bg-primary text-white font-semibold rounded-xl shadow-[0_10px_18px_-12px_rgba(246,195,67,0.9)] hover:bg-[#f4b82a] transition flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Log In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-grow border-t border-[#eee9f4]" />
            <span className="text-[11px] uppercase tracking-[0.24em] text-[#7a6f92]">
              Or continue with
            </span>
            <div className="flex-grow border-t border-[#eee9f4]" />
          </div>

          {/* Social Logins */}
          <button
            onClick={handleGoogleLogin}
            className="h-14 flex items-center justify-center gap-3 border border-[#e6e0f0] rounded-xl text-sm font-semibold hover:bg-[#faf8fd] transition"
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



          {/* Footer */}
          <p className="text-center text-sm text-[#6e6189]">
            New to References?{" "}
            <Link
              to="/signup"
              className="font-semibold text-brand-blue hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
