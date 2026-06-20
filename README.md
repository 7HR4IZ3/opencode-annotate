# OpenCode Annotate

OpenCode Annotate is a small Bun monorepo for sending browser UI feedback directly into an OpenCode session. It has two runtime pieces:

- `@opencode-annotate/plugin`: an OpenCode plugin that starts a local WebSocket server, creates annotation sessions, and forwards annotations into the active OpenCode session.
- `@opencode-annotate/client`: a browser script that adds an annotation toolbar to a page, captures selected elements, and sends comments plus optional screenshots to the plugin.

The `shared` workspace contains internal protocol types for repo development. It is not published to npm.

## Repository Layout

```text
.
├── plugin/      OpenCode plugin, session management, WebSocket server
├── client/      Browser annotation library and built browser bundle
├── shared/      Shared TypeScript message and session types
├── docs/plans/  Design and implementation notes
└── test.html    Local browser fixture for trying the client bundle
```

## How It Works

1. OpenCode loads the plugin.
2. The plugin starts a WebSocket server on the first available port in `10300-10399`.
3. Run `/annotate` in OpenCode, or call the `annotate_create_session` tool, to create a session code.
4. Add the browser client to the page with that session code.
5. The client connects over WebSocket, adds a draggable annotation toolbar, and lets you select elements.
6. Annotations are sent as either a single `annotate` message or an `annotate_batch` message.
7. The plugin formats the page, element selector, text, position, screenshot, and user comment into a prompt for the current OpenCode session.

Screenshots are captured in the browser with `html2canvas`. The plugin saves received screenshots under the OS temp directory, then references them in the OpenCode prompt with `file://` image links.

The plugin binds to the first available port in `10300-10399`. If `10300` is already used by another OpenCode process, use the exact `data-server` URL returned by `/annotate`.

## Development Install

Install workspace dependencies from the repo root:

```bash
bun install
```

Build the packages:

```bash
cd plugin
bun run build

cd ../client
bun run build
```

## Install The Published Packages

Install the browser client package in the app you want to annotate:

```bash
bun add @opencode-annotate/client
```

Configure the OpenCode plugin package:

```json
{
  "plugin": ["@opencode-annotate/plugin"]
}
```

Restart OpenCode after changing the plugin list.

## Use The Plugin Locally

Add the local plugin package to your OpenCode configuration:

```json
{
  "plugin": ["file:///path/to/opencode-annotate-plugin/plugin"]
}
```

Use the published-package config above when you are not developing from this repo.

## Start An Annotation Session

In OpenCode, run:

```text
/annotate
```

You can also request a specific session code:

```text
/annotate mycode
```

The command creates a session and returns the WebSocket URL plus browser integration examples.

## Add The Browser Client

When installed from npm, use the package browser bundle:

```html
<script
  src="./node_modules/@opencode-annotate/client/dist/annotate.global.js"
  data-session="YOUR_SESSION_CODE"
  data-server="ws://localhost:10300"
  data-screenshots="true"
  data-debug="false"
></script>
```

`data-server` is optional only when the plugin is listening on `ws://localhost:10300`. In script-tag auto-initialization, set `data-screenshots="true"` to enable screenshot capture, `data-debug="true"` to enable browser console diagnostics, and `data-hotkeys="false"` to disable global hotkeys.

For bundled apps, import the published ESM entry:

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

The global browser bundle also exposes `window.AnnotateClient` for manual initialization in non-module pages.

## Browser Workflow

- Open the annotation toolbar by clicking the floating orb.
- Enable element selection from the toolbar, or double-click the orb.
- Toggle annotation mode with `Cmd+Shift+A` on macOS or `Ctrl+Shift+A` on Windows/Linux.
- Hover the page to highlight elements, then click an element to annotate it.
- Drag a box over the page to select elements fully contained inside the box. The selected elements stay highlighted while the popup is open.
- Press `Enter` in the popup to add the annotation. Press `Shift+Enter` for a newline.
- Use the popup `x` button or `Escape` to cancel the annotation.
- Use `Queue` mode to collect multiple annotations and send them together.
- Use `Steer` mode to send each annotation immediately.
- Queued annotations are stored in `sessionStorage` per session and page path so they can be restored after disconnects or reloads.

## Development

Useful package commands:

```bash
bun run build
bun run pack:dry-run
```

To publish both packages after logging in to the npm registry:

```bash
cd plugin
bun publish --access public

cd ../client
bun publish --access public
```

Publish `@opencode-annotate/plugin` and `@opencode-annotate/client` with matching versions. The internal `@opencode-annotate/shared` workspace is private and is not published.

Package-local commands are also available:

```bash
bun run build
bun run pack:dry-run
```

To try the browser UI locally, build the client and open `test.html` in a browser. The fixture currently uses:

```html
<script src="client/dist/annotate.global.js" data-session="test" data-screenshots="true" data-debug="true"></script>
```

Create a matching session in OpenCode with `/annotate test`.

## Package Docs

- [Plugin README](plugin/README.md)
- [Client README](client/README.md)

## License

MIT
