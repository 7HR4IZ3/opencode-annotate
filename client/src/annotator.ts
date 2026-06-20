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
  private dragBox: HTMLElement | null = null
  private selectedHighlights: HTMLElement[] = []
  private currentElement: Element | null = null
  private onSelect: (element: AnnotatedElement) => void
  private onKeyDown: (e: KeyboardEvent) => void
  private onMouseMove: (e: MouseEvent) => void
  private onMouseDown: (e: MouseEvent) => void
  private onMouseUp: (e: MouseEvent) => void
  private onClick: (e: MouseEvent) => void
  private _started = false
  private _mode: "queue" | "steer" = "queue"
  private dragStartX = 0
  private dragStartY = 0
  private hasDragStart = false
  private isDragging = false
  private suppressNextClick = false

  constructor(onSelect: (element: AnnotatedElement) => void) {
    this.onSelect = onSelect
    this.onKeyDown = this.handleKeyDown.bind(this)
    this.onMouseMove = this.handleMouseMove.bind(this)
    this.onMouseDown = this.handleMouseDown.bind(this)
    this.onMouseUp = this.handleMouseUp.bind(this)
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
    document.addEventListener("mousedown", this.onMouseDown, true)
    document.addEventListener("mouseup", this.onMouseUp, true)
    document.addEventListener("click", this.onClick, true)
    document.body.style.cursor = "crosshair"
  }

  stop(options: { preserveSelectedHighlights?: boolean } = {}): void {
    if (!this._started) return
    this._started = false
    document.removeEventListener("keydown", this.onKeyDown)
    document.removeEventListener("mousemove", this.onMouseMove)
    document.removeEventListener("mousedown", this.onMouseDown, true)
    document.removeEventListener("mouseup", this.onMouseUp, true)
    document.removeEventListener("click", this.onClick, true)
    document.body.style.cursor = ""
    this.removeHighlight()
    this.removeDragBox()
    if (!options.preserveSelectedHighlights) {
      this.removeSelectedHighlights()
    }
    this.isDragging = false
    this.suppressNextClick = false
    this.hasDragStart = false
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      this.stop()
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      this.updateDragBox(e.clientX, e.clientY)
      return
    }

    if (e.buttons === 1 && this.hasDragStart) {
      const dx = e.clientX - this.dragStartX
      const dy = e.clientY - this.dragStartY
      if (Math.hypot(dx, dy) > 6) {
        e.preventDefault()
        this.isDragging = true
        this.removeHighlight()
        this.createDragBox()
        this.updateDragBox(e.clientX, e.clientY)
        return
      }
    }

    const target = e.target as Element
    if (target && target !== this.currentElement) {
      this.currentElement = target
      this.showHighlight(target)
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return
    const target = e.target as Element
    if (!target || this.isOwnUi(target)) return

    this.dragStartX = e.clientX
    this.dragStartY = e.clientY
    this.hasDragStart = true
    this.isDragging = false
    this.suppressNextClick = false
  }

  private handleMouseUp(e: MouseEvent): void {
    if (!this.isDragging) {
      this.dragStartX = 0
      this.dragStartY = 0
      this.hasDragStart = false
      return
    }

    e.preventDefault()
    e.stopPropagation()

    const rect = this.getDragRect(e.clientX, e.clientY)
    this.removeDragBox()
    this.isDragging = false
    this.suppressNextClick = true
    this.dragStartX = 0
    this.dragStartY = 0
    this.hasDragStart = false

    if (rect.width < 8 || rect.height < 8) return

    const selected = this.getElementsInRect(rect)
    this.showSelectedHighlights(selected)
    const annotated: AnnotatedElement = {
      element: document.body,
      selector: `area selection (${selected.length} elements)`,
      text: selected.map(getAnnotatableElementText).filter(Boolean).join(" ").slice(0, 1000),
      rect,
    }

    if (this._mode === "steer") {
      this.stop({ preserveSelectedHighlights: true })
    }

    this.onSelect(annotated)
  }

  private handleClick(e: MouseEvent): void {
    if (this.suppressNextClick) {
      e.preventDefault()
      e.stopPropagation()
      this.suppressNextClick = false
      return
    }

    // Don't intercept clicks on our own UI
    const target = e.target as Element
    if (!target) return
    if (this.isOwnUi(target)) {
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

    this.showSelectedHighlights([target])

    // In steer mode, stop after selection. In queue mode, keep going.
    if (this._mode === "steer") {
      this.stop({ preserveSelectedHighlights: true })
    } else {
      this.removeHighlight()
    }

    this.onSelect(annotated)
  }

  private showHighlight(element: Element): void {
    this.removeHighlight()

    // Skip our own UI
    if (this.isOwnUi(element)) {
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

  private createDragBox(): void {
    this.removeDragBox()
    this.removeSelectedHighlights()
    this.dragBox = document.createElement("div")
    this.dragBox.setAttribute("data-annotate-drag-box", "")
    document.body.appendChild(this.dragBox)
  }

  private updateDragBox(clientX: number, clientY: number): void {
    if (!this.dragBox) return
    const rect = this.getDragRect(clientX, clientY)
    Object.assign(this.dragBox.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    })
  }

  private removeDragBox(): void {
    this.dragBox?.remove()
    this.dragBox = null
  }

  private showSelectedHighlights(elements: Element[]): void {
    this.removeSelectedHighlights()

    for (const element of elements) {
      const rect = element.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) continue

      const highlight = document.createElement("div")
      highlight.setAttribute("data-annotate-selected-highlight", "")
      Object.assign(highlight.style, {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      })
      document.body.appendChild(highlight)
      this.selectedHighlights.push(highlight)
    }
  }

  private removeSelectedHighlights(): void {
    for (const highlight of this.selectedHighlights) {
      highlight.remove()
    }
    this.selectedHighlights = []
  }

  private getDragRect(clientX: number, clientY: number): DOMRect {
    const left = Math.min(this.dragStartX, clientX)
    const top = Math.min(this.dragStartY, clientY)
    const width = Math.abs(clientX - this.dragStartX)
    const height = Math.abs(clientY - this.dragStartY)
    return new DOMRect(left, top, width, height)
  }

  private getElementsInRect(selection: DOMRect): Element[] {
    const contained = Array.from(document.body.querySelectorAll("*")).filter((element) => {
      if (this.isOwnUi(element)) return false
      if (!(element instanceof HTMLElement)) return false
      if (element.offsetParent === null && getComputedStyle(element).position !== "fixed") return false

      const rect = element.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return false

      return (
        rect.left >= selection.left &&
        rect.right <= selection.right &&
        rect.top >= selection.top &&
        rect.bottom <= selection.bottom
      )
    })

    return contained.filter((element) => {
      return !contained.some((other) => other !== element && other.contains(element))
    })
  }

  private isOwnUi(element: Element): boolean {
    return Boolean(
      element.closest("[data-annotate-toolbar]") ||
        element.closest("[data-annotate-orb]") ||
        element.closest("[data-annotate-popup]") ||
        element.closest("[data-annotate-badge]") ||
        element.closest("[data-annotate-drag-box]") ||
        element.closest("[data-annotate-selected-highlight]")
    )
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
