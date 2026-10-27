import 'vitest/browser'

declare module 'vitest/browser' {
  interface BrowserCommands {
    setReducedMotion(reduced: boolean): Promise<void>
  }
}
