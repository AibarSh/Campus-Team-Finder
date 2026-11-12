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
  return (
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
}