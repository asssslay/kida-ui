import 'vitest/browser'

declare module 'vitest/browser' {
  interface BrowserCommands {
    touchTap(selector: string): Promise<void>
    touchDrag(
      selector: string,
      cancel: boolean,
    ): Promise<{ dragging: boolean; x: number; y: number }>
    setReducedMotion(reduced: boolean): Promise<void>
    serverMarkup(open: boolean): Promise<string>
    compareAdapters(): Promise<boolean>
  }
}
