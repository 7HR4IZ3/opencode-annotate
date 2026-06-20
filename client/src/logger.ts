let debugEnabled = false

export function setDebugEnabled(enabled: boolean): void {
  debugEnabled = enabled
}

export function isDebugEnabled(): boolean {
  return debugEnabled
}

export function debugLog(...args: unknown[]): void {
  if (debugEnabled) console.log(...args)
}

export function debugWarn(...args: unknown[]): void {
  if (debugEnabled) console.warn(...args)
}

export function debugError(...args: unknown[]): void {
  if (debugEnabled) console.error(...args)
}
