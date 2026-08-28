"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { useLogin } from "@/hooks"
import { AuthForm } from "@/components/forms/auth-form"
import { PageLayout } from "@/components/layout/page-layout"
import { Card, CardContent } from "@/components/ui/card"
import type { LoginDto } from "@/types/auth.types"

export function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | undefined>()

  const { mutateAsync: login, isPending } = useLogin()

  const handleLogin = async (data: LoginDto) => {
    setError(undefined)
    try {
      await login(data)
      navigate("/dashboard")
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } }; message?: string }
      setError(apiError.response?.data?.message ?? apiError.message ?? "Login failed. Please try again.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <PageLayout maxWidth="sm">
        <Card>
          <CardContent className="pt-6">
            <AuthForm
              mode="login"
              onSubmit={handleLogin}
              isLoading={isPending}
              error={error}
              submitText="Sign in"
              switchText="Don't have an account?"
              switchLink="/register"
              switchLinkText="Create one"
            />
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Forgot password?{" "}
          <Link to="/forgot-password" className="text-primary hover:underline">
            Reset it
          </Link>
        </p>
      </PageLayout>
    </div>
  )
}