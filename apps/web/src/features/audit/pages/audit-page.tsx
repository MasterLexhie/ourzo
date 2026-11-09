"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/layout/page-layout";
import { useAuditLogs } from "@/hooks";
import { useOrganizationStore } from "@/stores/organization.store";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Filter, Calendar, User, Database, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ErrorBoundary } from "@/components/error-boundary";

export function AuditLogsPage() {
  const { currentOrganization } = useOrganizationStore();
  const workspaceId = currentOrganization?.id;

  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
  } = useForm<{
    action: string;
    resourceType: string;
    actorId: string;
    startDate: string;
    endDate: string;
  }>({
    defaultValues: { action: "", resourceType: "", actorId: "", startDate: "", endDate: "" },
  });

  const filters = watch();

  const { data: auditLogsData, isLoading, error } = useAuditLogs(workspaceId ?? "", {
    action: filters.action || undefined,
    resourceType: filters.resourceType || undefined,
    actorId: filters.actorId || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    page,
    limit: 20,
  });

  const onSubmit = (_data: typeof filters) => {
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  if (!workspaceId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

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
          <AlertDescription>Failed to load audit logs. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const logs = auditLogsData?.auditLogs ?? [];
  const total = auditLogsData?.total ?? 0;
  const totalPages = Math.ceil(total / 20) || 1;

  const getActionBadgeColor = (action: string) => {
    if (action.includes("created")) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (action.includes("updated") || action.includes("changed")) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    if (action.includes("archived") || action.includes("deleted") || action.includes("revoked") || action.includes("removed"))
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    if (action.includes("accepted")) return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <PageLayout>
          <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
              <p className="text-muted-foreground mt-1">
                View workspace activity and security events
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Filters
                  <Button variant="ghost" size="sm" onClick={() => { reset(); setShowFilters(false); }}>
                    Clear
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <div className="space-y-2">
                    <Label htmlFor="action">Action</Label>
                    <Input
                      id="action"
                      placeholder="e.g. project.created"
                      {...register("action")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resourceType">Resource Type</Label>
                    <Select {...register("resourceType")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select resource type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="task">Task</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="invitation">Invitation</SelectItem>
                        <SelectItem value="api_key">API Key</SelectItem>
                        <SelectItem value="workspace">Workspace</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="actorId">Actor ID</Label>
                    <Input
                      id="actorId"
                      placeholder="User ID"
                      {...register("actorId")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      {...register("startDate")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      {...register("endDate")}
                    />
                  </div>
                  <div className="flex items-end lg:col-span-5">
                    <Button type="submit" className="w-full sm:w-auto">
                      <Search className="h-4 w-4 mr-2" />
                      Apply Filters
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Audit Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Events ({auditLogsData?.total ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-muted-foreground">
                        <th className="pb-3 pr-4">Timestamp</th>
                        <th className="pb-3 pr-4">Actor</th>
                        <th className="pb-3 pr-4">Action</th>
                        <th className="pb-3 pr-4">Resource</th>
                        <th className="pb-3 pr-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/50">
                          <td className="py-3 pr-4 text-sm whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-sm">
                            {log.actor ? (
                              <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-medium">{log.actor.firstName} {log.actor.lastName}</span>
                                <span className="text-muted-foreground">({log.actor.email})</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">System</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-sm">
                            <Badge variant="secondary" className={getActionBadgeColor(log.action)}>
                              {log.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Database className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium capitalize">{log.resourceType}</span>
                              {log.resourceId && (
                                <span className="text-muted-foreground font-mono text-xs">
                                  {log.resourceId.slice(0, 8)}...
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-sm text-muted-foreground max-w-xs truncate">
                            {log.metadata && Object.keys(log.metadata).length > 0 ? (
                              <pre className="text-xs font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                                {JSON.stringify(log.metadata)}
                              </pre>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No audit logs found</h3>
                  <p className="text-muted-foreground">
                    {filters.action || filters.resourceType || filters.actorId || filters.startDate || filters.endDate
                      ? "Try adjusting your filters"
                      : "No activity recorded yet"}
                  </p>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} • {auditLogsData?.total ?? 0} total events
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    </div>
    </ErrorBoundary>
  );
}