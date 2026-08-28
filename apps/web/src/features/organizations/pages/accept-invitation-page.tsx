"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAcceptInvitation } from "@/hooks";
import { PageLayout } from "@/components/layout/page-layout";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "idle">("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [invitationDetails, setInvitationDetails] = useState<{ workspaceName: string; email: string } | null>(null);

  const { mutateAsync: acceptInvitation } = useAcceptInvitation();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Invalid invitation link. No token provided.");
      return;
    }

    const accept = async () => {
      setStatus("loading");
      try {
        const result = await acceptInvitation({ token });
        setInvitationDetails({ workspaceName: result.workspaceName, email: result.workspaceId });
        setStatus("success");
        toast.success("Invitation accepted successfully");
        setTimeout(() => navigate("/dashboard"), 2000);
      } catch (err: unknown) {
        const apiError = err as { response?: { data?: { message?: string } }; message?: string };
        setErrorMessage(apiError.response?.data?.message ?? apiError.message ?? "Failed to accept invitation");
        setStatus("error");
      }
    };

    accept();
  }, [token, acceptInvitation, navigate]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
        <PageLayout maxWidth="sm">
          <Card>
            <CardContent className="pt-6 text-center">
              <Spinner size="lg" className="mx-auto mb-4" />
              <p className="text-muted-foreground">Accepting invitation...</p>
            </CardContent>
          </Card>
        </PageLayout>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
        <PageLayout maxWidth="sm">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Invitation Accepted</CardTitle>
              <CardDescription>
                Welcome to {invitationDetails?.workspaceName}! Redirecting to dashboard...
              </CardDescription>
              <Separator className="my-6" />
              <Button onClick={() => navigate("/dashboard")} className="w-full">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </PageLayout>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
        <PageLayout maxWidth="sm">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl">Unable to Accept Invitation</CardTitle>
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
              <Separator className="my-6" />
              <Button variant="outline" onClick={() => navigate("/login")} className="w-full">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </PageLayout>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <PageLayout maxWidth="sm">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-yellow-600 animate-spin" />
            </div>
            <CardTitle className="text-2xl">Loading...</CardTitle>
          </CardContent>
        </Card>
      </PageLayout>
    </div>
  );
}