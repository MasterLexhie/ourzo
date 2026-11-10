import { describe, expect, it } from "vitest"
import { finalizeSlug, sanitizeSlugInput, slugify, SLUG_PATTERN } from "./slug"

describe("slug helpers", () => {
  it("slugify builds a URL slug from a workspace name", () => {
    expect(slugify("Carol Labs")).toBe("carol-labs")
    expect(slugify("  Acme & Co. (EU)  ")).toBe("acme-co-eu")
  })

  it("sanitizeSlugInput lowercases and strips characters but keeps dashes while typing", () => {
    expect(sanitizeSlugInput("My-Team!")).toBe("my-team")
    expect(sanitizeSlugInput("my-")).toBe("my-")
    expect(sanitizeSlugInput("a--b")).toBe("a-b")
  })

  it("finalizeSlug trims leading and trailing dashes", () => {
    expect(finalizeSlug("-my-team-")).toBe("my-team")
    expect(SLUG_PATTERN.test(finalizeSlug("-my-team-"))).toBe(true)
  })
})
