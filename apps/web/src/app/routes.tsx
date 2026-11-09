import type { ReactNode } from "react"
import { Navigate } from "react-router"
import { useAuthStore } from "@/stores/auth.store"
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

  // Check localStorage directly to avoid query dependency on useOrganizations
  const hasOrgs = typeof window !== 'undefined' &&
    localStorage.getItem('organization-storage')?.includes('"organizations"') &&
    JSON.parse(localStorage.getItem('organization-storage')!).state?.organizations?.length > 0

  if (hasOrgs) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}