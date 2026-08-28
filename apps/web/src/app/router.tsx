import { createBrowserRouter } from "react-router"
import { ProtectedRoute, PublicRoute, OnboardingRoute } from "./routes"
import { LoginPage } from "@/features/auth/pages/login-page"
import { RegisterPage } from "@/features/auth/pages/register-page"
import { CreateWorkspacePage } from "@/features/organizations/pages/create-workspace-page"
import { DashboardPage } from "@/features/dashboard/pages/dashboard-page"

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
    path: "/dashboard",
    element: <ProtectedRoute><DashboardPage /></ProtectedRoute>,
    children: [
      {
        path: "projects",
        element: <div>Projects page - coming soon</div>,
      },
      {
        path: "team",
        element: <div>Team page - coming soon</div>,
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