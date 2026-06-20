import type { Plugin } from "@opencode-ai/plugin"
import { createAnnotateServer, type AnnotateServer } from "./server"
import { createAnnotateCommand } from "./commands"
import type { ClientMessage, Session } from "@opencode-annotate/shared/types"

let server: AnnotateServer | null = null

export const AnnotatePlugin: Plugin = async (ctx) => {
  const { client } = ctx

  // Start WebSocket server
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

        // Send to OpenCode session
        await client.session.prompt({
          messages: [
            {
              role: "user",
              content: context.join("\n"),
            },
          ],
        })
      }
    }
  )

  return {
    ...createAnnotateCommand(server),
  }
}

// Cleanup on plugin unload
process.on("SIGINT", async () => {
  await server?.close()
  process.exit(0)
})
