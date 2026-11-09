"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/layout/page-layout";
import { useUsage } from "@/hooks";
import { useOrganizationStore } from "@/stores/organization.store";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Users, FolderKanban, CheckSquare, Key, TrendingUp } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";

const resourceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  members: Users,
  projects: FolderKanban,
  tasks: CheckSquare,
  api_keys: Key,
};

const resourceLabels: Record<string, string> = {
  members: "Team Members",
  projects: "Projects",
  tasks: "Tasks",
  api_keys: "API Keys",
};

const resourceDescriptions: Record<string, string> = {
  members: "Active team members in your workspace",
  projects: "Projects created in your workspace",
  tasks: "Tasks across all projects",
  api_keys: "Active API keys for integrations",
};

function getPercentageColor(percentage: number): string {
  if (percentage >= 95) return "bg-red-500";
  if (percentage >= 80) return "bg-yellow-500";
  return "bg-green-500";
}

function getPercentageTextColor(percentage: number): string {
  if (percentage >= 95) return "text-red-600 dark:text-red-400";
  if (percentage >= 80) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

export function UsagePage() {
  const { currentOrganization } = useOrganizationStore();
  const workspaceId = currentOrganization?.id;

  const { data: usage, isLoading, error } = useUsage(workspaceId ?? "");

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
          <AlertDescription>Failed to load usage data. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive">
          <AlertDescription>No usage data available.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const planLabels: Record<string, string> = {
    free: "Free",
    pro: "Pro",
    business: "Business",
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <PageLayout>
          <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Usage Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Monitor your workspace resource usage against plan limits
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                {planLabels[usage.plan] ?? usage.plan}
              </Badge>
            </div>
          </div>

          {/* Plan Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Current Plan: {planLabels[usage.plan] ?? usage.plan}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your current plan determines the limits for each resource. Upgrade to access higher limits.
              </p>
            </CardContent>
          </Card>

          {/* Usage Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {usage.usage.map((item) => {
              const Icon = resourceIcons[item.resource];
              const isWarning = item.warning && !(item.limit > 0 && item.current >= item.limit);
              const isExceeded = item.limit > 0 && item.current >= item.limit;

              return (
                <Card key={item.resource} className={cn(isExceeded && "border-destructive/50")}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg">{resourceLabels[item.resource]}</CardTitle>
                      </div>
                      {isExceeded && (
                        <Badge variant="destructive" className="text-xs">
                          Exceeded
                        </Badge>
                      )}
                      {isWarning && !isExceeded && (
                        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          Warning
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Used</span>
                        <span className="font-medium">{item.current} / {item.limit}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-300 rounded-full"
                          style={{
                            width: `${Math.min(item.percentage, 100)}%`,
                          }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: getPercentageColor(item.percentage),
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{item.percentage}% used</span>
                        <span className={getPercentageTextColor(item.percentage)} font-medium>
                          {item.exceeded ? "Limit exceeded" : isWarning ? "Approaching limit" : "Within limits"}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{resourceDescriptions[item.resource]}</p>
                    {item.exceeded && (
                      <Alert variant="destructive" className="text-xs">
                        <AlertDescription>
                          You have exceeded your {resourceLabels[item.resource].toLowerCase()} limit.
                          Consider upgrading your plan.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Period Info */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Billing Period</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Period Start</p>
                <p className="font-medium">{new Date(usage.periodStart).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Period End</p>
                <p className="font-medium">{new Date(usage.periodEnd).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    </div>
    </ErrorBoundary>
  );
}