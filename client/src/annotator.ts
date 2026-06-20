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
