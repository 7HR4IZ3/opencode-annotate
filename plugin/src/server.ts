import { WebSocketServer, WebSocket } from "ws"
import { getSession, deleteSession } from "./session"

const PORT_RANGE = { min: 10300, max: 10399 }
const CONNECTION_TIMEOUT_MS = 30000 // 30 seconds

export interface Logger {
  log: (entry: { level: string; message: string }) => Promise<void>
}

export interface AnnotateServer {
  port: number
  close: () => Promise<void>
}

export async function createAnnotateServer(
  onAnnotation: (session: any, message: any) => Promise<void>,
  logger: Logger
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

  await logger.log({
    level: "info",
    message: `[annotate] WebSocket server listening on port ${port}`,
  })

  wss.on("connection", (ws: WebSocket) => {
    let sessionCode: string | null = null

    // Set connection timeout
    const timeout = setTimeout(() => {
      if (!sessionCode) {
        ws.close(1000, "Connection timeout - no session assigned")
      }
    }, CONNECTION_TIMEOUT_MS)

    ws.on("message", async (data: Buffer) => {
      const raw = data.toString()
      await logger.log({
        level: "info",
        message: `[annotate] Raw WS message (${raw.length} bytes): ${raw.substring(0, 500)}`,
      })

      try {
        const message = JSON.parse(raw)

        await logger.log({
          level: "info",
          message: `[annotate] Parsed message: type=${message.type}, sessionCode=${message.sessionCode}`,
        })

        if (message.type === "ping") {
          if (message.sessionCode && !sessionCode) {
            const session = getSession(message.sessionCode)
            if (session) {
              sessionCode = message.sessionCode
              session.clients.add(ws)
              clearTimeout(timeout)
            }
          }
          ws.send(JSON.stringify({ type: "pong" }))
          return
        }

        if (message.type === "annotate" || message.type === "annotate_batch") {
          const session = getSession(message.sessionCode)
          if (!session) {
            await logger.log({
              level: "error",
              message: `[annotate] Session not found: ${message.sessionCode}`,
            })
            const error = {
              type: "error",
              code: "INVALID_SESSION",
              message: `Session ${message.sessionCode} not found. Run /annotate to create a new session.`,
            }
            ws.send(JSON.stringify(error))
            return
          }

          // Store session code for this connection
          sessionCode = message.sessionCode
          session.clients.add(ws)
          clearTimeout(timeout)

          await logger.log({
            level: "info",
            message: `[annotate] Processing annotation for session ${session.code}...`,
          })

          try {
            await onAnnotation(session, message)
          } catch (e) {
            await logger.log({
              level: "error",
              message: `[annotate] Error processing annotation: ${e}`,
            })

            ws.send(JSON.stringify({
              type: "error",
              code: "ANNOTATION_FAILED",
              message: "Failed to send annotation to the active opencode session. Your annotations were kept in the browser for retry.",
            }))
            return
          }

          // Send ack
          const ack = {
            type: "ack",
            messageId: message.clientMessageId || `msg_${Date.now()}`,
          }
          ws.send(JSON.stringify(ack))
          return
        }

        ws.send(JSON.stringify({
          type: "error",
          code: "UNKNOWN_MESSAGE_TYPE",
          message: `Unknown message type: ${message.type}`,
        }))
      } catch (e) {
        await logger.log({
          level: "error",
          message: `[annotate] Error processing message: ${e}`,
        })

        const error = {
          type: "error",
          code: "PARSE_ERROR",
          message: "Invalid message format. Expected JSON with type field.",
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
        wss?.close(() => resolve())
      }),
  }
}
