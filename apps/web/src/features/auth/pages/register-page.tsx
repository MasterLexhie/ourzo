"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { useRegister } from "@/hooks"
import { AuthForm } from "@/components/forms/auth-form"
import { PageLayout } from "@/components/layout/page-layout"
import { Card, CardContent } from "@/components/ui/card"
import type { RegisterDto } from "@/types/auth.types"

export function RegisterPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | undefined>()

  const { mutateAsync: register, isPending } = useRegister()

  const handleRegister = async (data: RegisterDto) => {
    setError(undefined)
    try {
      await register({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      })
      navigate("/onboarding/workspace")
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } }; message?: string }
      setError(apiError.response?.data?.message ?? apiError.message ?? "Registration failed. Please try again.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <PageLayout maxWidth="sm">
        <Card>
          <CardContent className="pt-6">
            <AuthForm
              mode="register"
              onSubmit={handleRegister as (data: RegisterDto | { email: string; password: string }) => Promise<void>}
              isLoading={isPending}
              error={error}
              submitText="Create account"
              switchText="Already have an account?"
              switchLink="/login"
              switchLinkText="Sign in"
            />
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          By creating an account, you agree to our{" "}
          <Link to="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </PageLayout>
    </div>
  )
}