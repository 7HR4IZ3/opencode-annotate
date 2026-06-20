import { WSClient, type WSClientOptions } from "./ws-client"
import { Annotator, getAnnotatableElementText, type AnnotatedElement } from "./annotator"
import { captureArea, captureElement } from "./capture"
import { showAnnotationPopup } from "./popup"
import { injectStyles } from "./styles"
import { createToolbar, type ToolbarHandle } from "./toolbar"
import { BadgeManager, type QueueItem } from "./badges"
import { debugError, debugLog, debugWarn, setDebugEnabled } from "./logger"

export interface AnnotateClientOptions {
  session: string
  server?: string
  captureScreenshots?: boolean // default true, set false to skip base64 images
  debug?: boolean
  hotkeys?: boolean
}

let wsClient: WSClient | null = null
let annotator: Annotator | null = null
let toolbar: ToolbarHandle | null = null
let badgeManager: BadgeManager | null = null
let enabled = false
let mode: "queue" | "steer" = "queue"
let queue: QueueItem[] = []
let captureScreenshots = true
let debug = false
let hotkeys = true
let hotkeyListenerRegistered = false
let annotationCacheKey = ""
let pendingAnnotationCacheKey = ""
let modeCacheKey = ""
let pendingMessageId: string | null = null
let pendingSendTimer: number | null = null

interface CachedAnnotation {
  id: string
  selector: string
  text: string
  screenshot: string | null
  annotation: string
}

const ANNOTATION_CACHE_PREFIX = "opencode-annotate:annotations:"
const PENDING_ANNOTATION_CACHE_PREFIX = "opencode-annotate:pending-annotations:"
const MODE_CACHE_PREFIX = "opencode-annotate:mode:"

export function init(options: AnnotateClientOptions): void {
  teardown()

  const {
    session,
    server = "ws://localhost:10300",
    captureScreenshots: shouldCapture = true,
    debug: shouldDebug = false,
    hotkeys: shouldEnableHotkeys = true,
  } = options

  captureScreenshots = shouldCapture
  debug = shouldDebug
  hotkeys = shouldEnableHotkeys
  setDebugEnabled(debug)
  const cacheScope = getPageCacheScope()
  annotationCacheKey = `${ANNOTATION_CACHE_PREFIX}${session}:${cacheScope}`
  pendingAnnotationCacheKey = `${PENDING_ANNOTATION_CACHE_PREFIX}${session}:${cacheScope}`
  modeCacheKey = `${MODE_CACHE_PREFIX}${session}:${cacheScope}`
  mode = loadCachedMode()
  saveCachedMode()

  debugLog(`[annotate] Initializing with session: ${session}, server: ${server}`)
  debugLog(`[annotate] Storage scope: ${cacheScope}, mode: ${mode}`)

  injectStyles()

  badgeManager = new BadgeManager()

  wsClient = new WSClient({
    session,
    server,
    onConnect: () => {
      debugLog("[annotate] Connected to server")
    },
    onDisconnect: (event) => {
      const reason = event.reason ? `, reason: ${event.reason}` : ""
      debugLog(`[annotate] Disconnected from server (code: ${event.code}${reason})`)
      restorePendingAnnotations()
    },
    onAck: (messageId) => {
      debugLog(`[annotate] Ack received: ${messageId}`)
      if (pendingMessageId && messageId === pendingMessageId) {
        pendingMessageId = null
        clearPendingSendTimer()
        clearPendingAnnotations()
      }
    },
    onServerError: (message) => {
      debugError(`[annotate] Server error: ${message}`)
      restorePendingAnnotations()
    },
  })

  wsClient.connect()

  // Create annotator (disabled by default)
  annotator = new Annotator(handleElementSelect)
  annotator.setMode(mode)

  // Create toolbar
  toolbar = createToolbar({
    onToggle: handleToggle,
    onOrbDoubleClick: () => handleToggle(!enabled),
    onSendAll: handleSendAll,
    onClear: handleClear,
    onModeChange: handleModeChange,
    onEditItem: (index: number) => {
      const item = queue[index]
      if (item) handleEditItem(item)
    },
    onRemoveItem: (index: number) => {
      removeQueueItem(index)
    },
  })

  document.body.appendChild(toolbar.element)
  toolbar.updateMode(mode)
  if (hotkeys && !hotkeyListenerRegistered) {
    document.addEventListener("keydown", handleGlobalKeyDown)
    hotkeyListenerRegistered = true
  } else if (!hotkeys && hotkeyListenerRegistered) {
    document.removeEventListener("keydown", handleGlobalKeyDown)
    hotkeyListenerRegistered = false
  }
  restorePendingAnnotations()
  restoreCachedAnnotations()

  debugLog("[annotate] Ready. Click toolbar toggle to enable.")
}

