import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { TeamPage } from "./team-page"
import { useAuthStore } from "@/stores/auth.store"
import { useOrganizationStore } from "@/stores/organization.store"
import type { Organization } from "@/types/organization.types"
import type { User } from "@/types/auth.types"

const mutation = () => ({ mutateAsync: vi.fn(), isPending: false })
const hooks = vi.hoisted(() => ({
  createInvitation: { mutateAsync: undefined as unknown as ReturnType<typeof vi.fn>, isPending: false },
  members: [] as Array<Record<string, string>>,
}))

vi.mock("@/hooks", () => ({
  useMembers: () => ({ data: hooks.members, isLoading: false, error: null }),
  useInvitations: () => ({ data: [], isLoading: false, error: null }),
  useCreateInvitation: () => hooks.createInvitation,
  useRevokeInvitation: () => mutation(),
  useUpdateMemberRole: () => mutation(),
  useRemoveMember: () => mutation(),
  useTransferOwnership: () => mutation(),
}))

const member = (userId: string, role: string) => ({
  userId,
  email: `${userId}@example.test`,
  firstName: userId,
  lastName: "Tester",
  role,
  joinedAt: "2026-11-01T00:00:00Z",
})

function renderAs(userId: string) {
  useAuthStore.setState({ user: { id: userId } as User })
  useOrganizationStore.setState({
    currentOrganization: { id: "ws-1", name: "Acme", slug: "acme" } as Organization,
  })
  return render(
    <MemoryRouter>
      <TeamPage />
    </MemoryRouter>,
  )
}

describe("TeamPage permissions", () => {
  beforeEach(() => {
    hooks.members = [member("owner", "owner"), member("admin", "admin"), member("member", "member")]
    hooks.createInvitation = { mutateAsync: vi.fn(), isPending: false }
  })

  it("owners see the invite button and can manage other members", () => {
    renderAs("owner")
    expect(screen.getByRole("button", { name: /invite member/i })).toBeTruthy()
    expect(screen.getAllByText("More options")).toHaveLength(2)
  })

  it("admins can invite but only manage plain members", () => {
    renderAs("admin")
    expect(screen.getByRole("button", { name: /invite member/i })).toBeTruthy()
    expect(screen.getAllByText("More options")).toHaveLength(1)
  })

  it("members see neither invite nor management controls", () => {
    renderAs("member")
    expect(screen.queryByRole("button", { name: /invite member/i })).toBeNull()
    expect(screen.queryByText("More options")).toBeNull()
  })
})

describe("TeamPage invite link", () => {
  beforeEach(() => {
    hooks.members = [member("owner", "owner")]
    hooks.createInvitation = { mutateAsync: vi.fn(), isPending: false }
  })

  it("shows the shareable link after creating an invitation and copies it", async () => {
    const inviteUrl = "http://localhost:5173/accept-invitation?token=abc"
    hooks.createInvitation.mutateAsync.mockResolvedValue({ id: "inv-1", inviteUrl })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })

    renderAs("owner")
    fireEvent.click(screen.getByRole("button", { name: /invite member/i }))
    fireEvent.change(screen.getByPlaceholderText("colleague@example.com"), {
      target: { value: "new.person@example.test" },
    })
    fireEvent.click(screen.getByRole("button", { name: /create invitation/i }))

    const link = (await screen.findByLabelText("Invitation link")) as HTMLInputElement
    expect(link.value).toBe(inviteUrl)
    expect(hooks.createInvitation.mutateAsync).toHaveBeenCalledWith({
      workspaceId: "ws-1",
      dto: { email: "new.person@example.test", role: "member" },
    })

    fireEvent.click(screen.getByRole("button", { name: /copy/i }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(inviteUrl))

    fireEvent.click(screen.getByRole("button", { name: /done/i }))
    expect(screen.queryByLabelText("Invitation link")).toBeNull()
  })
})
