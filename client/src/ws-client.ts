import type { ClientMessage, ServerMessage } from "./types"

export interface WSClientOptions {
  session: string
  server: string
  onConnect?: () => void
  onDisconnect?: (event: CloseEvent) => void
  onError?: (error: Event) => void
  onAck?: (messageId: string) => void
  onServerError?: (message: string) => void
}

export class WSClient {
  private ws: WebSocket | null = null
  private options: WSClientOptions
  private retryCount = 0
  private maxRetries = 3
  private retryDelays = [0, 1000, 2000]
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect = true
  public session: string

  constructor(options: WSClientOptions) {
    this.options = options
    this.session = options.session
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  connect(): void {
    this.shouldReconnect = true
    this.ws = new WebSocket(this.options.server)

    this.ws.onopen = () => {
      this.sendPing()
      this.options.onConnect?.()
      this.startPing()
    }

    this.ws.onclose = (event) => {
      this.stopPing()
      this.options.onDisconnect?.(event)
      this.attemptReconnect()
    }

    this.ws.onerror = (error) => {
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
        break
      case "ack":
        this.options.onAck?.(message.messageId)
        break
      case "error":
        this.options.onServerError?.(message.message)
        break
      case "pong":
        break
    }
  }

  private attemptReconnect(): void {
    if (!this.shouldReconnect || this.retryCount >= this.maxRetries) {
      return
    }

    const delay = this.retryDelays[this.retryCount]

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.retryCount++
      this.connect()
    }, delay)
  }

  send(message: ClientMessage): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
      return true
    }
    return false
  }

  disconnect(): void {
    this.shouldReconnect = false
    this.stopPing()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.onopen = null
      this.ws.onclose = null
      this.ws.onerror = null
      this.ws.onmessage = null
      this.ws.close()
    }
    this.ws = null
  }

  private startPing(): void {
    this.stopPing()
    this.pingInterval = setInterval(() => {
      this.sendPing()
    }, 15000)
  }

  private sendPing(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "ping", sessionCode: this.session }))
    }
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }
}
