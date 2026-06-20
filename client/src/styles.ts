const STYLES = `
  [data-annotate-highlight] {
    position: fixed;
    pointer-events: none;
    z-index: 2147483647;
  }

  [data-annotate-popup] {
    font-family: system-ui, -apple-system, sans-serif;
  }
`

export function injectStyles(): void {
  if (document.querySelector("style[data-annotate-styles]")) {
    return // Already injected
  }

  const style = document.createElement("style")
  style.setAttribute("data-annotate-styles", "")
  style.textContent = STYLES
  document.head.appendChild(style)
}
