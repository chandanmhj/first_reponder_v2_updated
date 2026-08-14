import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import AppShell from "./components/AppShell";
import SessionExpiredModal from "./components/SessionExpiredModal";
import OfflineBanner from "./components/OfflineBanner";

import Splash from "./pages/Splash";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

import Scan from "./pages/nutriscan/Scan";
import NutriScanHistory from "./pages/nutriscan/History";
import DailySummary from "./pages/nutriscan/DailySummary";

import Chat from "./pages/firstresponder/Chat";
import FirstResponderHistory from "./pages/firstresponder/History";

function PublicOnly({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/home" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicOnly><Splash /></PublicOnly>} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/signup" element={<PublicOnly><SignUp /></PublicOnly>} />

      <Route element={<AppShell />}>
        <Route path="/home" element={<Home />} />
        <Route path="/nutriscan" element={<Scan />} />
        <Route path="/nutriscan/history" element={<NutriScanHistory />} />
        <Route path="/nutriscan/summary" element={<DailySummary />} />
        <Route path="/first-responder" element={<Chat />} />
        <Route path="/first-responder/history" element={<FirstResponderHistory />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="app-background" />
        <OfflineBanner />
        <SessionExpiredModal />
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  );
}