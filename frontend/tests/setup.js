import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import 'vitest-canvas-mock'
import { afterEach } from 'vitest'

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

afterEach(() => {
  cleanup()
})
