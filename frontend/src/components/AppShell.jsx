import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BottomNav from "./BottomNav";

export default function AppShell() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
}
