import type { WebSocket } from "ws"

export interface Session {
  code: string
  clients: Set<WebSocket>
  createdAt: Date
}

const sessions = new Map<string, Session>()

export function createSession(code: string): Session {
  const session: Session = {
    code,
    clients: new Set(),
    createdAt: new Date(),
  }
  sessions.set(code, session)
  return session
}

export function getSession(code: string): Session | undefined {
  return sessions.get(code)
}

export function getOrCreateSession(code: string): Session {
  return getSession(code) ?? createSession(code)
}

export function deleteSession(code: string): void {
  sessions.delete(code)
}

export function generateSessionCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let code = "ann_"
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  // Ensure unique
  if (sessions.has(code)) {
    return generateSessionCode()
  }
  return code
}

export function getAllSessions(): Map<string, Session> {
  return sessions
}
