import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { ProjectDetailPage } from "./project-detail-page"
import { useAuthStore } from "@/stores/auth.store"
import { useOrganizationStore } from "@/stores/organization.store"
import type { Organization } from "@/types/organization.types"
import type { User } from "@/types/auth.types"

const mocks = vi.hoisted(() => ({
  createTask: { mutateAsync: undefined as unknown as ReturnType<typeof vi.fn>, isPending: false },
}))

const mutation = () => ({ mutateAsync: vi.fn(), isPending: false })

vi.mock("@/hooks", () => ({
  useProject: () => ({
    data: {
      id: "p-1",
      workspaceId: "ws-1",
      name: "Launch",
      description: null,
      status: "planned",
      startDate: null,
      targetDate: null,
      members: [{ userId: "u-1", email: "owner@example.test", firstName: "Olive", lastName: "Owner" }],
    },
    isLoading: false,
    error: null,
  }),
  useProjectProgress: () => ({ data: { totalTasks: 0, completedTasks: 0, progress: 0 } }),
  useTasks: () => ({ data: [], isLoading: false, error: null }),
  useCreateTask: () => mocks.createTask,
  useUpdateTask: () => mutation(),
  useDeleteTask: () => mutation(),
  useMembers: () => ({ data: [{ userId: "u-1", role: "owner", firstName: "Olive", lastName: "Owner", email: "owner@example.test" }] }),
  useAddProjectMembers: () => mutation(),
  useRemoveProjectMember: () => mutation(),
}))

/** Opens a Radix Select by its trigger and picks an option by visible label. */
async function choose(trigger: HTMLElement, optionLabel: string) {
  act(() => {
    trigger.focus()
  })
  fireEvent.keyDown(trigger, { key: "Enter" })
  const listbox = await screen.findByRole("listbox")
  fireEvent.click(within(listbox).getByRole("option", { name: optionLabel }))
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
}

describe("ProjectDetailPage task form", () => {
  beforeEach(() => {
    mocks.createTask = { mutateAsync: vi.fn().mockResolvedValue({ id: "t-1" }), isPending: false }
    useAuthStore.setState({ user: { id: "u-1" } as User })
    useOrganizationStore.setState({
      currentOrganization: { id: "ws-1", name: "Acme", slug: "acme" } as Organization,
    })
  })

  it("submits the selected status and priority", async () => {
    render(
      <MemoryRouter initialEntries={["/projects/p-1"]}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole("button", { name: /new task/i }))
    fireEvent.change(screen.getByPlaceholderText("Task title"), { target: { value: "Ship it" } })

    await choose(screen.getByRole("combobox", { name: "Status" }), "Blocked")
    await choose(screen.getByRole("combobox", { name: "Priority" }), "High")

    fireEvent.click(screen.getByRole("button", { name: /create task/i }))

    await waitFor(() =>
      expect(mocks.createTask.mutateAsync).toHaveBeenCalledWith({
        workspaceId: "ws-1",
        dto: expect.objectContaining({
          projectId: "p-1",
          title: "Ship it",
          status: "blocked",
          priority: "high",
          assigneeId: undefined,
        }) as unknown,
      }),
    )
  })
})
