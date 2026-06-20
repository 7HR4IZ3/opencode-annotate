import { generateSessionCode, createSession } from "./session"
import type { AnnotateServer } from "./server"

export function createAnnotateCommand(server: AnnotateServer) {
  return {
    annotate: {
      description:
        "Start an annotation session. Returns a session code to use in the browser JS library.",
      async execute() {
        const code = generateSessionCode()
        createSession(code)

        return [
          `## Annotation Session Ready`,
          ``,
          `**Session Code**: \`${code}\``,
          `**WebSocket**: \`ws://localhost:${server.port}\``,
          ``,
          `### Usage`,
          ``,
          `Add this to your HTML page:`,
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
          `  server: "ws://localhost:${server.port}"`,
          `})`,
          "```",
        ].join("\n")
      },
    },
  }
}
