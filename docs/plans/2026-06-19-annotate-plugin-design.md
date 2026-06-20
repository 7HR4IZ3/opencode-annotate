# OpenCode Annotate Plugin - Design Document

**Date**: 2026-06-19
**Status**: Approved

## Overview

A two-part system that bridges browser UI annotations with OpenCode AI context:

1. **Browser JS Library** — Vanilla JS library for highlighting UI elements, capturing screenshots, and sending annotations
2. **OpenCode Plugin** — TypeScript plugin that receives annotations via WebSocket and delivers context-rich messages to the AI agent

## Architecture

### Monorepo Structure

```
opencode-annotate-plugin/
├── plugin/                    # OpenCode plugin
│   ├── src/
│   │   ├── index.ts          # Plugin entry
│   │   ├── server.ts         # Single WS server
│   │   ├── session.ts        # Session + client management
│   │   ├── commands.ts       # /annotate command
│   │   └── types.ts          # Types
│   ├── package.json
│   └── tsconfig.json
├── client/                    # Browser JS library
│   ├── src/
│   │   ├── index.ts          # Entry point
│   │   ├── annotator.ts      # Element selection + highlighting
│   │   ├── popup.ts          # Annotation UI
│   │   ├── capture.ts        # html2canvas screenshot
│   │   ├── ws-client.ts      # WebSocket client
│   │   └── styles.ts         # Injected CSS
│   ├── package.json
│   └── tsconfig.json
├── shared/                    # Shared types
│   └── types.ts              # WebSocket protocol types
└── package.json               # Root workspace
```

## WebSocket Protocol

### Connection Flow

```
Browser                          Plugin (WS Server)
  │                                   │
  │──── ws://localhost:10300 ────────>│
  │                                   │
  │<──── { type: "welcome", ─────────│
  │        sessionCode: "ann_a3Bx9K" }│
  │                                   │
  │──── { type: "annotate", ─────────>│
  │        sessionCode: "ann_a3Bx9K", │
  │        page: { url, title },      │
  │        element: {                 │
  │          selector: "div.main > h1",│
  │          text: "Click here",      │
  │          rect: { x, y, w, h }     │
  │        },                         │
  │        annotation: "This should   │
  │          be blue",                │
  │        screenshot: "base64..." }  │
  │                                   │
  │<──── { type: "ack", ─────────────│
  │        messageId: "msg_001" }     │
```

### Message Types

| Direction | Type | Purpose |
|-----------|------|---------|
| S→C | `welcome` | Server confirms connection, returns session code |
| C→S | `annotate` | Client sends annotation with context |
| S→C | `ack` | Server confirms receipt |
| S→C | `error` | Server reports error |
| C→S | `ping` | Keepalive |
| S→C | `pong` | Keepalive response |

### Session Code Format

`ann_{6-char-alphanumeric}` — e.g., `ann_a3Bx9K`
- Prefix `ann_` identifies annotation sessions
- 6 chars = ~2.1B combinations, collision-resistant

## Plugin Architecture

### Key Components

**`index.ts`** — Plugin entry
- Registers `/annotate` command
- Starts WebSocket server on plugin load
- Handles session lifecycle

**`server.ts`** — Single WebSocket server
- Runs on port 10300-10399 (configurable)
- Accepts connections with valid session codes
- Validates session code on `annotate` messages
- Forwards annotation to OpenCode session

**`session.ts`** — Session management
- Maintains `Map<sessionCode, Session>`
- Each session tracks connected clients and message history
- Generates unique session codes

### Port Configuration

- Default range: `10300-10399`
- Try 10300, fallback to 10301, etc.
- Configurable via environment: `ANNOTATE_PORT=10350`

## Browser Library

### User Flow

```
1. User adds <script> tag with data-session="ann_a3Bx9K"
                        │
2. Library connects to ws://localhost:10300
                        │
3. User clicks element → yellow highlight border
                        │
4. Popup appears with:
   ├── Element selector: div.main > h1:nth-child(2)
   ├── Element text: "Click here"
   ├── Screenshot (auto-captured)
   └── Text input: "This should be blue"
                        │
5. User clicks "Send to Agent"
                        │
6. Library captures screenshot via html2canvas
                        │
7. Sends via WebSocket to plugin
```

### Element Selection

- **Hover**: Blue outline on hover
- **Click**: Yellow highlight + popup
- **Escape**: Cancel selection, remove highlight

### CSS Strategy

- Inject `<style>` tag with unique prefix
- All styles scoped: `.annotate-popup`, `.annotate-highlight`, etc.
- Z-index: `2147483647` (max safe value)

## Data Flow

### Context Message Format

```markdown
## UI Annotation

**Page**: http://localhost:3000/dashboard
**Element**: `div.main > h1:nth-child(2)`
**Element Text**: "Click here"
**Element Position**: x=120, y=340, 200×40px

**Screenshot**:
[base64 image]

**User Annotation**:
This button should be blue

---

Please review this UI annotation and help resolve it.
```

### Session Lifecycle

1. `/annotate` → Creates session, returns code
2. Browser connects → Client added to session
3. Annotation arrives → Context built, sent to agent
4. Agent responds → Response sent back to browser (future)
5. Session ends → Client disconnected, cleanup

## Error Handling

| Scenario | Browser Behavior | Plugin Behavior |
|----------|------------------|-----------------|
| WS connection fails | Console error, retry 3x with backoff | Log error |
| Invalid session code | Close connection, show toast | Reject, log warning |
| Screenshot capture fails | Send without screenshot, warn user | Accept, note missing screenshot |
| Plugin not running | Connection refused, show "Start plugin" message | N/A |
| Multiple browsers same code | All receive annotations | All clients in same session |

### Retry Strategy

```
Attempt 1: Immediate
Attempt 2: After 1s
Attempt 3: After 2s
Give up: Show "Connection failed" toast
```

## Dependencies

### Plugin

- `@opencode-ai/plugin` — Type definitions
- `ws` — WebSocket server

### Client

- `html2canvas` — Screenshot capture
- No other dependencies (vanilla JS)

## Future Considerations

- Agent response sent back to browser
- Multiple annotation sessions in parallel
- Annotation history/persistence
- Integration with issue trackers
