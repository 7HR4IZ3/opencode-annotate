# OpenCode Annotate Plugin - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a browser annotation library + OpenCode plugin that captures UI element annotations with screenshots and sends them as context-rich messages to the AI agent.

**Architecture:** Monorepo with shared types. Browser library (vanilla JS) connects via WebSocket to plugin server. Plugin receives annotations and delivers them to OpenCode sessions.

**Tech Stack:** TypeScript, Bun, WebSocket (ws), html2canvas, @opencode-ai/plugin

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json` (root)
- Create: `plugin/package.json`
- Create: `plugin/tsconfig.json`
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `shared/types.ts`

**Step 1: Create root package.json**

```json
{
  "name": "opencode-annotate-plugin",
  "private": true,
  "workspaces": ["plugin", "client", "shared"]
}
```

**Step 2: Create plugin/package.json**

```json
{
  "name": "@opencode-annotate/plugin",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "bun build src/index.ts --outdir dist --target bun --format esm",
    "dev": "bun --watch src/index.ts"
  },
  "dependencies": {
    "@opencode-ai/plugin": "latest",
    "ws": "^8.16.0"
  },
  "devDependencies": {
    "@types/ws": "^8.5.10",
    "typescript": "^5.3.3"
  }
}
```

**Step 3: Create plugin/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}
```

**Step 4: Create client/package.json**

```json
{
  "name": "@opencode-annotate/client",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "bun build src/index.ts --outdir dist --target browser --format esm",
    "dev": "bun --watch src/index.ts"
  },
  "dependencies": {
    "html2canvas": "^1.4.1"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
```

**Step 5: Create client/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src/**/*.ts"]
}
```

**Step 6: Create shared/types.ts**

```typescript
// WebSocket message types
export interface WelcomeMessage {
  type: "welcome"
  sessionCode: string
}

export interface AnnotateMessage {
  type: "annotate"
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
  screenshot: string | null // base64 or null if capture failed
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
}

export interface PongMessage {
  type: "pong"
}

export type ClientMessage = AnnotateMessage | PingMessage
export type ServerMessage = WelcomeMessage | AckMessage | ErrorMessage | PongMessage

// Session types
export interface Session {
  code: string
  clients: Set<WebSocket>
  createdAt: Date
}

// Plugin context
export interface AnnotatePluginContext {
  port: number
  sessions: Map<string, Session>
}
```

**Step 7: Install dependencies**

Run: `bun install`
Expected: Dependencies installed successfully

**Step 8: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold monorepo with plugin, client, and shared types"
```

---

## Task 2: Plugin - WebSocket Server

**Files:**
- Create: `plugin/src/server.ts`
- Create: `plugin/src/session.ts`
- Modify: `plugin/src/index.ts` (will create in Task 4)

**Step 1: Create plugin/src/session.ts**

```typescript
import type { Session } from "@opencode-annotate/shared/types"

const sessions = new Map<string, Session>()

export function createSession(code: string): Session {
  const session: Session = {
    code,
    clients: new Set(),
    createdAt: new Date(),
  }
  sessions.set(code, session)
  return session
}

export function getSession(code: string): Session | undefined {
  return sessions.get(code)
}

export function deleteSession(code: string): void {
  sessions.delete(code)
}

export function generateSessionCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let code = "ann_"
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  // Ensure unique
  if (sessions.has(code)) {
    return generateSessionCode()
  }
  return code
}

export function getAllSessions(): Map<string, Session> {
  return sessions
}
```

**Step 2: Create plugin/src/server.ts**

```typescript
import { WebSocketServer, WebSocket } from "ws"
import type { Server } from "http"
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
```

**Step 3: Commit**

```bash
git add plugin/src/session.ts plugin/src/server.ts
git commit -m "feat: add WebSocket server and session management"
```

---

## Task 3: Plugin - /annotate Command

**Files:**
- Create: `plugin/src/commands.ts`

**Step 1: Create plugin/src/commands.ts**

```typescript
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
```

**Step 2: Commit**

```bash
git add plugin/src/commands.ts
git commit -m "feat: add /annotate command"
```

---

## Task 4: Plugin - Entry Point

**Files:**
- Create: `plugin/src/index.ts`

**Step 1: Create plugin/src/index.ts**

```typescript
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
```