export function teardown(): void {
  clearPendingSendTimer()
  wsClient?.disconnect()
  wsClient = null
  annotator?.stop()
  annotator = null
  toolbar?.element.remove()
  toolbar = null
  badgeManager?.removeAll()
  badgeManager = null
  document.querySelectorAll("[data-annotate-popup]").forEach((popup) => popup.remove())
  if (hotkeyListenerRegistered) {
    document.removeEventListener("keydown", handleGlobalKeyDown)
    hotkeyListenerRegistered = false
  }
  enabled = false
  queue = []
}

function handleToggle(isEnabled: boolean): void {
  enabled = isEnabled
  toolbar?.updateEnabled(enabled)
  debugLog(`[annotate] Annotator ${enabled ? "enabled" : "disabled"}`)
  if (enabled) {
    annotator?.start()
    badgeManager?.show()
  } else {
    annotator?.stop()
    badgeManager?.hide()
  }
}

function handleModeChange(newMode: "queue" | "steer"): void {
  mode = newMode
  annotator?.setMode(mode)
  saveCachedMode()
  debugLog(`[annotate] Mode changed to: ${mode}`)
}

async function handleElementSelect(element: AnnotatedElement): Promise<void> {
  if (!wsClient || !enabled) return

  debugLog(`[annotate] Element selected: ${element.selector}`)

  // Capture screenshot (if enabled)
  let screenshot: string | null = null
  if (captureScreenshots && element.selector.startsWith("area selection")) {
    screenshot = await captureArea(element.rect)
    debugLog(`[annotate] Area screenshot captured: ${screenshot ? "yes" : "no"}`)
  } else if (captureScreenshots && element.element instanceof HTMLElement) {
    screenshot = await captureElement(element.element)
    debugLog(`[annotate] Screenshot captured: ${screenshot ? "yes" : "no"}`)
  }

  // Show popup near the element
  showAnnotationPopup({
    element,
    screenshot,
    mode,
    onModeChange: handleModeChange,
    debug,
    onAdd: (annotation: string) => {
      debugLog(`[annotate] Add clicked, mode: ${mode}`)
      if (mode === "queue") {
        // Add to queue
        addQueueItem(element, screenshot, annotation)
        // Restart annotator to continue selecting
        setTimeout(() => annotator?.start(), 50)
      } else {
        // Steer mode: send immediately
        sendAnnotation(element, screenshot, annotation)
        // Restart annotator for next selection
        setTimeout(() => annotator?.start(), 50)
      }
    },
    onCancel: () => {
      // Restart annotator
      if (enabled) {
        setTimeout(() => annotator?.start(), 50)
      }
    },
  })
}

function addQueueItem(
  element: AnnotatedElement,
  screenshot: string | null,
  annotation: string
): void {
  const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const item: QueueItem = {
    id,
    element,
    screenshot,
    annotation,
    badge: null,
  }

  queue.push(item)
  debugLog(`[annotate] Added to queue (${queue.length} total): ${element.selector}`)

  // Add badge to element
  if (badgeManager) {
    item.badge = badgeManager.addBadge(
      element,
      id,
      queue.length - 1,
      () => handleEditItem(item)
    )
  }

  updateToolbar()
  saveCachedAnnotations()
}

function removeQueueItem(index: number): void {
  const item = queue[index]
  if (!item) return

  if (badgeManager && item.badge) {
    badgeManager.removeBadge(item.id)
  }

  queue.splice(index, 1)

  // Re-index badges
  queue.forEach((q, i) => {
    if (badgeManager) {
      badgeManager.updateBadgeIndex(q.id, i)
    }
  })

  updateToolbar()
  saveCachedAnnotations()
}

function handleEditItem(item: QueueItem): void {
  const index = queue.findIndex((q) => q.id === item.id)
  if (index === -1) return

  showAnnotationPopup({
    element: item.element,
    screenshot: item.screenshot,
    existingAnnotation: item.annotation,
    mode,
    onModeChange: handleModeChange,
    debug,
    onAdd: (annotation: string) => {
      item.annotation = annotation
      updateToolbar()
      saveCachedAnnotations()
      if (enabled) {
        setTimeout(() => annotator?.start(), 50)
      }
    },
    onCancel: () => {
      if (enabled) {
        setTimeout(() => annotator?.start(), 50)
      }
    },
  })
}

