import 'vitest/browser'

declare module 'vitest/browser' {
  interface BrowserCommands {
    setReducedMotion(reduced: boolean): Promise<void>
    serverMarkup(): Promise<string>
    compareAdapters(): Promise<boolean>
  }
}
