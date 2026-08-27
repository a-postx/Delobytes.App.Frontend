import { vi } from 'vitest'

Object.defineProperty(window, 'location', {
  value: {
    hostname: 'localhost',
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000'
  },
  writable: true
})

global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}