function handleSendAll(): void {
  if (queue.length === 0) {
    debugLog("[annotate] Queue empty, nothing to send")
    return
  }

  debugLog(`[annotate] Sending all ${queue.length} annotations...`)

  const messageId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  savePendingAnnotations(messageId, queue)

  const sent = sendAnnotationBatch(messageId, queue)
  if (!sent) {
    debugError("[annotate] Cannot send queue: not connected to server")
    restorePendingAnnotations()
    return
  }

  pendingMessageId = messageId
  pendingSendTimer = window.setTimeout(() => {
    debugWarn("[annotate] Batch send timed out; restoring annotations for retry")
    restorePendingAnnotations()
  }, 10000)
  badgeManager?.removeAll()
  queue = []
  updateToolbar()
  clearCachedAnnotations()
}

function handleClear(): void {
  debugLog("[annotate] Queue cleared")
  badgeManager?.removeAll()
  queue = []
  pendingMessageId = null
  clearPendingSendTimer()
  updateToolbar()
  clearCachedAnnotations()
  clearPendingAnnotations()
}

function restoreCachedAnnotations(): void {
  if (!annotationCacheKey) return

  let cached: CachedAnnotation[] = []
  try {
    const raw = sessionStorage.getItem(annotationCacheKey)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return
    cached = parsed.filter(isCachedAnnotation)
  } catch (error) {
    debugWarn("[annotate] Failed to restore cached annotations", error)
    return
  }

  restoreCachedItems(cached)

  if (!enabled) {
    badgeManager?.hide()
  }
  updateToolbar()

  if (queue.length !== cached.length) {
    saveCachedAnnotations()
  }

  if (cached.length > 0) {
    debugLog(`[annotate] Restored ${queue.length} cached annotations`)
  }
}

function saveCachedAnnotations(): void {
  if (!annotationCacheKey) return

  if (queue.length === 0) {
    clearCachedAnnotations()
    return
  }

  const cached = serializeQueue(queue)

  try {
    sessionStorage.setItem(annotationCacheKey, JSON.stringify(cached))
    debugLog(`[annotate] Cached ${cached.length} annotations`)
  } catch (error) {
    debugWarn("[annotate] Failed to cache annotations", error)
  }
}

function clearCachedAnnotations(): void {
  if (!annotationCacheKey) return

  try {
    sessionStorage.removeItem(annotationCacheKey)
  } catch (error) {
    debugWarn("[annotate] Failed to clear cached annotations", error)
  }
}

function savePendingAnnotations(messageId: string, items: QueueItem[]): void {
  if (!pendingAnnotationCacheKey) return

  try {
    sessionStorage.setItem(
      pendingAnnotationCacheKey,
      JSON.stringify({
        messageId,
        annotations: serializeQueue(items),
      })
    )
  } catch (error) {
    debugWarn("[annotate] Failed to store pending annotations", error)
  }
}

function restorePendingAnnotations(): void {
  if (!pendingAnnotationCacheKey) return

  try {
    const raw = sessionStorage.getItem(pendingAnnotationCacheKey)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.annotations)) return
    pendingMessageId = typeof parsed.messageId === "string" ? parsed.messageId : null
    restoreCachedItems(parsed.annotations.filter(isCachedAnnotation))
    pendingMessageId = null
    clearPendingSendTimer()
    clearPendingAnnotations()
    saveCachedAnnotations()
    if (!enabled) {
      badgeManager?.hide()
    }
    updateToolbar()
  } catch (error) {
    debugWarn("[annotate] Failed to restore pending annotations", error)
  }
}

function clearPendingSendTimer(): void {
  if (!pendingSendTimer) return
  window.clearTimeout(pendingSendTimer)
  pendingSendTimer = null
}

function clearPendingAnnotations(): void {
  if (!pendingAnnotationCacheKey) return

  try {
    sessionStorage.removeItem(pendingAnnotationCacheKey)
  } catch (error) {
    debugWarn("[annotate] Failed to clear pending annotations", error)
  }
}

function loadCachedMode(): "queue" | "steer" {
  if (!modeCacheKey) return "queue"

  try {
    const cachedMode = sessionStorage.getItem(modeCacheKey)
    return cachedMode === "steer" || cachedMode === "queue" ? cachedMode : "queue"
  } catch {
    return "queue"
  }
}

function saveCachedMode(): void {
  if (!modeCacheKey) return

  try {
    sessionStorage.setItem(modeCacheKey, mode)
  } catch (error) {
    debugWarn("[annotate] Failed to cache annotation mode", error)
  }
}

