"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useParams, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/layout/page-layout";
import {
  useProject,
  useProjectProgress,
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useMembers,
  useAddProjectMembers,
  useRemoveProjectMember,
} from "@/hooks";
import { useOrganizationStore } from "@/stores/organization.store";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types/project.types";
import type { Task, TaskStatus, TaskPriority } from "@/types/task.types";
import { Plus, ChevronLeft, Trash2, Users, UserPlus, X } from "lucide-react";
import { toast } from "sonner";



// Radix Select forbids empty-string item values, so "no assignee" needs a sentinel.
const UNASSIGNED = "__unassigned__";

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
];

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const statusColors: Record<TaskStatus, string> = {
  todo: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  blocked: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const projectStatusColors: Record<ProjectStatus, string> = {
  planned: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  archived: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

const priorityColors: Record<TaskPriority, string> = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusLabel(status: TaskStatus): string {
  return statusOptions.find((o) => o.value === status)?.label ?? status;
}

function getProjectStatusLabel(status: ProjectStatus): string {
  const labels: Record<ProjectStatus, string> = {
    planned: "Planned",
    in_progress: "In Progress",
    paused: "Paused",
    completed: "Completed",
    archived: "Archived",
  };
  return labels[status] ?? status;
}

function getPriorityLabel(priority: TaskPriority): string {
  return priorityOptions.find((o) => o.value === priority)?.label ?? priority;
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useOrganizationStore();
  const workspaceId = currentOrganization?.id;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: project, isLoading: projectLoading, error: projectError } = useProject(workspaceId ?? "", projectId ?? "");
  const { data: progress } = useProjectProgress(workspaceId ?? "", projectId ?? "");
  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useTasks(workspaceId ?? "", projectId ?? "");
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const { user } = useAuthStore();
  const { data: workspaceMembers } = useMembers(workspaceId ?? "");
  const addProjectMembers = useAddProjectMembers();
  const removeProjectMember = useRemoveProjectMember();
  const [memberToAdd, setMemberToAdd] = useState("");

  // UX only: the API enforces Owner/Admin on member-management routes.
  const myRole = workspaceMembers?.find((m) => m.userId === user?.id)?.role;
  const projectMembers = project?.members ?? [];
  const canManageMembers =
    (myRole === "owner" || myRole === "admin") && project?.status !== "archived";
  const availableMembers = (workspaceMembers ?? []).filter(
    (m) => !projectMembers.some((pm) => pm.userId === m.userId)
  );

  const handleAddMember = async () => {
    if (!workspaceId || !projectId || !memberToAdd) return;
    try {
      await addProjectMembers.mutateAsync({ workspaceId, projectId, userIds: [memberToAdd] });
      toast.success("Member added to project");
      setMemberToAdd("");
    } catch {
      toast.error("Failed to add member");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!workspaceId || !projectId) return;
    try {
      await removeProjectMember.mutateAsync({ workspaceId, projectId, userId });
      toast.success("Member removed from project");
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string;
    dueDate: string;
  }>({
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      assigneeId: UNASSIGNED,
      dueDate: "",
    },
  });

  const onSubmit = async (data: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string;
    dueDate: string;
  }) => {
    if (!workspaceId) return;
    try {
      await createTask.mutateAsync({
        workspaceId,
        dto: {
          title: data.title,
          description: data.description || undefined,
          projectId: projectId!,
          status: data.status,
          priority: data.priority,
          assigneeId:
            data.assigneeId && data.assigneeId !== UNASSIGNED
              ? data.assigneeId
              : undefined,
          dueDate: data.dueDate || undefined,
        },
      });
      toast.success("Task created successfully");
      setShowCreateModal(false);
      reset();
    } catch {
      toast.error("Failed to create task");
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!workspaceId) return;
    try {
      await updateTask.mutateAsync({
        workspaceId,
        taskId,
        dto: { status: newStatus },
      });
      toast.success("Task status updated");
    } catch {
      toast.error("Failed to update task status");
    }
  };

  const handleDelete = async () => {
    if (!workspaceId || !confirmDelete) return;
    try {
      await deleteTask.mutateAsync({ workspaceId, taskId: confirmDelete });
      toast.success("Task deleted");
      setConfirmDelete(null);
    } catch {
      toast.error("Failed to delete task");
    }
  };

  if (projectLoading || tasksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (projectError || tasksError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive">
          <AlertDescription>Failed to load project. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive">
          <AlertDescription>Project not found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const tasksByStatus: Record<TaskStatus, Task[]> = {
    todo: tasks?.filter((t) => t.status === "todo") ?? [],
    in_progress: tasks?.filter((t) => t.status === "in_progress") ?? [],
    blocked: tasks?.filter((t) => t.status === "blocked") ?? [],
    completed: tasks?.filter((t) => t.status === "completed") ?? [],
  };

  const renderTaskCard = (task: Task) => (
    <Card
      key={task.id}
      className={cn(
        "mb-3 transition-shadow hover:shadow-md",
        task.status === "completed" && "opacity-70"
      )}
    >
      <CardContent className="p-4">
        <h4 className="font-medium break-words mb-2">{task.title}</h4>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 basis-48">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant="secondary" className={statusColors[task.status]}>
                {getStatusLabel(task.status)}
              </Badge>
              <Badge variant="outline" className={priorityColors[task.priority]}>
                {getPriorityLabel(task.priority)}
              </Badge>
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {task.assignee && (
                <span className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium">
                    {task.assignee.firstName[0]}{task.assignee.lastName[0]}
                  </span>
                  <span>{task.assignee.firstName} {task.assignee.lastName}</span>
                </span>
              )}
              {task.dueDate && (
                <span className="flex items-center gap-1">
                  📅 {formatDate(task.dueDate)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Select
              value={task.status}
              onValueChange={(value) => handleStatusChange(task.id, value as TaskStatus)}
              disabled={updateTask.isPending}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder={getStatusLabel(task.status)} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmDelete(task.id)}
              disabled={deleteTask.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <PageLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                  <Badge variant="secondary" className={projectStatusColors[project.status]}>
                    {getProjectStatusLabel(project.status)}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">{project.description ?? "No description"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                Progress
                {progress && (
                  <span className="text-sm font-medium">{progress.progress}% ({progress.completedTasks}/{progress.totalTasks} tasks)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress?.progress ?? 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Project Details */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <Badge variant="secondary" className={cn(projectStatusColors[project.status], "text-lg")}>
                    {getProjectStatusLabel(project.status)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{progress?.totalTasks ?? 0}</p>
                <p className="text-sm text-muted-foreground">
                  {progress?.completedTasks ?? 0} completed
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start</span>
                  <span>{formatDate(project.startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target</span>
                  <span>{formatDate(project.targetDate)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Project Members */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Members ({projectMembers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {projectMembers.length > 0 ? (
                <ul className="divide-y">
                  {projectMembers.map((member) => (
                    <li key={member.userId} className="flex items-center justify-between gap-4 py-2">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground break-all">{member.email}</p>
                      </div>
                      {canManageMembers && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${member.firstName} ${member.lastName} from project`}
                          onClick={() => handleRemoveMember(member.userId)}
                          disabled={removeProjectMember.isPending}
                          className="text-destructive hover:text-destructive shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No members yet.</p>
              )}

              {canManageMembers && (
                availableMembers.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={memberToAdd} onValueChange={setMemberToAdd}>
                      <SelectTrigger className="w-full sm:w-72" aria-label="Workspace member to add">
                        <SelectValue placeholder="Select a workspace member" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMembers.map((m) => (
                          <SelectItem key={m.userId} value={m.userId}>
                            {m.firstName} {m.lastName} ({m.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAddMember} disabled={!memberToAdd || addProjectMembers.isPending}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add to project
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">All workspace members are already on this project.</p>
                )
              )}
            </CardContent>
          </Card>

          {/* Task Board */}
          <div className="grid gap-4 md:grid-cols-4">
            {statusOptions.map(({ value, label }) => (
              <Card key={value}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {label}
                      <Badge variant="secondary" className={statusColors[value]}>
                        {tasksByStatus[value]?.length ?? 0}
                      </Badge>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="min-h-[300px]">
                  <div className="space-y-2">
                    {tasksByStatus[value]?.length > 0 ? (
                      tasksByStatus[value]?.map(renderTaskCard)
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-8">
                        No tasks
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </PageLayout>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create Task</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Task title"
                    {...register("title", {
                      required: "Title is required",
                      maxLength: { value: 255, message: "Title too long" },
                    })}
                    disabled={createTask.isPending}
                    aria-invalid={!!errors.title}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive" role="alert">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Task description"
                    {...register("description", { maxLength: { value: 5000, message: "Description too long" } })}
                    disabled={createTask.isPending}
                    rows={3}
                    aria-invalid={!!errors.description}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive" role="alert">{errors.description.message}</p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Controller
                      name="status"
                      control={control}
                      rules={{ required: "Status is required" }}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={createTask.isPending}
                        >
                          <SelectTrigger id="status" aria-invalid={!!errors.status}>
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
                      )}
                    />
                    {errors.status && (
                      <p className="text-sm text-destructive" role="alert">{errors.status.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Controller
                      name="priority"
                      control={control}
                      rules={{ required: "Priority is required" }}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={createTask.isPending}
                        >
                          <SelectTrigger id="priority" aria-invalid={!!errors.priority}>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            {priorityOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.priority && (
                      <p className="text-sm text-destructive" role="alert">{errors.priority.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigneeId">Assignee (optional)</Label>
                  <Controller
                    name="assigneeId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={createTask.isPending}
                      >
                        <SelectTrigger id="assigneeId">
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                          {project.members?.map((member) => (
                            <SelectItem key={member.userId} value={member.userId}>
                              {member.firstName} {member.lastName} ({member.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date (optional)</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    {...register("dueDate")}
                    disabled={createTask.isPending}
                    aria-invalid={!!errors.dueDate}
                  />
                  {errors.dueDate && (
                    <p className="text-sm text-destructive" role="alert">{errors.dueDate.message}</p>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setShowCreateModal(false); reset(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createTask.isPending} className="flex-1">
                    {createTask.isPending ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Creating...
                      </>
                    ) : (
                      "Create Task"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Delete Task</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>
                  Are you sure you want to delete this task? This action cannot be undone.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => { handleDelete(); setConfirmDelete(null); }}
                  disabled={deleteTask.isPending}
                >
                  {deleteTask.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}