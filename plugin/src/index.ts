import type { Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin/tool";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { createAnnotateServer, type AnnotateServer, type Logger } from "./server";
import { createSession, generateSessionCode } from "./session";

const __dirname = dirname(fileURLToPath(import.meta.url))

type AnnotationPayload = {
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

function saveScreenshot(base64Data: string, sessionCode: string): string | null {
  try {
    const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "")
    const buffer = Buffer.from(base64Content, "base64")

    const tempDir = join(tmpdir(), "opencode-annotate")
    mkdirSync(tempDir, { recursive: true })

    const timestamp = Date.now()
    const filename = `screenshot-${sessionCode}-${timestamp}.png`
    const filepath = join(tempDir, filename)

    writeFileSync(filepath, buffer)
    return filepath
  } catch (error) {
    return null
  }
}

const ANNOTATE_COMMAND = `---
description: Start an annotation session for UI element annotations
---

## Usage

- \`/annotate\` — Creates a new session with a random code
- \`/annotate mycode\` — Creates a new session with custom code \`mycode\`

## Instructions

1. If the user provides a code after the command, pass it as the \`code\` argument to \`annotate_create_session\`
2. If no code is provided, call \`annotate_create_session\` without arguments (generates random code)
3. After creating the session, provide the user with:
   - The session code
   - Instructions to add the script tag to their HTML page (server defaults to \`ws://localhost:10300\` — no need to specify \`data-server\`)
   - Instructions to initialize the client manually

## Example Output Format

\`\`\`
## Annotation Session Created

**Session Code**: \`mycode\`

### Browser Integration

Add this script tag to your HTML page:

<script src="path/to/annotate.js" data-session="mycode"></script>

Or initialize manually:

AnnotateClient.init({
  session: "mycode",
})
\`\`\`
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
      writeFileSync(destFile, ANNOTATE_COMMAND)
    }
  } catch {}
}

export const AnnotatePlugin: Plugin = async (ctx) => {
  const { client } = ctx

  await client.app.log({
    body: {
      service: "annotate",
      level: "info",
      message: "[annotate] Plugin initializing...",
    }
  })

  installCommand(client)

  let server: AnnotateServer | null = null

  const logger: Logger = {
    log: async (entry) => {
      await client.app.log({
        body: {
          service: "annotate",
          level: entry.level as "debug" | "info" | "error" | "warn",
          message: entry.message,
        }
      })
    },
  }

  try {
    server = await createAnnotateServer(
      async (session, message) => {
        await client.app.log({
          body: {
            service: "annotate",
            level: "info",
            message: `[annotate] === ON ANNOTATION CALLBACK ENTERED ===`,
          }
        })

        await client.app.log({
          body: {
            service: "annotate",
            level: "info",
            message: `[annotate] Session: ${session.code}, type: ${message.type}`,
          }
        })

        if (message.type === "annotate" || message.type === "annotate_batch") {
          await client.app.log({
            body: {
              service: "annotate",
              level: "info",
              message: `[annotate] Building context...`,
            }
          })

          const annotations: AnnotationPayload[] =
            message.type === "annotate_batch"
              ? message.annotations
              : [
                  {
                    element: message.element,
                    annotation: message.annotation,
                    screenshot: message.screenshot,
                  },
                ]

          const context = [
            message.type === "annotate_batch" ? `## UI Annotations` : `## UI Annotation`,
            ``,
            `**Page**: ${message.page.url}`,
            `**Page Title**: ${message.page.title}`,
            ``,
          ]

          annotations.forEach((annotation, index) => {
            if (annotations.length > 1) {
              context.push(`### Annotation ${index + 1}`)
            }
            context.push(`**Element**: \`${annotation.element.selector}\``)
            context.push(`**Element Text**: "${annotation.element.text}"`)
            context.push(`**Element Position**: x=${annotation.element.rect.x}, y=${annotation.element.rect.y}, ${annotation.element.rect.width}×${annotation.element.rect.height}px`)
            context.push(``)

            if (annotation.screenshot) {
              const screenshotPath = saveScreenshot(annotation.screenshot, session.code)
              if (screenshotPath) {
                context.push(`**Screenshot**:`)
                context.push(`![annotation screenshot](file://${screenshotPath})`)
                context.push(``)
              }
            }

            context.push(`**User Annotation**:`)
            context.push(annotation.annotation)
            context.push(``)
          })

          context.push(``)
          context.push(`---`)
          context.push(
            annotations.length > 1
              ? `Please review these UI annotations together and help resolve them.`
              : `Please review this UI annotation and help resolve it.`
          )

          await client.app.log({
            body: {
              service: "annotate",
              level: "info",
              message: `[annotate] Context built, getting sessions...`,
            }
          })

          try {
            // Get current session ID
            const sessions = await client.session.list()
            const sessionIds = sessions.data?.map((s: any) => s.id) || []

            await client.app.log({
              body: {
                service: "annotate",
                level: "info",
                message: `[annotate] Sessions found: ${sessionIds.join(", ")}`,
              }
            })

            const currentSession = sessions.data?.[0]
            if (!currentSession) {
              await client.app.log({
                body: {
                  service: "annotate",
                  level: "error",
                  message: `[annotate] No active session found`,
                }
              })
              throw new Error("No active session found")
            }

            await client.app.log({
              body: {
                service: "annotate",
                level: "info",
                message: `[annotate] Calling session.prompt for: ${currentSession.id}`,
              }
            })

            await client.session.prompt({
              path: { id: currentSession.id },
              body: {
                parts: [
                  {
                    type: "text",
                    text: context.join("\n"),
                  },
                ],
              },
            })

            await client.app.log({
              body: {
                service: "annotate",
                level: "info",
                message: `[annotate] Annotation sent successfully`,
              }
            })
          } catch (error) {
            await client.app.log({
              body: {
                service: "annotate",
                level: "error",
                message: `[annotate] Failed: ${error}`,
              }
            })
            throw error
          }
        }
      },
      logger
    )

    await client.app.log({
      body: {
        service: "annotate",
        level: "info",
        message: `[annotate] WebSocket server listening on port ${server.port}`,
      }
    })
  } catch (error) {
    await client.app.log({
      body: {
        service: "annotate",
        level: "error",
        message: `[annotate] Failed to start server: ${error}`,
      }
    })
    throw error
  }

  return {
    tool: {
      annotate_create_session: tool({
        description:
          "Create a new annotation session for UI element annotations. Returns a session code and connection details. Optionally pass a custom session code.",
        args: {
          code: tool.schema.string().describe("Optional custom session code. If not provided, a random code is generated.").optional(),
        },
        async execute(args) {
          try {
            const code = args.code || generateSessionCode()
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
              `<script src="path/to/annotate.js" data-session="${code}"></script>`,
              "```",
              ``,
              `Or initialize manually:`,
              ``,
              "```javascript",
              `AnnotateClient.init({`,
              `  session: "${code}",`,
              `  // server defaults to ws://localhost:10300`,
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