**Step 2: Commit**

```bash
git add plugin/src/index.ts
git commit -m "feat: add plugin entry point with annotation handling"
```

---

## Task 5: Client - WebSocket Client

**Files:**
- Create: `client/src/ws-client.ts`

**Step 1: Create client/src/ws-client.ts**

```typescript
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

  constructor(options: WSClientOptions) {
    this.options = options
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
```

**Step 2: Commit**

```bash
git add client/src/ws-client.ts
git commit -m "feat: add WebSocket client with retry logic"
```

---

## Task 6: Client - Element Annotator

**Files:**
- Create: `client/src/annotator.ts`

**Step 1: Create client/src/annotator.ts**

```typescript
export interface AnnotatedElement {
  element: Element
  selector: string
  text: string
  rect: DOMRect
}

export class Annotator {
  private highlight: HTMLElement | null = null
  private currentElement: Element | null = null
  private onSelect: (element: AnnotatedElement) => void
  private onKeyDown: (e: KeyboardEvent) => void
  private onMouseMove: (e: MouseEvent) => void
  private onClick: (e: MouseEvent) => void

  constructor(onSelect: (element: AnnotatedElement) => void) {
    this.onSelect = onSelect
    this.onKeyDown = this.handleKeyDown.bind(this)
    this.onMouseMove = this.handleMouseMove.bind(this)
    this.onClick = this.handleClick.bind(this)
  }

  start(): void {
    document.addEventListener("keydown", this.onKeyDown)
    document.addEventListener("mousemove", this.onMouseMove)
    document.addEventListener("click", this.onClick, true)
    document.body.style.cursor = "crosshair"
  }

  stop(): void {
    document.removeEventListener("keydown", this.onKeyDown)
    document.removeEventListener("mousemove", this.onMouseMove)
    document.removeEventListener("click", this.onClick, true)
    document.body.style.cursor = ""
    this.removeHighlight()
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      this.stop()
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const target = e.target as Element
    if (target && target !== this.currentElement) {
      this.currentElement = target
      this.showHighlight(target)
    }
  }

  private handleClick(e: MouseEvent): void {
    e.preventDefault()
    e.stopPropagation()

    const target = e.target as Element
    if (!target) return

    const annotated: AnnotatedElement = {
      element: target,
      selector: this.getSelector(target),
      text: target.textContent?.trim() || "",
      rect: target.getBoundingClientRect(),
    }

    this.stop()
    this.onSelect(annotated)
  }

  private showHighlight(element: Element): void {
    this.removeHighlight()

    const rect = element.getBoundingClientRect()
    this.highlight = document.createElement("div")
    this.highlight.setAttribute("data-annotate-highlight", "")
    Object.assign(this.highlight.style, {
      position: "fixed",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      border: "2px solid #3b82f6",
      backgroundColor: "rgba(59, 130, 246, 0.1)",
      pointerEvents: "none",
      zIndex: "2147483647",
    })
    document.body.appendChild(this.highlight)
  }

  private removeHighlight(): void {
    this.highlight?.remove()
    this.highlight = null
  }

  private getSelector(element: Element): string {
    const parts: string[] = []
    let current: Element | null = element

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase()

      if (current.id) {
        selector = `#${current.id}`
        parts.unshift(selector)
        break
      }

      const parent = current.parentElement
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (c) => c.tagName === current!.tagName
        )
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1
          selector += `:nth-child(${index})`
        }
      }

      parts.unshift(selector)
      current = current.parentElement
    }

    return parts.join(" > ")
  }
}
```

**Step 2: Commit**

```bash
git add client/src/annotator.ts
git commit -m "feat: add element annotator with CSS selector generation"
```

---

## Task 7: Client - Screenshot Capture

**Files:**
- Create: `client/src/capture.ts`

**Step 1: Create client/src/capture.ts**

```typescript
import html2canvas from "html2canvas"

export async function captureElement(element: Element): Promise<string | null> {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: null, // Transparent background
      scale: 2, // Higher resolution
      useCORS: true, // Allow cross-origin images
    })
    return canvas.toDataURL("image/png")
  } catch (error) {
    console.error("[annotate] Screenshot capture failed:", error)
    return null
  }
}
```

**Step 2: Commit**

```bash
git add client/src/capture.ts
git commit -m "feat: add html2canvas screenshot capture"
```

---

## Task 8: Client - Annotation Popup

**Files:**
- Create: `client/src/popup.ts`

**Step 1: Create client/src/popup.ts**

```typescript
import type { AnnotatedElement } from "./annotator"

