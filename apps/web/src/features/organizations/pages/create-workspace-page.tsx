"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useCreateOrganization } from "@/hooks"
import { PageLayout } from "@/components/layout/page-layout"
import type { CreateOrganizationDto } from "@/types/organization.types"

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function CreateWorkspacePage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | undefined>()
  const [slug, setSlug] = useState("")

  const { mutateAsync: createOrg, isPending } = useCreateOrganization()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateOrganizationDto>({
    mode: "onBlur",
    defaultValues: { name: "", slug: "" },
  })

  const nameValue = watch("name")

  // Auto-generate slug from name
  useEffect(() => {
    if (!slug || slug === slugify(watch("name"))) {
      const newSlug = slugify(nameValue)
      setSlug(newSlug)
      setValue("slug", newSlug)
    }
  }, [nameValue, slug, watch, setValue])

  const onSubmit = async (data: CreateOrganizationDto) => {
    setError(undefined)
    try {
      await createOrg({ name: data.name, slug: data.slug })
      navigate("/dashboard")
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } }; message?: string }
      setError(apiError.response?.data?.message ?? apiError.message ?? "Failed to create workspace. Please try again.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <PageLayout maxWidth="sm">
        <Card>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">Create your workspace</CardTitle>
            <CardDescription>
              Give your workspace a name. You can change this later.
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Workspace name</Label>
                <Input
                  id="name"
                  placeholder="Acme Inc"
                  {...register("name", {
                    required: "Workspace name is required",
                    minLength: { value: 1, message: "Name is required" },
                    maxLength: { value: 150, message: "Name too long" },
                  })}
                  disabled={isPending}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-sm text-destructive" role="alert">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ourzo.app/
                  </span>
                  <Input
                    id="slug"
                    className="pl-20"
                    placeholder="acme-inc"
                    value={slug}
                    onChange={(e) => {
                      const value = e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "")
                        .replace(/--+/g, "-")
                        .replace(/^-|-$/g, "")
                      setSlug(value)
                      setValue("slug", value)
                    }}
                    disabled={isPending}
                    aria-invalid={!!errors.slug}
                    required
                    minLength={2}
                    maxLength={150}
                    pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                  />
                </div>
                {errors.slug && (
                  <p className="text-sm text-destructive" role="alert">{errors.slug.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  This will be your workspace URL: <code className="text-foreground">ourzo.app/{slug || "your-slug"}</code>
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isPending}
                size="lg"
              >
                {isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Creating workspace...
                  </>
                ) : (
                  "Create workspace"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </PageLayout>
    </div>
  )
}