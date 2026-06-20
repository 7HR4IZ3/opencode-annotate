import type { AnnotatedElement } from "./annotator"

export interface QueueItem {
  id: string
  element: AnnotatedElement
  screenshot: string | null
  annotation: string
  badge: HTMLElement | null
}

interface BadgeRecord {
  badge: HTMLElement
  target: AnnotatedElement
}

export class BadgeManager {
  private badges: Map<string, BadgeRecord> = new Map()
  private listening = false
  private onReposition = () => this.updatePositions()

  addBadge(
    target: AnnotatedElement,
    id: string,
    index: number,
    onClick: () => void
  ): HTMLElement {
    const badge = document.createElement("div")
    badge.setAttribute("data-annotate-badge", "")
    badge.textContent = String(index + 1)
    badge.title = "Click to edit annotation"

    badge.addEventListener("click", (e) => {
      e.stopPropagation()
      e.preventDefault()
      onClick()
    })

    document.body.appendChild(badge)
    this.badges.set(id, { badge, target })
    this.updateBadgePosition(badge, target)
    this.ensurePositionListeners()
    return badge
  }

  removeBadge(id: string): void {
    const record = this.badges.get(id)
    if (record) {
      record.badge.remove()
      this.badges.delete(id)
      this.teardownPositionListeners()
    }
  }

  updateBadgeIndex(id: string, index: number): void {
    const record = this.badges.get(id)
    if (record) {
      record.badge.textContent = String(index + 1)
      this.updateBadgePosition(record.badge, record.target)
    }
  }

  removeAll(): void {
    this.badges.forEach(({ badge }) => badge.remove())
    this.badges.clear()
    this.teardownPositionListeners()
  }

  hide(): void {
    this.badges.forEach(({ badge }) => badge.classList.add("ac-badge-hidden"))
  }

  show(): void {
    this.badges.forEach(({ badge, target }) => {
      this.updateBadgePosition(badge, target)
      badge.classList.remove("ac-badge-hidden")
    })
  }

  private updatePositions(): void {
    this.badges.forEach(({ badge, target }) => {
      this.updateBadgePosition(badge, target)
    })
  }

  private updateBadgePosition(badge: HTMLElement, target: AnnotatedElement): void {
    const rect = this.getTargetRect(target)
    const left = clamp(rect.right, 10, window.innerWidth - 10)
    const top = clamp(rect.top, 10, window.innerHeight - 10)

    badge.style.left = `${left}px`
    badge.style.top = `${top}px`
  }

  private getTargetRect(target: AnnotatedElement): DOMRect {
    if (target.selector.startsWith("area selection")) {
      return target.rect
    }

    if (target.element.isConnected) {
      return target.element.getBoundingClientRect()
    }

    return target.rect
  }

  private ensurePositionListeners(): void {
    if (this.listening) return
    this.listening = true
    window.addEventListener("resize", this.onReposition)
    window.addEventListener("scroll", this.onReposition, true)
  }

  private teardownPositionListeners(): void {
    if (!this.listening || this.badges.size > 0) return
    this.listening = false
    window.removeEventListener("resize", this.onReposition)
    window.removeEventListener("scroll", this.onReposition, true)
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
