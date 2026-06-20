export interface WelcomeMessage {
  type: "welcome"
  sessionCode: string
}

export interface AnnotateMessage {
  type: "annotate"
  clientMessageId?: string
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
  screenshot: string | null
}

export interface AnnotateBatchMessage {
  type: "annotate_batch"
  clientMessageId: string
  sessionCode: string
  page: {
    url: string
    title: string
  }
  annotations: Array<{
    element: AnnotateMessage["element"]
    annotation: string
    screenshot: string | null
  }>
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
  sessionCode?: string
}

export interface PongMessage {
  type: "pong"
}

export type ClientMessage = AnnotateMessage | AnnotateBatchMessage | PingMessage
export type ServerMessage = WelcomeMessage | AckMessage | ErrorMessage | PongMessage
