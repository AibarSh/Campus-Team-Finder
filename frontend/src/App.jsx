// src/App.jsx
import { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { UserContext } from './context/UserContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BrowseTeamsPage from './pages/BrowseTeamsPage';
import TeamDetailsPage from './pages/TeamDetailsPage';
import MyApplicationsPage from './pages/MyApplicationsPage';
import MyTeamsPage from './pages/MyTeamsPage';
import ManageTeamPage from './pages/ManageTeamPage';
import { CreateTeamRoute } from './pages/CreateTeamWizard';
import OnboardingWizard from './pages/Onboarding/OnboardingWizard';
import ProfilePage from './pages/ProfilePage';
import Layout from './components/Layout';

// ---------------------------------------------------------------------------
// DEV ONLY: lets you open every screen without a backend or login.
// Enable with VITE_BYPASS_AUTH=true in frontend/.env.local (restart `npm run dev`).
// Set VITE_MOCK_PROFILE_COMPLETE=false to be redirected into /onboarding like a new user.
// `import.meta.env.DEV` is false in production builds, so this can never disable auth on Vercel.
// ---------------------------------------------------------------------------
const BYPASS_AUTH = import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === 'true';

const MOCK_CONTEXT = {
  user: {
    id: 'dev-user',
    email: 'dev@kbtu.kz',
    firstName: 'Aibar',
    lastName: 'Dev',
    profileComplete: import.meta.env.VITE_MOCK_PROFILE_COMPLETE !== 'false',
  },
  setUser: () => {},
  loading: false,
  refreshUser: async () => {},
};

function ProtectedRoute({ children, requireProfile = true }) {
  const { user, loading } = useContext(UserContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Auth Guard
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Profile Guard (Flow 3/4 enforcement)
  if (requireProfile && !user.profileComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

const withLayout = (element) => (
  <ProtectedRoute>
    <Layout>{element}</Layout>
  </ProtectedRoute>
);

export default function App() {
  const routes = (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute requireProfile={false}>
            <OnboardingWizard />
          </ProtectedRoute>
        }
      />
      <Route path="/dashboard" element={withLayout(<DashboardPage />)} />
      <Route path="/browse" element={withLayout(<BrowseTeamsPage />)} />
      <Route path="/teams/new" element={withLayout(<CreateTeamRoute />)} />
      <Route path="/teams/:id" element={withLayout(<TeamDetailsPage />)} />
      <Route path="/applications" element={withLayout(<MyApplicationsPage />)} />
      <Route path="/my-teams" element={withLayout(<MyTeamsPage />)} />
      <Route path="/teams/:id/manage" element={withLayout(<ManageTeamPage />)} />
      <Route path="/profile" element={withLayout(<ProfilePage />)} />
      <Route
        path="/profile/edit"
        element={
          <ProtectedRoute>
            <OnboardingWizard mode="edit" />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );

  // In bypass mode, this Provider sits closer to the routes than your real one,
  // so every useContext(UserContext) below receives the mock user.
  return BYPASS_AUTH ? <UserContext.Provider value={MOCK_CONTEXT}>{routes}</UserContext.Provider> : routes;
}