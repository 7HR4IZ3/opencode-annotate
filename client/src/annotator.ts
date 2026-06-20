export interface AnnotatedElement {
  element: Element
  selector: string
  text: string
  rect: DOMRect
}

const TEXT_EXCLUDED_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
  "HEAD",
  "META",
  "LINK",
  "TITLE",
  "SVG",
  "PATH",
  "DEFS",
])

export function getAnnotatableElementText(element: Element): string {
  if (shouldExcludeElementText(element)) return ""
  if (!(element instanceof HTMLElement)) return ""
  return element.innerText.replace(/\s+/g, " ").trim()
}

function shouldExcludeElementText(element: Element): boolean {
  return TEXT_EXCLUDED_TAGS.has(element.tagName)
}

export class Annotator {
  private highlight: HTMLElement | null = null
  private currentElement: Element | null = null
  private onSelect: (element: AnnotatedElement) => void
  private onKeyDown: (e: KeyboardEvent) => void
  private onMouseMove: (e: MouseEvent) => void
  private onClick: (e: MouseEvent) => void
  private _started = false
  private _mode: "queue" | "steer" = "queue"

  constructor(onSelect: (element: AnnotatedElement) => void) {
    this.onSelect = onSelect
    this.onKeyDown = this.handleKeyDown.bind(this)
    this.onMouseMove = this.handleMouseMove.bind(this)
    this.onClick = this.handleClick.bind(this)
  }

  get isStarted(): boolean {
    return this._started
  }

  setMode(mode: "queue" | "steer"): void {
    this._mode = mode
  }

  start(): void {
    if (this._started) return
    this._started = true
    document.addEventListener("keydown", this.onKeyDown)
    document.addEventListener("mousemove", this.onMouseMove)
    document.addEventListener("click", this.onClick, true)
    document.body.style.cursor = "crosshair"
  }

  stop(): void {
    if (!this._started) return
    this._started = false
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
    // Don't intercept clicks on our own UI
    const target = e.target as Element
    if (!target) return
    if (
      target.closest("[data-annotate-toolbar]") ||
      target.closest("[data-annotate-orb]") ||
      target.closest("[data-annotate-popup]") ||
      target.closest("[data-annotate-badge]")
    ) {
      return
    }

    e.preventDefault()
    e.stopPropagation()

    const annotated: AnnotatedElement = {
      element: target,
      selector: this.getSelector(target),
      text: getAnnotatableElementText(target),
      rect: target.getBoundingClientRect(),
    }

    // In steer mode, stop after selection. In queue mode, keep going.
    if (this._mode === "steer") {
      this.stop()
    } else {
      this.removeHighlight()
    }

    this.onSelect(annotated)
  }

  private showHighlight(element: Element): void {
    this.removeHighlight()

    // Skip our own UI
    if (
      element.closest("[data-annotate-toolbar]") ||
      element.closest("[data-annotate-orb]") ||
      element.closest("[data-annotate-popup]") ||
      element.closest("[data-annotate-badge]")
    ) {
      return
    }

    const rect = element.getBoundingClientRect()
    this.highlight = document.createElement("div")
    this.highlight.setAttribute("data-annotate-highlight", "")
    Object.assign(this.highlight.style, {
      position: "fixed",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
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

      // Add classes if present
      if (current.classList.length > 0) {
        const classes = Array.from(current.classList)
          .filter((c) => !c.startsWith("ac-") && !c.startsWith("data-annotate"))
          .slice(0, 2)
          .map((c) => `.${c}`)
          .join("")
        if (classes) selector += classes
      }

      parts.unshift(selector)
      current = current.parentElement
    }

    return parts.join(" > ")
  }

}
