import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";

// Layouts
import AuthLayout from "./layouts/AuthLayout";
import DashboardLayout from "./layouts/DashboardLayout";

// App Pages (Outside src)
const HomeFeedPage = React.lazy(() => import("../app/home/HomeFeedPage"));
const MyProfilePage = React.lazy(() => import("../app/profile/MyProfilePage"));
const ActivityPage = React.lazy(() => import("../app/activity/ActivityPage"));
const NetworkPage = React.lazy(() => import("../app/network/NetworkPage"));
const NotificationsPage = React.lazy(() => import("../app/notifications/NotificationsPage"));
const PostDetailPage = React.lazy(() => import("../app/home/PostDetailPage"));
const SettingsPage = React.lazy(() => import("../app/settings/SettingsPage"));

// Components (Inside src)
import OAuthCallback from "./components/OAuthCallback";
const OtpVerificationPage = React.lazy(() => import("./components/OtpVerificationPage"));
const OnboardingWizard = React.lazy(() => import("./components/OnboardingWizard"));
const LandingPage = React.lazy(() => import("./landing/LandingPage"));
const BrowsePage = React.lazy(() => import("./landing/BrowsePage"));
import NotFoundPage from "./components/NotFoundPage";
import ErrorBoundary from "./components/ErrorBoundary";
import ScaleManager from "./components/ScaleManager";
import AccountSuspendedPage from "./components/AccountSuspendedPage";
import AccountDisabledPage from "./components/AccountDisabledPage";

import { useAuth } from "./context/AuthContext";

// Auth Pages (Outside src)
const LoginPage = React.lazy(() => import("../auth/LoginPage"));
const SignupPage = React.lazy(() => import("../auth/SignupPage"));
const ForgotPasswordPage = React.lazy(() => import("../auth/ForgotPasswordPage"));

// Admin Pages
const AdminLayout = React.lazy(() => import("../app/admin/AdminLayout"));
const AdminLogin = React.lazy(() => import("../app/admin/AdminLogin"));
const AdminDashboard = React.lazy(() => import("../app/admin/AdminDashboard"));
const UserManagement = React.lazy(() => import("../app/admin/UserManagement"));
const ProfileAlertsPage = React.lazy(() => import("../app/admin/ProfileAlertsPage"));
const AdminAuditLogs = React.lazy(() => import("../app/admin/AuditLogs"));

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, profileCompleted, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#faf9f7]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#f5c84b] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#6e6189] font-medium animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Allow access to onboarding for new signups who haven't created the account yet
    const hasPendingReg = sessionStorage.getItem('pending_registration');
    if (hasPendingReg && location.pathname === "/onboarding") {
      return children;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated but profile not completed, we allow them to reach the dashboard
  // where a ProfileCompletionModal will prompt them.
  // We only redirect if they are specifically trying to reach sensitive pages if needed,
  // but for now, let's allow them to reach the home/dashboard.
  if (!profileCompleted && location.pathname === "/onboarding") {
    // Already on onboarding, allow it
    return children;
  }

  // If authenticated and profile completed, don't allow /onboarding
  if (profileCompleted && location.pathname === "/onboarding") {
    return <Navigate to="/home" replace />;
  }

  return children;
};

const PublicOnlyRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, profileCompleted, loading } = useAuth();

  if (loading) return null;

  if (isAuthenticated) {
    if (!profileCompleted) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/home" replace />;
  }

  return children;
};

const AppRoutes = () => {
  const navigate = useNavigate();

  return (
    <ErrorBoundary>
      <React.Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#faf9f7]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#f5c84b] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[#6e6189] font-medium animate-pulse">Loading Application...</p>
          </div>
        </div>
      }>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={
            <PublicOnlyRoute>
              <LandingPage
                onLogin={() => navigate('/login')}
                onSignup={() => navigate('/signup')}
                onBrowse={(q) => navigate(q ? `/browse?q=${encodeURIComponent(q)}` : '/browse')}
              />
            </PublicOnlyRoute>
          } />
          <Route path="/browse" element={<BrowsePage onBack={() => navigate('/')} onLogin={() => navigate('/login')} />} />

          {/* Auth Routes (Wrapped in Layout) */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            } />
            <Route path="/signup" element={
              <PublicOnlyRoute>
                <SignupPage />
              </PublicOnlyRoute>
            } />
            <Route path="/forgot-password" element={
              <ForgotPasswordPage
                onGoToLogin={() => navigate('/login')}
                onGoToSignup={() => navigate('/signup')}
              />
            } />
          </Route>

          <Route path="/verify-otp" element={<OtpVerificationPage email="" onSuccess={() => navigate('/onboarding')} onCancel={() => navigate('/')} />} />
          <Route path="/oauth/callback" element={<OAuthCallback onFinish={() => navigate('/home')} />} />
          <Route path="/account-suspended" element={<AccountSuspendedPage />} />
          <Route path="/account-disabled" element={<AccountDisabledPage />} />

          {/* Protected Onboarding */}
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <OnboardingWizard onComplete={() => navigate('/home')} />
            </ProtectedRoute>
          } />

          {/* Protected Dashboard Routes */}
          <Route element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route path="/home" element={<HomeFeedPage />} />
            <Route path="/profile" element={<MyProfilePage />} />
            <Route path="/profile/:userId" element={<MyProfilePage />} />
            <Route path="/u/:username" element={<MyProfilePage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/network" element={<NetworkPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/post/:postId" element={<PostDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Admin Routes - Isolated */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="profile-alerts" element={<ProfileAlertsPage />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </React.Suspense>
    </ErrorBoundary>
  );
}

const App = () => {
  return (
    <BrowserRouter>
      {/* Global Scaling Manager for UI density */}
      <ScaleManager />
      {/* Global Toaster for Notifications */}
      <Toaster position="bottom-right" richColors />
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;
