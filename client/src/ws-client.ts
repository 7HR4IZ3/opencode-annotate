import type { ClientMessage, ServerMessage } from "@opencode-annotate/shared/types"

export interface WSClientOptions {
  session: string
  server: string
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
}

export class WSClient {
  private ws: WebSocket | null = null
  private options: WSClientOptions
  private retryCount = 0
  private maxRetries = 3
  private retryDelays = [0, 1000, 2000]
  public session: string

  constructor(options: WSClientOptions) {
    this.options = options
    this.session = options.session
  }

  connect(): void {
    this.ws = new WebSocket(this.options.server)

    this.ws.onopen = () => {
      console.log("[annotate] Connected to server")
      this.retryCount = 0
      this.options.onConnect?.()
    }

    this.ws.onclose = () => {
      console.log("[annotate] Disconnected from server")
      this.options.onDisconnect?.()
      this.attemptReconnect()
    }

    this.ws.onerror = (error) => {
      console.error("[annotate] WebSocket error:", error)
      this.options.onError?.(error)
    }

    this.ws.onmessage = (event) => {
      const message: ServerMessage = JSON.parse(event.data)
      this.handleMessage(message)
    }
  }

  private handleMessage(message: ServerMessage): void {
    switch (message.type) {
      case "welcome":
        console.log(`[annotate] Session: ${message.sessionCode}`)
        break
      case "ack":
        console.log(`[annotate] Message sent: ${message.messageId}`)
        break
      case "error":
        console.error(`[annotate] Server error: ${message.message}`)
        break
      case "pong":
        // Keepalive response
        break
    }
  }

  private attemptReconnect(): void {
    if (this.retryCount >= this.maxRetries) {
      console.error("[annotate] Max retries reached, giving up")
      return
    }

    const delay = this.retryDelays[this.retryCount]
    console.log(`[annotate] Reconnecting in ${delay}ms... (attempt ${this.retryCount + 1})`)

    setTimeout(() => {
      this.retryCount++
      this.connect()
    }, delay)
  }

  send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.error("[annotate] Not connected")
    }
  }

  disconnect(): void {
    this.ws?.close()
    this.ws = null
  }
}
