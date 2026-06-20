# @opencode-annotate/client

This package is the browser-side annotation library. It builds to a browser IIFE that adds a floating toolbar, lets users select elements, captures comments and optional screenshots, and sends everything to the OpenCode Annotate plugin over WebSocket.

## Install

```bash
bun add @opencode-annotate/client
```

## Build Outputs

```text
dist/index.js            ESM package entry for bundlers
dist/index.d.ts          TypeScript declarations
dist/annotate.global.js  Browser global bundle for script tags
```

Build both outputs with:

```bash
bun run build
```

Check the npm package contents without publishing:

```bash
bun run pack:dry-run
```

Publish after logging in to the npm registry:

```bash
bun publish --access public
```

## Files

```text
src/index.ts      Public init function, queue state, caching, send logic
src/global.ts     Browser global entry that exposes window.AnnotateClient
src/types.ts      Client-local WebSocket protocol types
src/ws-client.ts  WebSocket wrapper, reconnects, heartbeat, acks
src/annotator.ts  Hover, click, drag-box selection, selector building
src/popup.ts      Inline editor and queue/steer switch
src/toolbar.ts    Floating draggable toolbar and queue controls
src/badges.ts     Numbered badges for queued annotations
src/capture.ts    html2canvas screenshot capture
src/logger.ts     DEBUG-gated browser logging
src/styles.ts     Injected scoped CSS
```

## Script Tag Usage

Add the built bundle to a page:

```html
<script
  src="./node_modules/@opencode-annotate/client/dist/annotate.global.js"
  data-session="YOUR_SESSION_CODE"
  data-server="ws://localhost:10300"
  data-screenshots="true"
  data-debug="false"
  data-hotkeys="true"
></script>
```

Attributes:

- `data-session`: required session code from `/annotate`.
- `data-server`: optional WebSocket URL. Defaults to `ws://localhost:10300`. Use the exact URL returned by `/annotate` when multiple OpenCode processes are running or the plugin binds to `10301+`.
- `data-screenshots`: set to `true` to enable screenshots when using script-tag auto-initialization.
- `data-debug`: set to `true` to enable browser console diagnostics. Defaults to `false`.
- `data-hotkeys`: set to `false` to disable global annotation hotkeys. Defaults to `true`.

The global bundle exposes `window.AnnotateClient`, so a non-module page can also initialize manually:

```html
<script src="./node_modules/@opencode-annotate/client/dist/annotate.global.js"></script>
<script>
  window.AnnotateClient.init({
    session: "YOUR_SESSION_CODE",
    server: "ws://localhost:10300",
    captureScreenshots: true,
    debug: false,
    hotkeys: true,
  })
</script>
```

## Module Usage

Bundled apps can import the ESM package entry:

```ts
import { init } from "@opencode-annotate/client"

init({
  session: "YOUR_SESSION_CODE",
  server: "ws://localhost:10300",
  captureScreenshots: true,
  debug: false,
  hotkeys: true,
})
```

Options:

- `session`: required session code.
- `server`: optional WebSocket URL. Defaults to `ws://localhost:10300`.
- `captureScreenshots`: optional boolean. Defaults to `true` for direct `init()` calls.
- `debug`: optional boolean. Defaults to `false`.
- `hotkeys`: optional boolean. Defaults to `true`.

The package also exports `teardown()` for explicitly disconnecting the WebSocket, removing the toolbar, clearing popup UI, and unregistering hotkeys before reinitializing.

## User Workflow

1. Click the floating orb to open the toolbar.
2. Enable annotation mode from the toolbar, or double-click the orb.
3. Toggle annotation mode with `Cmd+Shift+A` on macOS or `Ctrl+Shift+A` on Windows/Linux.
4. Hover elements to highlight them.
5. Click an element to open the annotation popup.
6. Drag a box to select elements fully contained inside that box.
7. Enter a comment and press `Enter`, or click the submit button.
8. Send immediately in `Steer` mode, or collect multiple annotations in `Queue` mode and click `Send`.

Queued annotations show numbered badges on their target elements. Clicking a badge reopens the annotation for editing.

Selected elements stay highlighted while the popup is open. Drag-box selections use a screenshot cropped to the selected page area when screenshots are enabled.

## Popup Controls

- `x`: cancel the annotation.
- Text input: write the annotation. `Enter` submits and `Shift+Enter` inserts a newline.
- Queue/steer icon: switch between queued batch mode and immediate send mode.
- Send icon: add or send the annotation.

## Modes

- `Queue`: stores annotations locally until the user sends them as one `annotate_batch` message.
- `Steer`: sends each annotation immediately as an `annotate` message.

The selected mode is cached in `sessionStorage` per session and page path.

## Persistence And Retry

The client stores unsent queued annotations in `sessionStorage` using keys scoped to:

- Session code.
- Page origin.
- Page path.

When a batch is sent, it is first copied to a pending cache. If the WebSocket disconnects, the server returns an error, or an ack is not received within 10 seconds, the pending annotations are restored so the user can retry.

## WebSocket Behavior

The client sends a `ping` with the session code after connecting, then every 15 seconds. It retries WebSocket connection attempts up to three times with delays of `0ms`, `1000ms`, and `2000ms`. Reinitializing the client calls `teardown()` first so old sockets and UI are removed before a new connection is created.

Annotation messages include:

- Current page URL and title.
- Generated CSS selector.
- Element text.
- Element bounding rectangle.
- User comment.
- Optional PNG data URL screenshot.

## Local Fixture

The repo root includes `test.html`, which loads:

```html
<script src="client/dist/annotate.global.js" data-session="test" data-screenshots="true" data-debug="true"></script>
```

To use it, build the client, start OpenCode with the plugin loaded, and create a matching session:

```text
/annotate test
```
