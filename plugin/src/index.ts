import type { Plugin } from "@opencode-ai/plugin"
import { createAnnotateServer, type AnnotateServer } from "./server"
import { createAnnotateCommand } from "./commands"
import type { ClientMessage, Session } from "@opencode-annotate/shared/types"

export const AnnotatePlugin: Plugin = async (ctx) => {
  const { client } = ctx

  // Log plugin initialization
  await client.app.log({
    level: "info",
    message: "[annotate] Plugin initializing...",
  })

  // Start WebSocket server inside plugin scope (not module-level)
  let server: AnnotateServer | null = null

  // Create logger wrapper for server
  const logger = {
    log: async (entry: { level: string; message: string }) => {
      await client.app.log(entry)
    },
  }

  try {
    server = await createAnnotateServer(
      async (session: Session, message: ClientMessage) => {
        if (message.type === "annotate") {
          // Build context message for the agent
          const context = [
            `## UI Annotation`,
            ``,
            `**Page**: ${message.page.url}`,
            `**Page Title**: ${message.page.title}`,
            `**Element**: \`${message.element.selector}\``,
            `**Element Text**: "${message.element.text}"`,
            `**Element Position**: x=${message.element.rect.x}, y=${message.element.rect.y}, ${message.element.rect.width}×${message.element.rect.height}px`,
            ``,
          ]

          if (message.screenshot) {
            context.push(`**Screenshot**:`)
            context.push(`![annotation screenshot](${message.screenshot})`)
            context.push(``)
          }

          context.push(`**User Annotation**:`)
          context.push(message.annotation)
          context.push(``)
          context.push(`---`)
          context.push(`Please review this UI annotation and help resolve it.`)

          // Send to OpenCode session with error handling
          try {
            await client.session.prompt({
              messages: [
                {
                  role: "user",
                  content: context.join("\n"),
                },
              ],
            })

            await client.app.log({
              level: "info",
              message: `[annotate] Annotation sent to session ${session.code}`,
            })
          } catch (error) {
            await client.app.log({
              level: "error",
              message: `[annotate] Failed to send annotation: ${error}`,
            })
          }
        }
      },
      logger
    )

    await client.app.log({
      level: "info",
      message: `[annotate] WebSocket server listening on port ${server.port}`,
    })
  } catch (error) {
    await client.app.log({
      level: "error",
      message: `[annotate] Failed to start server: ${error}`,
    })
    throw error // Re-throw to fail plugin initialization
  }

  return {
    ...createAnnotateCommand(server),
  }
  // No cleanup needed - OpenCode manages plugin lifecycle
}
