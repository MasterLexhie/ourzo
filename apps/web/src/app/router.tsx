import { createBrowserRouter } from "react-router"
import { ProtectedRoute, PublicRoute, OnboardingRoute } from "./routes"
import { LoginPage } from "@/features/auth/pages/login-page"
import { RegisterPage } from "@/features/auth/pages/register-page"
import { CreateWorkspacePage } from "@/features/organizations/pages/create-workspace-page"
import { DashboardPage } from "@/features/dashboard/pages/dashboard-page"
import { TeamPage } from "@/features/organizations/pages/team-page"
import { AcceptInvitationPage } from "@/features/organizations/pages/accept-invitation-page"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedRoute><DashboardPage /></ProtectedRoute>,
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
    children: [
      {
        path: "projects",
        element: <div>Projects page - coming soon</div>,
      },
      {
        path: "team",
        element: <TeamPage />,
      },
      {
        path: "settings",
        element: <div>Settings page - coming soon</div>,
      },
      {
        path: "profile",
        element: <div>Profile page - coming soon</div>,
      },
    ],
  },
])