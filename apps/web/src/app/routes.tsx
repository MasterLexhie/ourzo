import type { ReactNode } from "react"
import { Navigate } from "react-router"
import { useAuthStore } from "@/stores/auth.store"
import { useOrganizations } from "@/hooks"
import { useEffect } from "react"
import { Spinner } from "@/components/ui/spinner"

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore()

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore()

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export function OnboardingRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore()
  const { data: orgs } = useOrganizations()

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // If user has no organizations, they should be in onboarding
  if (orgs && orgs.length > 0) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}