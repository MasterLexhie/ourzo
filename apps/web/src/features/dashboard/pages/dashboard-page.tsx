"use client"

import { useEffect } from "react"
import { Link, useNavigate } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Plus, ChevronDown, LayoutDashboard, FolderKanban, Users, Settings, LogOut, Building2, BarChart2, FileText } from "lucide-react"
import { useAuthStore } from "@/stores/auth.store"
import { authService } from "@/services"
import { useOrganizationStore } from "@/stores/organization.store"
import { useOrganizations, useMembers, useProjectTotal, useAuditLogs, useNotifications } from "@/hooks"
import { RecentActivity } from "../components/recent-activity"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { NotificationsBell } from "@/components/ui/bell"

export function DashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, clearAuth } = useAuthStore()
  const { currentOrganization, setCurrentOrganization, setOrganizations, organizations } = useOrganizationStore()
  const { data: fetchedOrgs, isLoading, error: orgsError } = useOrganizations()

  // setOrganizations also reconciles the selected workspace against the list.
  useEffect(() => {
    if (fetchedOrgs) {
      setOrganizations(fetchedOrgs)
    }
  }, [fetchedOrgs, setOrganizations])

  const workspaceId = currentOrganization?.id ?? ""
  const { data: members } = useMembers(workspaceId)
  const { data: projectTotal } = useProjectTotal(workspaceId)
  const myRole = members?.find((m) => m.userId === user?.id)?.role
  const canViewAudit = myRole === "owner" || myRole === "admin"
  const auditQuery = useAuditLogs(canViewAudit ? workspaceId : "", { limit: 5 })
  const notificationsQuery = useNotifications(myRole && !canViewAudit ? workspaceId : "", { limit: 5 })
  const memberCount = members?.length ?? currentOrganization?.memberCount ?? 1
  const projectCount = projectTotal ?? currentOrganization?.projectCount ?? 0

  const handleWorkspaceChange = (workspaceId: string) => {
    const org = organizations.find((o) => o.id === workspaceId) ?? fetchedOrgs?.find((o) => o.id === workspaceId)
    if (org) {
      setCurrentOrganization(org)
    }
  }

  const handleCreateWorkspace = () => {
    navigate("/onboarding/workspace")
  }

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch {
      // Ignore server errors on logout
    } finally {
      clearAuth()
      queryClient.clear()
      navigate("/login")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (orgsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive">
          <AlertDescription>Failed to load workspaces. Please try again.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="font-bold text-xl">Ourzo</span>
            </Link>

            {organizations.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 h-10 px-3">
                    <Building2 className="h-4 w-4" />
                    <span className="truncate max-w-[150px]">
                      {currentOrganization?.name ?? "Select workspace"}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {organizations.map((org) => (
                    <DropdownMenuItem
                      key={org.id}
                      onClick={() => handleWorkspaceChange(org.id)}
                      className={cn(
                        currentOrganization?.id === org.id && "bg-accent font-medium"
                      )}
                    >
                      {org.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleCreateWorkspace}>
                    <Plus className="h-4 w-4 mr-2" />
                    New workspace
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link to="/projects">
              <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Projects">
                <FolderKanban className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/usage">
              <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Usage">
                <BarChart2 className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/audit">
              <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Audit Logs">
                <FileText className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/team">
              <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Team">
                <Users className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Settings">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>

            <NotificationsBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 w-10 rounded-full" aria-label="User menu">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1 text-sm">
                  <p className="font-medium truncate">{user?.firstName} {user?.lastName}</p>
                  <p className="text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            {currentOrganization?.name ?? "Welcome to Ourzo"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {currentOrganization
              ? `Manage your workspace: ${currentOrganization.name}`
              : "Create your first workspace to get started"}
          </p>
        </div>

        {!currentOrganization ? (
          <div className="text-center py-12">
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground mb-6">
                  You don't have a workspace yet. Create one to start organizing your projects and team.
                </p>
                <Button onClick={handleCreateWorkspace} size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Create workspace
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5 text-primary" />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Plan</dt>
                    <dd className="font-medium capitalize">{currentOrganization.plan}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Members</dt>
                    <dd className="font-medium">{memberCount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Projects</dt>
                    <dd className="font-medium">{projectCount}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Link to="/projects" className="text-decoration-none text-inherit">
              <Card className="transition-shadow hover:shadow-md cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderKanban className="h-5 w-5 text-primary" />
                    Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {projectCount} project{projectCount !== 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-primary mt-2">View projects →</p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/usage" className="text-decoration-none text-inherit">
              <Card className="transition-shadow hover:shadow-md cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-primary" />
                    Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    View resource usage
                  </p>
                  <p className="text-sm text-primary mt-2">View usage →</p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/audit" className="text-decoration-none text-inherit">
              <Card className="transition-shadow hover:shadow-md cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Audit Logs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    View activity logs
                  </p>
                  <p className="text-sm text-primary mt-2">View logs →</p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/team" className="text-decoration-none text-inherit">
              <Card className="transition-shadow hover:shadow-md cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {memberCount} member{memberCount !== 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-primary mt-2">Manage team →</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        {currentOrganization && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <RecentActivity
              mode={canViewAudit ? "audit" : "notifications"}
              isLoading={canViewAudit ? auditQuery.isLoading : notificationsQuery.isLoading}
              auditLogs={auditQuery.data?.auditLogs}
              notifications={notificationsQuery.data?.notifications}
            />
          </div>
        )}
      </main>
    </div>
  )
}