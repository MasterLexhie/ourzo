-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'member',
    "token" VARCHAR(255) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'pending',
    "invitedBy" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "acceptedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_workspaceId_idx" ON "invitations"("workspaceId");

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "invitations"("email");

-- CreateIndex
CREATE INDEX "invitations_token_idx" ON "invitations"("token");

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
