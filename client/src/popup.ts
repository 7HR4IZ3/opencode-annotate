import type { AnnotatedElement } from "./annotator"

export interface AnnotationPopupOptions {
  element: AnnotatedElement
  screenshot: string | null
  onSubmit: (annotation: string) => void
  onCancel: () => void
}

export function showAnnotationPopup(options: AnnotationPopupOptions): void {
  const { element, screenshot, onSubmit, onCancel } = options

  // Create overlay
  const overlay = document.createElement("div")
  overlay.setAttribute("data-annotate-popup", "")
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "2147483647",
  })

  // Create popup
  const popup = document.createElement("div")
  Object.assign(popup.style, {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    padding: "16px",
    width: "400px",
    maxHeight: "80vh",
    overflow: "auto",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
    fontFamily: "system-ui, -apple-system, sans-serif",
  })

  popup.innerHTML = `
    <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #111827;">
      Add Annotation
    </h3>
    <div style="margin-bottom: 12px;">
      <label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;">
        Element
      </label>
      <code style="display: block; font-size: 12px; background: #f3f4f6; padding: 8px; border-radius: 4px; word-break: break-all;">
        ${element.selector}
      </code>
    </div>
    ${
      screenshot
        ? `
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;">
          Screenshot
        </label>
        <img src="${screenshot}" style="max-width: 100%; border-radius: 4px; border: 1px solid #e5e7eb;" />
      </div>
    `
        : ""
    }
    <div style="margin-bottom: 12px;">
      <label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;">
        Annotation
      </label>
      <textarea
        id="annotate-input"
        style="width: 100%; height: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; resize: vertical; box-sizing: border-box;"
        placeholder="Describe what needs to be changed..."
      ></textarea>
    </div>
    <div style="display: flex; gap: 8px; justify-content: flex-end;">
      <button
        id="annotate-cancel"
        style="padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 4px; background: #fff; cursor: pointer; font-size: 14px;"
      >
        Cancel
      </button>
      <button
        id="annotate-submit"
        style="padding: 8px 16px; border: none; border-radius: 4px; background: #3b82f6; color: #fff; cursor: pointer; font-size: 14px;"
      >
        Send to Agent
      </button>
    </div>
  `

  overlay.appendChild(popup)
  document.body.appendChild(overlay)

  // Focus textarea
  const textarea = popup.querySelector("#annotate-input") as HTMLTextAreaElement
  textarea.focus()

  // Handle cancel
  popup.querySelector("#annotate-cancel")!.addEventListener("click", () => {
    overlay.remove()
    onCancel()
  })

  // Handle submit
  popup.querySelector("#annotate-submit")!.addEventListener("click", () => {
    const annotation = textarea.value.trim()
    if (annotation) {
      overlay.remove()
      onSubmit(annotation)
    }
  })

  // Handle escape
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      overlay.remove()
      document.removeEventListener("keydown", handleEscape)
      onCancel()
    }
  }
  document.addEventListener("keydown", handleEscape)
}
