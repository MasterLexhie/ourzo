"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/layout/page-layout";
import { useProjects, useCreateProject, useArchiveProject } from "@/hooks";
import { useOrganizationStore } from "@/stores/organization.store";
import { cn } from "@/lib/utils";
import { Plus, FolderKanban, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ErrorBoundary } from "@/components/error-boundary";

export type ProjectStatus = "planned" | "in_progress" | "paused" | "completed" | "archived";

const statusOptions = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

const statusColors: Record<ProjectStatus, string> = {
  planned: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  archived: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusLabel(status: ProjectStatus): string {
  return statusOptions.find((o) => o.value === status)?.label ?? status;
}

export function ProjectsPage() {
  const { currentOrganization } = useOrganizationStore();
  const workspaceId = currentOrganization?.id;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);

  const { data: projects, isLoading, error } = useProjects(workspaceId ?? "");
  const createProject = useCreateProject();
  const archiveProject = useArchiveProject();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ name: string; description: string; status: ProjectStatus }>({
    defaultValues: { name: "", description: "", status: "planned" },
  });

  if (!workspaceId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const onSubmit = async (data: { name: string; description: string; status: ProjectStatus }) => {
    if (!workspaceId) return;
    try {
      await createProject.mutateAsync({ workspaceId, dto: data });
      toast.success("Project created successfully");
      setShowCreateModal(false);
      reset();
    } catch {
      toast.error("Failed to create project");
    }
  };

  const handleArchive = async (projectId: string) => {
    if (!workspaceId) return;
    try {
      await archiveProject.mutateAsync({ workspaceId, projectId });
      toast.success("Project archived");
    } catch {
      toast.error("Failed to archive project");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive">
          <AlertDescription>Failed to load projects. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <PageLayout>
          <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
              <p className="text-muted-foreground mt-1">Manage your workspace projects</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>

          {projects && projects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className={cn(
                    "transition-shadow hover:shadow-md",
                    project.status === "archived" && "opacity-60"
                  )}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FolderKanban className="h-5 w-5 text-primary" />
                          {project.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className={statusColors[project.status]}>
                            {getStatusLabel(project.status)}
                          </Badge>
                          {project.progress !== undefined && project.progress !== 0 && (
                            <span className="text-sm text-muted-foreground">
                              {project.progress}% complete
                            </span>
                          )}
                        </div>
                    </div>
                    </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                      )}
                      <dl className="space-y-2 text-sm border-t pt-4">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Tasks</dt>
                          <dd className="font-medium">{project.taskCount ?? 0}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Members</dt>
                          <dd className="font-medium">{project.members?.length ?? 0}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Start Date</dt>
                          <dd className="font-medium">{formatDate(project.startDate)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Target Date</dt>
                          <dd className="font-medium">{formatDate(project.targetDate)}</dd>
                        </div>
                      </dl>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          disabled={project.status === "archived"}
                        >
                          <a href={`/projects/${project.id}`}>
                            <ChevronRight className="h-4 w-4 mr-1" />
                            View
                          </a>
                        </Button>
                        {project.status !== "archived" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setConfirmArchive(project.id)}
                            disabled={archiveProject.isPending}
                          >
                            {archiveProject.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Archive"
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first project to start organizing your work.
                </p>
                <Button onClick={() => setShowCreateModal(true)} size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </PageLayout>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create Project</CardTitle>
              <CardDescription>Add a new project to your workspace</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project name</Label>
                  <Input
                    id="name"
                    placeholder="Website Redesign"
                    {...register("name", {
                      required: "Project name is required",
                      maxLength: { value: 200, message: "Name too long" },
                    })}
                    disabled={createProject.isPending}
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive" role="alert">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    placeholder="Brief description of the project"
                    {...register("description", { maxLength: { value: 5000, message: "Description too long" } })}
                    disabled={createProject.isPending}
                    aria-invalid={!!errors.description}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive" role="alert">{errors.description.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    {...register("status", { required: "Status is required" })}
                    disabled={createProject.isPending}
                    aria-invalid={!!errors.status}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.status && (
                    <p className="text-sm text-destructive" role="alert">{errors.status.message}</p>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setShowCreateModal(false); reset(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createProject.isPending} className="flex-1">
                    {createProject.isPending ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Creating...
                      </>
                    ) : (
                      "Create Project"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Archive Confirmation Dialog */}
      {confirmArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Archive Project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>
                  Are you sure you want to archive this project? This action cannot be undone.
                  Archived projects are read-only.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setConfirmArchive(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => { handleArchive(confirmArchive); setConfirmArchive(null); }}
                  disabled={archiveProject.isPending}
                >
                  {archiveProject.isPending ? "Archiving..." : "Archive"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}