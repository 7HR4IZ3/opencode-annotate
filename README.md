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
