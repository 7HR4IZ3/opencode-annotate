// WebSocket message types
export interface WelcomeMessage {
  type: "welcome"
  sessionCode: string
}

export interface AnnotateMessage {
  type: "annotate"
  sessionCode: string
  page: {
    url: string
    title: string
  }
  element: {
    selector: string
    text: string
    rect: {
      x: number
      y: number
      width: number
      height: number
    }
  }
  annotation: string
  screenshot: string | null // base64 or null if capture failed
}

export interface AckMessage {
  type: "ack"
  messageId: string
}

export interface ErrorMessage {
  type: "error"
  code: string
  message: string
}

export interface PingMessage {
  type: "ping"
}

export interface PongMessage {
  type: "pong"
}

export type ClientMessage = AnnotateMessage | PingMessage
export type ServerMessage = WelcomeMessage | AckMessage | ErrorMessage | PongMessage

// Session types
export interface Session {
  code: string
  clients: Set<any> // WebSocket type
  createdAt: Date
}

// Plugin context
export interface AnnotatePluginContext {
  port: number
  sessions: Map<string, Session>
}
