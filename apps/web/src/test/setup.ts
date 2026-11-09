import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

// Unmount rendered trees between tests (no global test APIs are enabled).
afterEach(() => {
  cleanup()
  localStorage.clear()
})

// jsdom lacks a few browser APIs that Radix primitives rely on.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
}
if (!("ResizeObserver" in globalThis)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
    ResizeObserverStub
}
