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
import { SlugInput } from "@/components/slug-input"
import { finalizeSlug, slugify, SLUG_PATTERN } from "@/lib/slug"


export function CreateWorkspacePage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | undefined>()
  // Auto-generate the slug from the name until the user edits it by hand.
  const [slugTouched, setSlugTouched] = useState(false)

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
  const slug = watch("slug")

  useEffect(() => {
    if (!slugTouched) {
      setValue("slug", slugify(nameValue ?? ""))
    }
  }, [nameValue, slugTouched, setValue])

  const onSubmit = async (data: CreateOrganizationDto) => {
    setError(undefined)
    try {
      await createOrg({ name: data.name, slug: finalizeSlug(data.slug) })
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
                <input
                  type="hidden"
                  {...register("slug", {
                    validate: (value) => {
                      const finalSlug = finalizeSlug(value)
                      if (finalSlug.length < 2) return "Slug must be at least 2 characters"
                      if (!SLUG_PATTERN.test(finalSlug)) return "Use lowercase letters, numbers and dashes"
                      return true
                    },
                  })}
                />
                <SlugInput
                  value={slug}
                  onChange={(value) => {
                    setSlugTouched(true)
                    setValue("slug", value, { shouldValidate: !!errors.slug })
                  }}
                  disabled={isPending}
                  invalid={!!errors.slug}
                />
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