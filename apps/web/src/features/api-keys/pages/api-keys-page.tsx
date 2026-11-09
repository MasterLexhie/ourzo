"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/layout/page-layout";
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "@/hooks";
import { useOrganizationStore } from "@/stores/organization.store";
import { cn } from "@/lib/utils";
import { Plus, Key, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

const SCOPE_OPTIONS = [
  { value: "projects:read", label: "Projects: Read" },
  { value: "projects:write", label: "Projects: Write" },
  { value: "tasks:read", label: "Tasks: Read" },
  { value: "tasks:write", label: "Tasks: Write" },
  { value: "members:read", label: "Members: Read" },
  { value: "usage:read", label: "Usage: Read" },
  { value: "audit:read", label: "Audit Logs: Read" },
];

export function ApiKeysPage() {
  const { currentOrganization } = useOrganizationStore();
  const workspaceId = currentOrganization?.id;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState<{ key: string; name: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const { data: apiKeysData, isLoading, error } = useApiKeys(workspaceId ?? "");
  const apiKeys = apiKeysData?.apiKeys ?? [];
  const createApiKey = useCreateApiKey();
  const revokeApiKey = useRevokeApiKey();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<{ name: string; scopes: string[]; expiresAt: string }>({
    defaultValues: { name: "", scopes: [], expiresAt: "" },
  });

  const selectedScopes = watch("scopes");

  const onSubmit = async (data: { name: string; scopes: string[]; expiresAt: string }) => {
    if (!workspaceId) return;
    try {
      const result = await createApiKey.mutateAsync({
        workspaceId,
        dto: {
          name: data.name,
          scopes: data.scopes.map((s) => ({ scope: s })),
          expiresAt: data.expiresAt || undefined,
        },
      });
      setShowKeyModal({ key: result.key, name: result.name });
      setShowCreateModal(false);
      reset();
      toast.success("API key created successfully");
    } catch {
      toast.error("Failed to create API key");
    }
  };

  const handleRevoke = async () => {
    if (!workspaceId || !confirmRevoke) return;
    try {
      await revokeApiKey.mutateAsync({ workspaceId, keyId: confirmRevoke });
      toast.success("API key revoked");
      setConfirmRevoke(null);
    } catch {
      toast.error("Failed to revoke API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
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
          <AlertDescription>Failed to load API keys. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
              <p className="text-muted-foreground mt-1">
                Manage API keys for programmatic access to your workspace
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your API Keys</CardTitle>
              <CardDescription>
                API keys allow external applications to access your workspace data.
                Keys are shown only once upon creation - store them securely.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {apiKeys && apiKeys.length > 0 ? (
                <div className="space-y-4">
                  {apiKeys.map((key) => (
                    <Card key={key.id} className={cn(key.revokedAt && "opacity-50")}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Key className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{key.name}</h4>
                                {key.revokedAt && (
                                  <Badge variant="destructive">Revoked</Badge>
                                )}
                                {key.expiresAt && !key.revokedAt && new Date(key.expiresAt) < new Date() && (
                                  <Badge variant="destructive">Expired</Badge>
                                )}
                                {!key.revokedAt && (!key.expiresAt || new Date(key.expiresAt) > new Date()) && (
                                  <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    Active
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground font-mono mt-1">
                                {key.keyPrefix}••••••••
                              </p>
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                {key.scopes.map((s) => (
                                  <Badge key={s.scope} variant="outline">{s.scope}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {key.lastUsedAt && (
                              <span className="text-xs text-muted-foreground">
                                Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(key.keyPrefix + "••••••••")}
                              disabled={!!key.revokedAt || createApiKey.isPending}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {!key.revokedAt && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setConfirmRevoke(key.id)}
                                disabled={revokeApiKey.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No API keys yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Create an API key to enable programmatic access to your workspace.
                  </p>
                  <Button onClick={() => setShowCreateModal(true)} size="lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Create API Key
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageLayout>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create API Key</CardTitle>
              <CardDescription>
                Choose a name and scopes for your new API key. The key will be shown only once.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Key name</Label>
                  <Input
                    id="name"
                    placeholder="Production API Key"
                    {...register("name", {
                      required: "Key name is required",
                      maxLength: { value: 150, message: "Name too long" },
                    })}
                    disabled={createApiKey.isPending}
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive" role="alert">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Scopes</Label>
                  <div className="grid gap-2 md:grid-cols-2">
                    {SCOPE_OPTIONS.map((scope) => (
                      <label
                        key={scope.value}
                        className={cn(
                          "flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-colors",
                          selectedScopes.includes(scope.value)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        <Checkbox
                          checked={selectedScopes.includes(scope.value)}
                          onCheckedChange={(checked: boolean) => {
                            if (checked) {
                              setValue("scopes", [...selectedScopes, scope.value], { shouldValidate: true });
                            } else {
                              setValue("scopes", selectedScopes.filter((s) => s !== scope.value), { shouldValidate: true });
                            }
                          }}
                        />
                        <span className="text-sm">{scope.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.scopes && (
                    <p className="text-sm text-destructive" role="alert">{errors.scopes.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Expiration (optional)</Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    {...register("expiresAt")}
                    disabled={createApiKey.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for no expiration
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setShowCreateModal(false); reset(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createApiKey.isPending} className="flex-1">
                    {createApiKey.isPending ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Creating...
                      </>
                    ) : (
                      "Create API Key"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Show Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Key className="h-5 w-5" />
                Your API Key
              </CardTitle>
              <CardDescription>
                <strong>{showKeyModal.name}</strong> - Copy this key now. It will not be shown again.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-muted rounded-lg border">
                <code className="flex-1 font-mono text-sm break-all">{showKeyModal.key}</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(showKeyModal.key)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <Alert variant="default">
                <AlertDescription>
                  Store this key securely. It provides access to your workspace data with the selected scopes.
                  You can revoke it at any time from the API Keys page.
                </AlertDescription>
              </Alert>
              <Button className="w-full" onClick={() => setShowKeyModal(null)}>
                I've copied the key
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revoke Confirmation Dialog */}
      {confirmRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Revoke API Key</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>
                  Are you sure you want to revoke this API key? This action cannot be undone.
                  Any applications using this key will immediately lose access.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setConfirmRevoke(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => { handleRevoke(); setConfirmRevoke(null); }}
                  disabled={revokeApiKey.isPending}
                >
                  {revokeApiKey.isPending ? "Revoking..." : "Revoke"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}