export interface AnnotationPopupOptions {
  element: AnnotatedElement
  screenshot: string | null
  onSubmit: (annotation: string) => void
  onCancel: () => void
}

export function showAnnotationPopup(options: AnnotationPopupOptions): void {
  const { element, screenshot, onSubmit, onCancel } = options

  // Create overlay
  const overlay = document.createElement("div")
  overlay.setAttribute("data-annotate-popup", "")
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "2147483647",
  })

  // Create popup
  const popup = document.createElement("div")
  Object.assign(popup.style, {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    padding: "16px",
    width: "400px",
    maxHeight: "80vh",
    overflow: "auto",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
    fontFamily: "system-ui, -apple-system, sans-serif",
  })

  popup.innerHTML = `
    <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #111827;">
      Add Annotation
    </h3>
    <div style="margin-bottom: 12px;">
      <label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;">
        Element
      </label>
      <code style="display: block; font-size: 12px; background: #f3f4f6; padding: 8px; border-radius: 4px; word-break: break-all;">
        ${element.selector}
      </code>
    </div>
    ${
      screenshot
        ? `
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;">
          Screenshot
        </label>
        <img src="${screenshot}" style="max-width: 100%; border-radius: 4px; border: 1px solid #e5e7eb;" />
      </div>
    `
        : ""
    }
    <div style="margin-bottom: 12px;">
      <label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;">
        Annotation
      </label>
      <textarea
        id="annotate-input"
        style="width: 100%; height: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; resize: vertical; box-sizing: border-box;"
        placeholder="Describe what needs to be changed..."
      ></textarea>
    </div>
    <div style="display: flex; gap: 8px; justify-content: flex-end;">
      <button
        id="annotate-cancel"
        style="padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 4px; background: #fff; cursor: pointer; font-size: 14px;"
      >
        Cancel
      </button>
      <button
        id="annotate-submit"
        style="padding: 8px 16px; border: none; border-radius: 4px; background: #3b82f6; color: #fff; cursor: pointer; font-size: 14px;"
      >
        Send to Agent
      </button>
    </div>
  `

  overlay.appendChild(popup)
  document.body.appendChild(overlay)

  // Focus textarea
  const textarea = popup.querySelector("#annotate-input") as HTMLTextAreaElement
  textarea.focus()

  // Handle cancel
  popup.querySelector("#annotate-cancel")!.addEventListener("click", () => {
    overlay.remove()
    onCancel()
  })

  // Handle submit
  popup.querySelector("#annotate-submit")!.addEventListener("click", () => {
    const annotation = textarea.value.trim()
    if (annotation) {
      overlay.remove()
      onSubmit(annotation)
    }
  })

  // Handle escape
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      overlay.remove()
      document.removeEventListener("keydown", handleEscape)
      onCancel()
    }
  }
  document.addEventListener("keydown", handleEscape)
}
```

**Step 2: Commit**

```bash
git add client/src/popup.ts
git commit -m "feat: add annotation popup UI"
```

---

## Task 9: Client - Styles

**Files:**
- Create: `client/src/styles.ts`

**Step 1: Create client/src/styles.ts**

```typescript
const STYLES = `
  [data-annotate-highlight] {
    position: fixed;
    pointer-events: none;
    z-index: 2147483647;
  }

  [data-annotate-popup] {
    font-family: system-ui, -apple-system, sans-serif;
  }
`

export function injectStyles(): void {
  if (document.querySelector("style[data-annotate-styles]")) {
    return // Already injected
  }

  const style = document.createElement("style")
  style.setAttribute("data-annotate-styles", "")
  style.textContent = STYLES
  document.head.appendChild(style)
}
```

**Step 2: Commit**

```bash
git add client/src/styles.ts
git commit -m "feat: add injected styles for annotations"
```

---

## Task 10: Client - Entry Point

**Files:**
- Create: `client/src/index.ts`

**Step 1: Create client/src/index.ts**

```typescript
import { WSClient, type WSClientOptions } from "./ws-client"
import { Annotator, type AnnotatedElement } from "./annotator"
import { captureElement } from "./capture"
import { showAnnotationPopup } from "./popup"
import { injectStyles } from "./styles"

