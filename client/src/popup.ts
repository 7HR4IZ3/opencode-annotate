import type { AnnotatedElement } from "./annotator"

export interface AnnotationPopupOptions {
  element: AnnotatedElement
  screenshot: string | null
  onAdd: (annotation: string) => void
  onCancel: () => void
  existingAnnotation?: string
  mode: "queue" | "steer"
  onModeChange: (mode: "queue" | "steer") => void
  debug?: boolean
}

const ICON_SEND = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`
const ICON_X = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`
const ICON_BULLSEYE = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`
const ICON_LIST = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`

export function showAnnotationPopup(options: AnnotationPopupOptions): void {
  const { element, onAdd, onCancel, existingAnnotation, onModeChange } = options
  let currentMode = options.mode

  document.querySelectorAll("[data-annotate-popup]").forEach((p) => p.remove())

  const popup = document.createElement("div")
  popup.setAttribute("data-annotate-popup", "")

  const value = existingAnnotation ? escapeHtml(existingAnnotation) : ""

  popup.innerHTML = `
    <button class="ac-popup-icon-btn ac-popup-cancel" type="button" data-action="cancel" title="Cancel annotation" aria-label="Cancel annotation">${ICON_X}</button>
    <textarea
      class="ac-popup-textarea"
      rows="1"
      placeholder="${existingAnnotation ? "Update comment..." : "Add a comment..."}"
      aria-label="Annotation comment"
    >${value}</textarea>
    <button class="ac-popup-icon-btn ac-popup-leading" type="button" data-action="mode" title="" aria-label=""></button>
    <button class="ac-popup-icon-btn ac-popup-submit" type="button" data-action="add" title="${existingAnnotation ? "Update annotation" : "Add annotation"}" aria-label="${existingAnnotation ? "Update annotation" : "Add annotation"}">${ICON_SEND}</button>
  `

  document.body.appendChild(popup)

  const elemRect = element.rect
  const popupWidth = 336
  const popupHeight = 44

  let left = elemRect.right - 124
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
  const modeButton = popup.querySelector("[data-action='mode']") as HTMLButtonElement

  updateModeButton()
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

  function updateModeButton() {
    const label = currentMode === "queue" ? "Queue mode" : "Steer mode"
    modeButton.innerHTML = currentMode === "queue" ? ICON_LIST : ICON_BULLSEYE
    modeButton.title = currentMode === "queue" ? "Queue annotations" : "Send immediately"
    modeButton.setAttribute("aria-label", `${label}. Click to switch mode.`)
    modeButton.classList.toggle("ac-popup-mode-steer", currentMode === "steer")
  }

  function toggleMode() {
    currentMode = currentMode === "queue" ? "steer" : "queue"
    onModeChange(currentMode)
    updateModeButton()
    textarea.focus()
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
      } else if (action === "cancel") {
        close()
      } else if (action === "mode") {
        toggleMode()
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
