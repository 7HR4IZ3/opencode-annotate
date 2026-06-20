import html2canvas from "html2canvas"

export async function captureElement(element: Element): Promise<string | null> {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: null, // Transparent background
      scale: 2, // Higher resolution
      useCORS: true, // Allow cross-origin images
    })
    return canvas.toDataURL("image/png")
  } catch (error) {
    console.error("[annotate] Screenshot capture failed:", error)
    return null
  }
}
