import type { AnnotatedElement } from "./annotator"

export interface QueueItem {
  id: string
  element: AnnotatedElement
  screenshot: string | null
  annotation: string
  badge: HTMLElement | null
}

export class BadgeManager {
  private badges: Map<string, HTMLElement> = new Map()

  addBadge(
    targetElement: Element,
    id: string,
    index: number,
    onClick: () => void
  ): HTMLElement {
    // Ensure target has relative positioning for badge placement
    const pos = window.getComputedStyle(targetElement).position
    if (pos === "static") {
      ;(targetElement as HTMLElement).style.position = "relative"
    }

    const badge = document.createElement("div")
    badge.setAttribute("data-annotate-badge", "")
    badge.textContent = String(index + 1)
    badge.title = "Click to edit annotation"

    badge.addEventListener("click", (e) => {
      e.stopPropagation()
      e.preventDefault()
      onClick()
    })

    targetElement.appendChild(badge)
    this.badges.set(id, badge)
    return badge
  }

  removeBadge(id: string): void {
    const badge = this.badges.get(id)
    if (badge) {
      badge.remove()
      this.badges.delete(id)
    }
  }

  updateBadgeIndex(id: string, index: number): void {
    const badge = this.badges.get(id)
    if (badge) {
      badge.textContent = String(index + 1)
    }
  }

  removeAll(): void {
    this.badges.forEach((badge) => badge.remove())
    this.badges.clear()
  }

  hide(): void {
    this.badges.forEach((badge) => badge.classList.add("ac-badge-hidden"))
  }

  show(): void {
    this.badges.forEach((badge) => badge.classList.remove("ac-badge-hidden"))
  }
}
