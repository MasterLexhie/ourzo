import { createBrowserRouter, Navigate } from "react-router"
import { ProtectedRoute, PublicRoute, OnboardingRoute } from "./routes"
import { LoginPage } from "@/features/auth/pages/login-page"
import { RegisterPage } from "@/features/auth/pages/register-page"
import { CreateWorkspacePage } from "@/features/organizations/pages/create-workspace-page"
import { DashboardPage } from "@/features/dashboard/pages/dashboard-page"
import { TeamPage } from "@/features/organizations/pages/team-page"
import { AcceptInvitationPage } from "@/features/organizations/pages/accept-invitation-page"
import { ProjectsPage } from "@/features/projects/pages/projects-page"
import { ProjectDetailPage } from "@/features/projects/pages/project-detail-page"
import { UsagePage } from "@/features/usage/pages/usage-page"
import { AuditLogsPage } from "@/features/audit/pages/audit-page"
import { ApiKeysPage } from "@/features/api-keys/pages/api-keys-page"
import { SettingsPage } from "@/features/settings/pages/settings-page"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/login",
    element: <PublicRoute><LoginPage /></PublicRoute>,
  },
  {
    path: "/register",
    element: <PublicRoute><RegisterPage /></PublicRoute>,
  },
  {
    path: "/onboarding/workspace",
    element: <OnboardingRoute><CreateWorkspacePage /></OnboardingRoute>,
  },
  {
    path: "/accept-invitation",
    element: <PublicRoute><AcceptInvitationPage /></PublicRoute>,
  },
  {
    path: "/dashboard",
    element: <ProtectedRoute><DashboardPage /></ProtectedRoute>,
  },
  {
    path: "/projects",
    element: <ProtectedRoute><ProjectsPage /></ProtectedRoute>,
  },
  {
    path: "/projects/:projectId",
    element: <ProtectedRoute><ProjectDetailPage /></ProtectedRoute>,
  },
  {
    path: "/usage",
    element: <ProtectedRoute><UsagePage /></ProtectedRoute>,
  },
  {
    path: "/audit",
    element: <ProtectedRoute><AuditLogsPage /></ProtectedRoute>,
  },
  {
    path: "/team",
    element: <ProtectedRoute><TeamPage /></ProtectedRoute>,
  },
  {
    path: "/settings",
    element: <ProtectedRoute><SettingsPage /></ProtectedRoute>,
  },
  {
    path: "/settings/api-keys",
    element: <ProtectedRoute><ApiKeysPage /></ProtectedRoute>,
  },
  {
    path: "/profile",
    element: <ProtectedRoute><div>Profile page - coming soon</div></ProtectedRoute>,
  },
])