import { useState } from "react"
import { describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { SlugInput } from "./slug-input"

function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return <SlugInput value={value} onChange={setValue} />
}

describe("SlugInput", () => {
  it("renders the ourzo.app/ prefix as a separate addon", () => {
    render(<Harness />)
    expect(screen.getByText("ourzo.app/")).toBeTruthy()
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("")
  })

  it("sanitizes on input and trims dashes on blur", () => {
    render(<Harness />)
    const input = screen.getByRole("textbox") as HTMLInputElement
    fireEvent.change(input, { target: { value: "My-Team!-" } })
    expect(input.value).toBe("my-team-")
    fireEvent.blur(input)
    expect(input.value).toBe("my-team")
  })
})
