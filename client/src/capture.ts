import html2canvas from "html2canvas"
import { debugError } from "./logger"

export async function captureElement(element: HTMLElement): Promise<string | null> {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: null, // Transparent background
      scale: 2, // Higher resolution
      useCORS: true, // Allow cross-origin images
    })
    return canvas.toDataURL("image/png")
  } catch (error) {
    debugError("[annotate] Screenshot capture failed:", error)
    return null
  }
}

export async function captureArea(rect: DOMRect): Promise<string | null> {
  try {
    const canvas = await html2canvas(document.body, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
    })

    const scale = canvas.width / document.documentElement.scrollWidth
    const sourceX = Math.max(0, (rect.left + window.scrollX) * scale)
    const sourceY = Math.max(0, (rect.top + window.scrollY) * scale)
    const sourceWidth = Math.min(canvas.width - sourceX, rect.width * scale)
    const sourceHeight = Math.min(canvas.height - sourceY, rect.height * scale)

    if (sourceWidth <= 0 || sourceHeight <= 0) return null

    const cropped = document.createElement("canvas")
    cropped.width = sourceWidth
    cropped.height = sourceHeight
    const context = cropped.getContext("2d")
    if (!context) return null

    context.drawImage(
      canvas,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight
    )

    return cropped.toDataURL("image/png")
  } catch (error) {
    debugError("[annotate] Area screenshot capture failed:", error)
    return null
  }
}
