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
        sessionCode: wsClient!.session,
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

      // Restart annotator after a tick to avoid capturing the submit click
      setTimeout(() => annotator?.start(), 100)
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
