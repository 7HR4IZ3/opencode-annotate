import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin/tool"
import { createAnnotateServer, type AnnotateServer, type Logger } from "./server"
import { generateSessionCode, createSession } from "./session"
import type { ClientMessage, Session } from "@opencode-annotate/shared/types"
import { mkdirSync, existsSync, copyFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

const ANNOTATE_COMMAND = `---
description: Start an annotation session for UI element annotations
---

Create a new annotation session using the \`annotate_create_session\` tool.

After creating the session, provide the user with:
1. The session code
2. The WebSocket URL (ws://localhost:10300)
3. Instructions to add the script tag to their HTML page
4. Instructions to initialize the client manually

Format the output as a clear guide with code examples.
`

async function installCommand(client: any) {
  try {
    const paths = await client.path.get()
    const configDir = paths.data?.config
    if (!configDir) return

    const commandDir = join(configDir, "command")
    mkdirSync(commandDir, { recursive: true })

    const destFile = join(commandDir, "annotate.md")
    if (!existsSync(destFile)) {
      Bun.write(destFile, ANNOTATE_COMMAND)
    }
  } catch {}
}

export const AnnotatePlugin: Plugin = async (ctx) => {
  const { client } = ctx

  await client.app.log({
    level: "info",
    message: "[annotate] Plugin initializing...",
  })

  installCommand(client)

  let server: AnnotateServer | null = null

  const logger: Logger = {
    log: async (entry) => {
      await client.app.log(entry)
    },
  }

  try {
    server = await createAnnotateServer(
      async (session: Session, message: ClientMessage) => {
        if (message.type === "annotate") {
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
    throw error
  }

  return {
    tool: {
      annotate_create_session: tool({
        description:
          "Create a new annotation session for UI element annotations. Returns a session code and connection details.",
        args: {},
        async execute() {
          try {
            const code = generateSessionCode()
            createSession(code)

            return [
              `## Annotation Session Created`,
              ``,
              `**Session Code**: \`${code}\``,
              `**WebSocket**: \`ws://localhost:${server.port}\``,
              ``,
              `### Browser Integration`,
              ``,
              `Add this script tag to your HTML page:`,
              ``,
              "```html",
              `<script src="path/to/annotate.js" data-session="${code}" data-server="ws://localhost:${server.port}"></script>`,
              "```",
              ``,
              `Or initialize manually:`,
              ``,
              "```javascript",
              `AnnotateClient.init({`,
              `  session: "${code}",`,
              `  server: "ws://localhost:${server.port}"`,
              `})`,
              "```",
            ].join("\n")
          } catch (error) {
            return `Failed to create annotation session: ${error}`
          }
        },
      }),
    },
  }
}

export default AnnotatePlugin
