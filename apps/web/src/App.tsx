import { RouterProvider } from "react-router"
import { Toaster } from "@/components/ui/toaster-sonner"
import { router } from "@/app/router"

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  )
}

export default App