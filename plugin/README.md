# @opencode-annotate/plugin

This package is the OpenCode side of the annotation flow. It starts a local WebSocket server, creates short-lived annotation sessions, receives browser messages, and forwards formatted UI context into the active OpenCode session.

## Install

Add the published package to your OpenCode configuration:

```json
{
  "plugin": ["@opencode-annotate/plugin"]
}
```

Restart OpenCode after changing plugin configuration.

## Responsibilities

- Start a WebSocket server on the first available port from `10300` to `10399`.
- Install an `annotate.md` command file into OpenCode's command directory when possible.
- Expose the `annotate_create_session` tool.
- Track session codes and connected browser clients.
- Accept `annotate`, `annotate_batch`, and `ping` WebSocket messages.
- Save incoming screenshots to the OS temp directory and include them as `file://` links in the generated prompt.
- Send `ack` messages only after annotation delivery succeeds.

## Files

```text
src/index.ts    Plugin entrypoint, tool registration, prompt formatting
src/server.ts   WebSocket server, message parsing, acks, errors, reconnect grace
src/session.ts  In-memory session creation and lookup
src/commands.ts Older command helper retained in the package
```

## Build

```bash
bun run build
```

The build writes `dist/index.js` and `dist/index.d.ts`.

Check the npm package contents without publishing:

```bash
bun run pack:dry-run
```

Publish after logging in to the npm registry:

```bash
bun publish --access public
```

## OpenCode Configuration

For local development:

```json
{
  "plugin": ["file:///path/to/opencode-annotate-plugin/plugin"]
}
```

Use the published-package config above when you are not developing from this repo.

## Creating Sessions

Run the installed slash command:

```text
/annotate
```

Or provide a custom code:

```text
/annotate checkout-flow
```

Internally, the command asks the model to call `annotate_create_session`. The tool accepts an optional `code` argument. If no code is provided, the plugin generates one with an `ann_` prefix and six random alphanumeric characters.

## WebSocket Protocol

The plugin expects JSON messages matching the protocol documented by `@opencode-annotate/client`.

Supported client messages:

- `ping`: binds a connection to a session when `sessionCode` is valid and responds with `pong`.
- `annotate`: sends one element annotation.
- `annotate_batch`: sends multiple queued annotations in one message.

Server responses:

- `pong`: heartbeat response.
- `ack`: annotation or batch was delivered to OpenCode.
- `error`: invalid session, delivery failure, parse failure, or unknown message type.

Connections that do not bind to a session within 30 seconds are closed. Empty sessions are deleted after a 30 second reconnect grace period.

## Prompt Delivery

When an annotation arrives, the plugin builds a Markdown prompt containing:

- Page URL and title.
- Element selector.
- Element text.
- Element bounding box.
- Screenshot image link when capture succeeded.
- User annotation text.

The prompt is submitted to the first session returned by `client.session.list()`.

## Failure Behavior

If delivery to OpenCode fails, the plugin sends:

```json
{
  "type": "error",
  "code": "ANNOTATION_FAILED",
  "message": "Failed to send annotation to the active opencode session. Your annotations were kept in the browser for retry."
}
```

The client uses that response to restore pending queued annotations for retry.
