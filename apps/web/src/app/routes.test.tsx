import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { ProtectedRoute } from "./routes"
import { useAuthStore } from "@/stores/auth.store"

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>Login screen</div>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Secret dashboard</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe("ProtectedRoute", () => {
  it("redirects unauthenticated users to /login", () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: false, initializeAuth: async () => {} })
    renderAt("/dashboard")
    expect(screen.getByText("Login screen")).toBeTruthy()
    expect(screen.queryByText("Secret dashboard")).toBeNull()
  })

  it("renders the page for authenticated users", () => {
    useAuthStore.setState({ isAuthenticated: true, isLoading: false, initializeAuth: async () => {} })
    renderAt("/dashboard")
    expect(screen.getByText("Secret dashboard")).toBeTruthy()
  })

  it("shows a spinner while the session is being restored", () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: true, initializeAuth: async () => {} })
    renderAt("/dashboard")
    expect(screen.queryByText("Login screen")).toBeNull()
    expect(screen.queryByText("Secret dashboard")).toBeNull()
  })
})