function getPageCacheScope(): string {
  const origin = window.location.origin && window.location.origin !== "null"
    ? window.location.origin
    : "file://"
  return `${origin}${window.location.pathname}`
}

function isCachedAnnotation(value: unknown): value is CachedAnnotation {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<CachedAnnotation>
  return (
    typeof item.id === "string" &&
    typeof item.selector === "string" &&
    typeof item.text === "string" &&
    typeof item.annotation === "string" &&
    (typeof item.screenshot === "string" || item.screenshot === null)
  )
}

function serializeQueue(items: QueueItem[]): CachedAnnotation[] {
  return items.map((item) => ({
    id: item.id,
    selector: item.element.selector,
    text: item.element.text,
    screenshot: item.screenshot,
    annotation: item.annotation,
  }))
}

function restoreCachedItems(items: CachedAnnotation[]): void {
  for (const item of items) {
    if (queue.some((queued) => queued.id === item.id)) continue

    let element: Element | null = null
    try {
      element = document.querySelector(item.selector)
    } catch {
      element = null
    }
    if (!element) continue

    const queueItem: QueueItem = {
      id: item.id,
      element: {
        element,
        selector: item.selector,
        text: item.text || getAnnotatableElementText(element),
        rect: element.getBoundingClientRect(),
      },
      screenshot: item.screenshot,
      annotation: item.annotation,
      badge: null,
    }

    queue.push(queueItem)
    if (badgeManager) {
      queueItem.badge = badgeManager.addBadge(
        queueItem.element,
        queueItem.id,
        queue.length - 1,
        () => handleEditItem(queueItem)
      )
    }
  }
}

function sendAnnotation(
  element: AnnotatedElement,
  screenshot: string | null,
  annotation: string
): void {
  if (!wsClient) {
    debugError("[annotate] Cannot send: no wsClient")
    return
  }

  if (!wsClient.connected) {
    debugError("[annotate] Cannot send: not connected to server")
    return
  }

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  debugLog(`[annotate] Sending annotation: ${element.selector}`)

  wsClient.send({
    type: "annotate",
    clientMessageId: messageId,
    sessionCode: wsClient.session,
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

  debugLog(`[annotate] Annotation written to WebSocket: ${messageId}`)
}

function sendAnnotationBatch(messageId: string, items: QueueItem[]): boolean {
  if (!wsClient) {
    debugError("[annotate] Cannot send: no wsClient")
    return false
  }

  if (!wsClient.connected) {
    debugError("[annotate] Cannot send: not connected to server")
    return false
  }

  debugLog(`[annotate] Sending annotation batch: ${items.length}`)

  const sent = wsClient.send({
    type: "annotate_batch",
    clientMessageId: messageId,
    sessionCode: wsClient.session,
    page: {
      url: window.location.href,
      title: document.title,
    },
    annotations: items.map((item) => ({
      element: {
        selector: item.element.selector,
        text: item.element.text,
        rect: {
          x: item.element.rect.x,
          y: item.element.rect.y,
          width: item.element.rect.width,
          height: item.element.rect.height,
        },
      },
      annotation: item.annotation,
      screenshot: item.screenshot,
    })),
  })

  if (sent) debugLog("[annotate] Batch message sent")
  return sent
}

function handleGlobalKeyDown(event: KeyboardEvent): void {
  if (isTypingTarget(event.target)) return
  if (!(event.shiftKey && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a")) {
    return
  }

  event.preventDefault()
  handleToggle(!enabled)
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest("[data-annotate-popup]") ||
      target.isContentEditable ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
  )
}

function updateToolbar(): void {
  toolbar?.updateQueue(
    queue.map((item) => ({
      selector: item.element.selector,
      annotation: item.annotation,
    }))
  )
}

function escapeHtml(str: string): string {
  const div = document.createElement("div")
  div.textContent = str
  return div.innerHTML
}

// Auto-initialize from script tag
if (typeof document !== "undefined") {
  const script = document.querySelector("script[data-session]")
  if (script) {
    const session = script.getAttribute("data-session")?.trim()
    const server = script.getAttribute("data-server")?.trim()
    const screenshots = script.getAttribute("data-screenshots")?.trim()
    const debugAttr = script.getAttribute("data-debug")?.trim()
    const hotkeysAttr = script.getAttribute("data-hotkeys")?.trim()
    if (session) {
      init({
        session,
        server: server || undefined,
        captureScreenshots: screenshots === "true",
        debug: debugAttr === "true",
        hotkeys: hotkeysAttr !== "false",
      })
    }
  }
}

export { WSClient, Annotator, captureElement, showAnnotationPopup }