export interface AnnotateClientOptions {
  session: string
  server?: string
}

let wsClient: WSClient | null = null
let annotator: Annotator | null = null

export function init(options: AnnotateClientOptions): void {
  const { session, server = "ws://localhost:10300" } = options

  injectStyles()

  wsClient = new WSClient({
    session,
    server,
    onConnect: () => {
      console.log(`[annotate] Ready to annotate (session: ${session})`)
    },
    onDisconnect: () => {
      console.log("[annotate] Disconnected")
    },
  })

  wsClient.connect()

  // Start annotator
  annotator = new Annotator(handleElementSelect)
  annotator.start()

  console.log("[annotate] Click on any element to annotate it. Press Escape to cancel.")
}

async function handleElementSelect(element: AnnotatedElement): Promise<void> {
  if (!wsClient) {
    console.error("[annotate] Not initialized")
    return
  }

  // Capture screenshot
  const screenshot = await captureElement(element.element)

  // Show popup
  showAnnotationPopup({
    element,
    screenshot,
    onSubmit: (annotation: string) => {
      wsClient!.send({
        type: "annotate",
        session: wsClient!.session,
        page: {
          url: window.location.href,
          title: document.title,
        },
        element: {
          selector: element.selector,
          text: element.text,
          rect: {
            x: element.rect.x,
            y: element.rect.y,
            width: element.rect.width,
            height: element.rect.height,
          },
        },
        annotation,
        screenshot,
      })

      // Restart annotator
      annotator?.start()
    },
    onCancel: () => {
      // Restart annotator
      annotator?.start()
    },
  })
}

// Auto-initialize from script tag
if (typeof document !== "undefined") {
  const script = document.querySelector("script[data-session]")
  if (script) {
    const session = script.getAttribute("data-session")
    const server = script.getAttribute("data-server")
    if (session) {
      init({
        session,
        server: server || undefined,
      })
    }
  }
}

export { WSClient, Annotator, captureElement, showAnnotationPopup }
```

**Step 2: Commit**

```bash
git add client/src/index.ts
git commit -m "feat: add client entry point with auto-initialization"
```

---

## Task 11: Build and Test

**Step 1: Build plugin**

Run: `cd plugin && bun run build`
Expected: `dist/index.js` created

**Step 2: Build client**

Run: `cd client && bun run build`
Expected: `dist/index.js` created

**Step 3: Create test HTML file**

Create: `test.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Annotate Test</title>
  <style>
    body { font-family: system-ui; padding: 40px; }
    .card { border: 1px solid #ccc; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    button { padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Annotate Plugin Test</h1>
  <div class="card">
    <h2>Sample Card</h2>
    <p>This is a test card. Click on any element to annotate it.</p>
    <button>Click Me</button>
  </div>
  <script src="client/dist/index.js" data-session="TEST_SESSION"></script>
</body>
</html>
```

**Step 4: Commit**

```bash
git add test.html
git commit -m "feat: add test HTML page"
```

---

## Task 12: Documentation

**Files:**
- Create: `README.md`

**Step 1: Create README.md**

```markdown
# OpenCode Annotate Plugin

A browser annotation library + OpenCode plugin that captures UI element annotations with screenshots and sends them as context-rich messages to the AI agent.

## Installation

### Plugin

Add to your `opencode.json`:

```json
{
  "plugin": ["@opencode-annotate/plugin"]
}
```

Or for local development:

```json
{
  "plugin": ["file:///path/to/opencode-annotate-plugin/plugin"]
}
```

### Client Library

Add to your HTML:

```html
<script src="path/to/annotate.js" data-session="YOUR_SESSION_CODE"></script>
```

## Usage

1. Start OpenCode and run `/annotate`
2. Copy the session code
3. Add the script tag to your page with the session code
4. Click on any element to annotate it
5. Write your annotation and click "Send to Agent"

## Development

```bash
# Install dependencies
bun install

# Build plugin
cd plugin && bun run build

# Build client
cd client && bun run build
```

## License

MIT
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with installation and usage instructions"
```

---

## Execution Options

Plan complete and saved to `docs/plans/2026-06-19-annotate-plugin-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
