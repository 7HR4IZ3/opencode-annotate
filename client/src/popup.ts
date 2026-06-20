import type { AnnotatedElement } from "./annotator"

export interface AnnotationPopupOptions {
  element: AnnotatedElement
  screenshot: string | null
  onAdd: (annotation: string) => void
  onCancel: () => void
  existingAnnotation?: string
}

const ICON_SLIDERS = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="14" y2="6"/><line x1="18" y1="6" x2="20" y2="6"/><circle cx="16" cy="6" r="2"/><line x1="4" y1="18" x2="6" y2="18"/><line x1="10" y1="18" x2="20" y2="18"/><circle cx="8" cy="18" r="2"/><line x1="4" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="20" y2="12"/><circle cx="12" cy="12" r="2"/></svg>`
const ICON_MIC = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></svg>`

export function showAnnotationPopup(options: AnnotationPopupOptions): void {
  const { element, onAdd, onCancel, existingAnnotation } = options

  document.querySelectorAll("[data-annotate-popup]").forEach((p) => p.remove())

  const popup = document.createElement("div")
  popup.setAttribute("data-annotate-popup", "")

  const value = existingAnnotation ? escapeHtml(existingAnnotation) : ""

  popup.innerHTML = `
    <textarea
      class="ac-popup-textarea"
      rows="1"
      placeholder="${existingAnnotation ? "Update comment..." : "Add a comment..."}"
      aria-label="Annotation comment"
    >${value}</textarea>
    <button class="ac-popup-icon-btn ac-popup-leading" type="button" data-action="focus" title="Annotation options" aria-label="Annotation options">${ICON_SLIDERS}</button>
    <button class="ac-popup-icon-btn ac-popup-submit" type="button" data-action="add" title="${existingAnnotation ? "Update annotation" : "Add annotation"}" aria-label="${existingAnnotation ? "Update annotation" : "Add annotation"}">${ICON_MIC}</button>
  `

  document.body.appendChild(popup)

  const elemRect = element.rect
  const popupWidth = 296
  const popupHeight = 44

  let left = elemRect.right - 84
  let top = elemRect.top + elemRect.height / 2 - popupHeight / 2

  const vw = window.innerWidth
  const vh = window.innerHeight

  if (left + popupWidth > vw - 8) left = vw - popupWidth - 8
  if (left < 8) left = 8
  if (top + popupHeight > vh - 8) top = vh - popupHeight - 8
  if (top < 8) top = 8

  popup.style.left = `${left}px`
  popup.style.top = `${top}px`

  const textarea = popup.querySelector(".ac-popup-textarea") as HTMLTextAreaElement
  textarea.focus()
  if (existingAnnotation) textarea.select()

  function submit() {
    const annotation = textarea.value.trim()
    if (!annotation) return
    popup.remove()
    document.removeEventListener("keydown", handleEscape)
    document.removeEventListener("mousedown", handleMouseDown)
    onAdd(annotation)
  }

  let closed = false
  function close() {
    if (closed) return
    closed = true
    popup.remove()
    document.removeEventListener("keydown", handleEscape)
    document.removeEventListener("mousedown", handleMouseDown)
    onCancel()
  }

  function handleEscape(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation()
      close()
    }
  }

  function handleMouseDown(e: MouseEvent) {
    if (!popup.contains(e.target as Node)) {
      close()
    }
  }

  setTimeout(() => {
    document.addEventListener("keydown", handleEscape)
    document.addEventListener("mousedown", handleMouseDown)
  }, 0)

  popup.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation()
      const action = (btn as HTMLElement).dataset.action
      if (action === "add") {
        submit()
      } else if (action === "focus") {
        textarea.focus()
      }
    })
  })

  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  })
}

function escapeHtml(str: string): string {
  const div = document.createElement("div")
  div.textContent = str
  return div.innerHTML
}
