"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { PageLayout } from "@/components/layout/page-layout";
import { useOrganizationStore } from "@/stores/organization.store";
import { useUpdateOrganization, useDeleteOrganization } from "@/hooks";
import { Building2, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { Spinner } from "@/components/ui/spinner";
import { SlugInput } from "@/components/slug-input";
import { finalizeSlug, SLUG_PATTERN } from "@/lib/slug";

export function SettingsPage() {
  const { currentOrganization, setCurrentOrganization } = useOrganizationStore();
  const workspaceId = currentOrganization?.id;

  const [activeTab, setActiveTab] = useState<"general" | "danger">("general");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateOrg = useUpdateOrganization();
  const deleteOrg = useDeleteOrganization();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<{ name: string; slug: string }>({
    defaultValues: {
      name: currentOrganization?.name ?? "",
      slug: currentOrganization?.slug ?? "",
    },
  });

  if (!workspaceId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const onSubmit = async (data: { name: string; slug: string }) => {
    if (!workspaceId) return;
    try {
      const dto = { name: data.name, slug: finalizeSlug(data.slug) };
      await updateOrg.mutateAsync({ workspaceId, dto });
      toast.success("Workspace updated successfully");
      if (currentOrganization) {
        setCurrentOrganization({ ...currentOrganization, name: dto.name, slug: dto.slug });
      }
    } catch {
      toast.error("Failed to update workspace");
    }
  };

  const handleDelete = async () => {
    if (!workspaceId) return;
    try {
      await deleteOrg.mutateAsync(workspaceId);
      toast.success("Workspace deleted");
      setConfirmDelete(false);
    } catch {
      toast.error("Failed to delete workspace");
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <PageLayout maxWidth="xl">
          <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your workspace settings and preferences
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b">
            <Button
              variant={activeTab === "general" ? "default" : "ghost"}
              className="h-10 px-4"
              onClick={() => setActiveTab("general")}
            >
              <Building2 className="h-4 w-4 mr-2" />
              General
            </Button>
            <Button
              variant={activeTab === "danger" ? "destructive" : "ghost"}
              className="h-10 px-4"
              onClick={() => setActiveTab("danger")}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Danger Zone
            </Button>
          </div>

          {activeTab === "general" && (
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Update your workspace name and URL slug
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Workspace Name</Label>
                    <Input
                      id="name"
                      placeholder="Acme Inc"
                      {...register("name", {
                        required: "Workspace name is required",
                        minLength: { value: 1, message: "Name is required" },
                        maxLength: { value: 150, message: "Name too long" },
                      })}
                      disabled={updateOrg.isPending}
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
                          const finalSlug = finalizeSlug(value);
                          if (finalSlug.length < 2) return "Slug must be at least 2 characters";
                          if (!SLUG_PATTERN.test(finalSlug)) return "Use lowercase letters, numbers and dashes";
                          return true;
                        },
                      })}
                    />
                    <SlugInput
                      value={watch("slug")}
                      onChange={(value) => setValue("slug", value, { shouldValidate: !!errors.slug })}
                      disabled={updateOrg.isPending}
                      invalid={!!errors.slug}
                    />
                    {errors.slug && (
                      <p className="text-sm text-destructive" role="alert">{errors.slug.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      This will be your workspace URL: <code className="text-foreground">ourzo.app/{watch("slug") || "your-slug"}</code>
                    </p>
                  </div>

                  <Button type="submit" disabled={updateOrg.isPending} className="w-full sm:w-auto">
                    {updateOrg.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === "danger" && (
            <Card className="border-destructive/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                </div>
                <CardDescription>
                  Irreversible actions. Please proceed with caution.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-destructive">Delete Workspace</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Permanently delete your workspace and all its data. This action cannot be undone.
                        All projects, tasks, members, and audit logs will be permanently removed.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => setConfirmDelete(true)}
                      disabled={deleteOrg.isPending}
                      className="shrink-0"
                    >
                      {deleteOrg.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete Workspace"
                      )}
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="text-sm text-muted-foreground">
                  <p>
                    <strong>Warning:</strong> Deleting your workspace will:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Remove all projects and tasks</li>
                    <li>Remove all team members</li>
                    <li>Delete all audit logs and notifications</li>
                    <li>Revoke all API keys</li>
                    <li>Cancel any pending invitations</li>
                  </ul>
                  <p className="mt-2">
                    This action is permanent and cannot be reversed. Only workspace owners can perform this action.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delete Confirmation Dialog */}
          {confirmDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <Card className="w-full max-w-md border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Delete Workspace</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert variant="destructive">
                    <AlertDescription>
                      Are you absolutely sure? This will permanently delete "{currentOrganization?.name}" and all its data.
                      This cannot be undone.
                    </AlertDescription>
                  </Alert>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => { handleDelete(); setConfirmDelete(false); }}
                      disabled={deleteOrg.isPending}
                    >
                      {deleteOrg.isPending ? "Deleting..." : "Yes, Delete Workspace"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </PageLayout>
    </div>
    </ErrorBoundary>
  );
}