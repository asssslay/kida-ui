import 'vitest/browser'

declare module 'vitest/browser' {
  interface BrowserCommands {
    setReducedMotion(reduced: boolean): Promise<void>
    serverMarkup(open: boolean): Promise<string>
    compareAdapters(): Promise<boolean>
  }
}
