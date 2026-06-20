import { WebSocketServer, WebSocket } from "ws"
import type { ClientMessage, ServerMessage, Session } from "@opencode-annotate/shared/types"
import { getSession, deleteSession } from "./session"

const PORT_RANGE = { min: 10300, max: 10399 }

export interface AnnotateServer {
  port: number
  close: () => Promise<void>
}

export async function createAnnotateServer(
  onAnnotation: (session: Session, message: ClientMessage) => Promise<void>
): Promise<AnnotateServer> {
  let port = PORT_RANGE.min
  let wss: WebSocketServer | null = null

  // Try ports in range
  while (port <= PORT_RANGE.max) {
    try {
      wss = await new Promise<WebSocketServer>((resolve, reject) => {
        const server = new WebSocketServer({ port }, () => {
          resolve(server)
        })
        server.on("error", reject)
      })
      break
    } catch (e) {
      port++
    }
  }

  if (!wss) {
    throw new Error(`No available port in range ${PORT_RANGE.min}-${PORT_RANGE.max}`)
  }

  console.log(`[annotate] WebSocket server listening on port ${port}`)

  wss.on("connection", (ws: WebSocket) => {
    let sessionCode: string | null = null

    ws.on("message", async (data: Buffer) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString())

        if (message.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }))
          return
        }

        if (message.type === "annotate") {
          const session = getSession(message.sessionCode)
          if (!session) {
            const error: ServerMessage = {
              type: "error",
              code: "INVALID_SESSION",
              message: `Session ${message.sessionCode} not found`,
            }
            ws.send(JSON.stringify(error))
            return
          }

          // Store session code for this connection
          sessionCode = message.sessionCode
          session.clients.add(ws)

          // Process annotation
          await onAnnotation(session, message)

          // Send ack
          const ack: ServerMessage = {
            type: "ack",
            messageId: `msg_${Date.now()}`,
          }
          ws.send(JSON.stringify(ack))
        }
      } catch (e) {
        const error: ServerMessage = {
          type: "error",
          code: "PARSE_ERROR",
          message: "Invalid message format",
        }
        ws.send(JSON.stringify(error))
      }
    })

    ws.on("close", () => {
      if (sessionCode) {
        const session = getSession(sessionCode)
        if (session) {
          session.clients.delete(ws)
          if (session.clients.size === 0) {
            // Keep session alive for reconnections
            setTimeout(() => {
              const s = getSession(sessionCode!)
              if (s && s.clients.size === 0) {
                deleteSession(sessionCode!)
              }
            }, 30000) // 30s grace period
          }
        }
      }
    })
  })

  return {
    port,
    close: () =>
      new Promise((resolve) => {
        wss?.close(resolve)
      }),
  }
}
