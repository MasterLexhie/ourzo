"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageLayout } from "@/components/layout/page-layout";
import { useMembers, useInvitations, useCreateInvitation, useRevokeInvitation, useUpdateMemberRole, useRemoveMember, useTransferOwnership } from "@/hooks";
import { useOrganizationStore } from "@/stores/organization.store";
import { cn } from "@/lib/utils";
import { UserPlus, Mail, X, Shield, Crown, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

interface Member {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
}

const roleOptions = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getRoleBadge(role: string) {
  const variants = {
    owner: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    member: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  };
  return variants[role as keyof typeof variants] ?? variants.member;
}

function getStatusBadge(status: InvitationStatus) {
  const variants = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    accepted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    expired: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    revoked: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  };
  return variants[status];
}

export function TeamPage() {
  const { currentOrganization } = useOrganizationStore();
  const workspaceId = currentOrganization?.id;

  const { data: members, isLoading: membersLoading, error: membersError } = useMembers(workspaceId ?? "");
  const { data: invitations, isLoading: invitationsLoading, error: invitationsError } = useInvitations(workspaceId ?? "");

  const createInvitation = useCreateInvitation();
  const revokeInvitation = useRevokeInvitation();
  const updateMemberRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const transferOwnership = useTransferOwnership();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "remove" | "transfer"; member: Member } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ email: string; role: "owner" | "admin" | "member" }>({
    defaultValues: { email: "", role: "member" },
  });

  const onInviteSubmit = async (data: { email: string; role: "owner" | "admin" | "member" }) => {
    if (!workspaceId) return;
    try {
      await createInvitation.mutateAsync({ workspaceId, dto: data });
      toast.success("Invitation sent successfully");
      setShowInviteModal(false);
      reset();
    } catch {
      toast.error("Failed to send invitation");
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!workspaceId) return;
    try {
      await revokeInvitation.mutateAsync({ workspaceId, invitationId });
      toast.success("Invitation revoked");
    } catch {
      toast.error("Failed to revoke invitation");
    }
  };

  const handleRoleChange = async (member: Member, newRole: "owner" | "admin" | "member") => {
    if (!workspaceId) return;
    try {
      await updateMemberRole.mutateAsync({ workspaceId, userId: member.userId, dto: { role: newRole } });
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleRemoveMember = async () => {
    if (!workspaceId || !confirmAction?.member) return;
    try {
      await removeMember.mutateAsync({ workspaceId, userId: confirmAction.member.userId });
      toast.success("Member removed");
      setConfirmAction(null);
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const handleTransferOwnership = async () => {
    if (!workspaceId || !confirmAction?.member) return;
    try {
      await transferOwnership.mutateAsync({ workspaceId, dto: { userId: confirmAction.member.userId } });
      toast.success("Ownership transferred");
      setConfirmAction(null);
    } catch {
      toast.error("Failed to transfer ownership");
    }
  };

  const canManageMember = (member: Member) => {
    const currentUser = members?.find((m: Member) => m.userId === currentOrganization?.id);
    if (!currentUser) return false;
    if (currentUser.role === "owner") return member.userId !== currentUser.userId;
    if (currentUser.role === "admin") return member.role === "member";
    return false;
  };

  const canChangeRole = (member: Member, newRole: "owner" | "admin" | "member") => {
    const currentUser = members?.find((m: Member) => m.userId === currentOrganization?.id);
    if (!currentUser) return false;
    if (currentUser.role === "owner") return true;
    if (currentUser.role === "admin") return newRole === "member" && member.role === "member";
    return false;
  };

  if (membersLoading || invitationsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (membersError || invitationsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive">
          <AlertDescription>Failed to load team data. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentUser = members?.find((m) => m.userId === currentOrganization?.id);
  const isOwner = currentUser?.role === "owner";
  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="min-h-screen bg-background">
      <PageLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Team</h1>
              <p className="text-muted-foreground mt-1">Manage workspace members and invitations</p>
            </div>
            {(isOwner || isAdmin) && (
              <Button onClick={() => setShowInviteModal(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            )}
          </div>

          {/* Members Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Members ({members?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {members && members.length > 0 ? (
                <div className="space-y-4">
                  {members.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                          {member.firstName[0]}{member.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium">{member.firstName} {member.lastName}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                        <span className={cn("px-2 py-1 text-xs font-medium rounded-full", getRoleBadge(member.role))}>
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {(isOwner || isAdmin) && canManageMember(member) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <span className="sr-only">More options</span>
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleRoleChange(member, "admin")}
                                disabled={!canChangeRole(member, "admin") || member.role === "admin"}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Make Admin
                              </DropdownMenuItem>
                              {isOwner && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleRoleChange(member, "owner")}
                                    disabled={!canChangeRole(member, "owner") || member.role === "owner"}
                                  >
                                    <Crown className="h-4 w-4 mr-2" />
                                    Make Owner
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleRoleChange(member, "member")}
                                    disabled={!canChangeRole(member, "member") || member.role === "member"}
                                  >
                                    <User className="h-4 w-4 mr-2" />
                                    Make Member
                                  </DropdownMenuItem>
                                </>
                              )}
                              {isOwner && member.userId !== currentUser?.userId && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setConfirmAction({ type: "transfer", member })}
                                    className="text-orange-600"
                                  >
                                    Transfer Ownership
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setConfirmAction({ type: "remove", member })}
                                    className="text-destructive"
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Remove Member
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No members found</p>
              )}
            </CardContent>
          </Card>

          {/* Pending Invitations Section */}
          {(isOwner || isAdmin) && invitations && invitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Pending Invitations ({invitations.filter((i) => i.status === "pending").length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invitations
                    .filter((i) => i.status === "pending")
                    .map((invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                        <div className="flex items-center gap-4">
                          <Mail className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{invitation.email}</p>
                            <p className="text-sm text-muted-foreground">
                              Invited as {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                              • Expires {formatDate(invitation.expiresAt)}
                            </p>
                          </div>
                          <span className={cn("px-2 py-1 text-xs font-medium rounded-full", getStatusBadge(invitation.status))}>
                            {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRevokeInvitation(invitation.id)}
                          disabled={revokeInvitation.isPending}
                          className="text-destructive hover:text-destructive"
                        >
                          {revokeInvitation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                        </Button>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invite Member Modal */}
          {showInviteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>Invite Team Member</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onInviteSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="colleague@example.com"
                        {...register("email", {
                          required: "Email is required",
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: "Invalid email address",
                          },
                        })}
                        disabled={createInvitation.isPending}
                        aria-invalid={!!errors.email}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive" role="alert">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        {...register("role", { required: "Role is required" })}
                        disabled={createInvitation.isPending}
                        aria-invalid={!!errors.role}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.role && (
                        <p className="text-sm text-destructive" role="alert">{errors.role.message}</p>
                      )}
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => { setShowInviteModal(false); reset(); }}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createInvitation.isPending} className="flex-1">
                        {createInvitation.isPending ? (
                          <>
                            <Spinner size="sm" className="mr-2" />
                            Sending...
                          </>
                        ) : (
                          "Send Invitation"
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Confirmation Dialog */}
          {confirmAction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>
                    {confirmAction.type === "remove" ? "Remove Member" : "Transfer Ownership"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert variant={confirmAction.type === "remove" ? "destructive" : "default"}>
                    <AlertDescription>
                      {confirmAction.type === "remove"
                        ? `Are you sure you want to remove ${confirmAction.member.firstName} ${confirmAction.member.lastName} from the workspace? This action cannot be undone.`
                        : `Are you sure you want to transfer ownership to ${confirmAction.member.firstName} ${confirmAction.member.lastName}? You will become an Admin.`}
                    </AlertDescription>
                  </Alert>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setConfirmAction(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant={confirmAction.type === "remove" ? "destructive" : "default"}
                      onClick={confirmAction.type === "remove" ? handleRemoveMember : handleTransferOwnership}
                      disabled={removeMember.isPending || transferOwnership.isPending}
                    >
                      {confirmAction.type === "remove" ? "Remove" : "Transfer"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </PageLayout>
    </div>
  );
}