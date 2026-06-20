export interface ToolbarOptions {
  onToggle: (enabled: boolean) => void
  onOrbDoubleClick?: () => void
  onSendAll: () => void
  onClear: () => void
  onModeChange: (mode: "queue" | "steer") => void
  onEditItem: (index: number) => void
  onRemoveItem: (index: number) => void
}

export interface ToolbarHandle {
  element: HTMLElement
  updateEnabled: (enabled: boolean) => void
  updateCount: (count: number) => void
  updateMode: (mode: "queue" | "steer") => void
  updateQueue: (items: { selector: string; annotation: string }[]) => void
  showQueue: () => void
  hideQueue: () => void
}

const ICON_CROSSHAIR = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`
const ICON_CROSSHAIR_ON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`
const ICON_SEND = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`
const ICON_PENCIL = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`
const ICON_X = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
const ICON_SEND_ALL = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`
const ICON_CHEVRON = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`
const ICON_BULLSEYE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`
const ICON_LIST = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`
const ICON_TRASH = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`

export function createToolbar(options: ToolbarOptions): ToolbarHandle {
  const { onToggle, onOrbDoubleClick, onSendAll, onClear, onModeChange, onEditItem, onRemoveItem } = options

  let enabled = false
  let mode: "queue" | "steer" = "steer"
  let expanded = false
  let queueItems: { selector: string; annotation: string }[] = []

  const root = document.createElement("div")
  root.setAttribute("data-annotate-orb", "")

  const orb = document.createElement("button")
  orb.setAttribute("data-annotate-orb-btn", "")
  orb.innerHTML = ICON_CROSSHAIR

  const badge = document.createElement("div")
  badge.setAttribute("data-annotate-orb-badge", "")
  badge.textContent = "0"
  badge.style.display = "none"

  const panel = document.createElement("div")
  panel.setAttribute("data-annotate-orb-panel", "")
  panel.style.display = "none"

  root.appendChild(badge)
  root.appendChild(panel)
  root.appendChild(orb)

  // Drag state
  let activePointerId: number | null = null
  let dragStartX = 0
  let dragStartY = 0
  let isDragging = false
  let suppressNextClick = false
  let orbClickTimer: number | null = null

  orb.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return
    activePointerId = e.pointerId
    dragStartX = e.clientX
    dragStartY = e.clientY
    isDragging = false
    orb.setPointerCapture(e.pointerId)
  })

  document.addEventListener("pointermove", (e) => {
    if (activePointerId !== e.pointerId) return
    const dx = e.clientX - dragStartX
    const dy = e.clientY - dragStartY
    if (!isDragging && Math.hypot(dx, dy) <= 4) return

    isDragging = true
    const orbSize = 40
    const margin = 8
    let x = e.clientX - orbSize / 2
    let y = e.clientY - orbSize / 2
    x = Math.max(margin, Math.min(window.innerWidth - orbSize - margin, x))
    y = Math.max(margin, Math.min(window.innerHeight - orbSize - margin, y))
    root.style.left = `${x}px`
    root.style.top = `${y}px`
    root.style.bottom = "auto"
    root.style.right = "auto"
    root.style.transform = "none"
    if (expanded) repositionPanel()
  })

  document.addEventListener("pointerup", (e) => {
    if (activePointerId !== e.pointerId) return
    suppressNextClick = isDragging
    activePointerId = null
    isDragging = false
    if (orb.hasPointerCapture(e.pointerId)) {
      orb.releasePointerCapture(e.pointerId)
    }
  })

  document.addEventListener("pointercancel", (e) => {
    if (activePointerId !== e.pointerId) return
    activePointerId = null
    isDragging = false
    suppressNextClick = false
  })

  orb.addEventListener("click", (e) => {
    e.stopPropagation()
    if (e.detail > 1) return
    if (suppressNextClick) {
      suppressNextClick = false
      e.preventDefault()
      return
    }
    orbClickTimer = window.setTimeout(() => {
      orbClickTimer = null
      expanded ? collapse() : expand()
    }, 180)
  })

  orb.addEventListener("dblclick", (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (orbClickTimer) {
      window.clearTimeout(orbClickTimer)
      orbClickTimer = null
    }
    onOrbDoubleClick?.()
  })

  // Click outside to close
  document.addEventListener("mousedown", (e) => {
    if (expanded && !root.contains(e.target as Node)) {
      collapse()
    }
  })

  window.addEventListener("resize", () => {
    const orbSize = 40
    const margin = 8
    const rect = root.getBoundingClientRect()
    let x = rect.left
    let y = rect.top
    x = Math.max(margin, Math.min(window.innerWidth - orbSize - margin, x))
    y = Math.max(margin, Math.min(window.innerHeight - orbSize - margin, y))
    root.style.left = `${x}px`
    root.style.top = `${y}px`
    if (expanded) repositionPanel()
  })

  function repositionPanel() {
    const rootRect = root.getBoundingClientRect()
    const panelW = 260
    const gap = 8
    let left = rootRect.left + rootRect.width / 2 - panelW / 2

    if (left + panelW > window.innerWidth - 8) left = window.innerWidth - panelW - 8
    if (left < 8) left = 8

    const panelH = panel.offsetHeight || 200
    let top: number
    if (rootRect.top - gap - panelH < 8) {
      top = rootRect.bottom + gap
    } else {
      top = rootRect.top - gap - panelH
    }

    panel.style.left = `${left}px`
    panel.style.top = `${top}px`
    panel.style.width = `${panelW}px`
  }

  function expand() {
    expanded = true
    buildPanel()
    panel.style.display = ""
    repositionPanel()
  }

  function collapse() {
    expanded = false
    panel.style.display = "none"
    // Remove any leftover tooltips
    document.querySelectorAll(".orb-tooltip").forEach((el) => el.remove())
  }

  function buildPanel() {
    panel.innerHTML = ""

    // Remove old tooltips
    document.querySelectorAll(".orb-tooltip").forEach((el) => el.remove())

    // Header
    const header = document.createElement("div")
    header.className = "orb-header"

    const title = document.createElement("span")
    title.className = "orb-title"
    title.textContent = "Annotations"

    const headerActions = document.createElement("div")
    headerActions.className = "orb-header-actions"

    const headerTitle = document.createElement("div")
    headerTitle.className = "orb-header-title"

    const toggleBtn = document.createElement("button")
    toggleBtn.className = `orb-toggle ${enabled ? "ac-on" : ""}`
    toggleBtn.title = enabled ? "Disable annotator" : "Enable annotator"
    toggleBtn.innerHTML = enabled ? ICON_CROSSHAIR_ON : ICON_CROSSHAIR
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      enabled = !enabled
      onToggle(enabled)
      updateOrbState()
      buildPanel()
    })

    const sendBtn = document.createElement("button")
    sendBtn.className = "orb-icon-btn ac-send"
    sendBtn.title = "Send all"
    sendBtn.innerHTML = `${ICON_SEND_ALL}<span>Send</span>`
    sendBtn.disabled = queueItems.length === 0
    sendBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      onSendAll()
    })

    headerTitle.appendChild(toggleBtn)
    headerTitle.appendChild(title)
    headerActions.appendChild(sendBtn)
    header.appendChild(headerTitle)
    header.appendChild(headerActions)
    panel.appendChild(header)

    // Divider
    const divider1 = document.createElement("div")
    divider1.className = "orb-divider"
    panel.appendChild(divider1)

    // Annotation list
    const list = document.createElement("div")
    list.className = "orb-list"

    if (queueItems.length === 0) {
      const empty = document.createElement("div")
      empty.className = "orb-empty"
      empty.textContent = "No annotations"
      list.appendChild(empty)
    } else {
      queueItems.forEach((item, i) => {
        const row = document.createElement("div")
        row.className = "orb-item"

        const text = document.createElement("span")
        text.className = "orb-item-text"
        text.textContent = `"${item.annotation || item.selector}"`
        text.title = item.annotation || item.selector

        const actions = document.createElement("div")
        actions.className = "orb-item-actions"

        const editBtn = document.createElement("button")
        editBtn.className = "orb-item-btn"
        editBtn.innerHTML = ICON_PENCIL
        editBtn.title = "Edit"
        editBtn.addEventListener("click", (e) => {
          e.stopPropagation()
          onEditItem(i)
        })

        const removeBtn = document.createElement("button")
        removeBtn.className = "orb-item-btn orb-item-btn-danger"
        removeBtn.innerHTML = ICON_X
        removeBtn.title = "Remove"
        removeBtn.addEventListener("click", (e) => {
          e.stopPropagation()
          onRemoveItem(i)
        })

        actions.appendChild(editBtn)
        actions.appendChild(removeBtn)
        row.appendChild(text)
        row.appendChild(actions)
        list.appendChild(row)
      })
    }

    panel.appendChild(list)

    // Divider
    const divider2 = document.createElement("div")
    divider2.className = "orb-divider"
    panel.appendChild(divider2)

    // Footer: mode toggle
    const footer = document.createElement("div")
    footer.className = "orb-footer"

    const modeBtn = document.createElement("button")
    modeBtn.className = "orb-mode-btn"
    const modeIcon = mode === "steer" ? ICON_BULLSEYE : ICON_LIST
    const modeLabel = mode === "steer" ? "Steer" : "Queue"
    modeBtn.innerHTML = `${modeIcon} <span>Mode: ${modeLabel}</span>`

    const clearBtn = document.createElement("button")
    clearBtn.className = "orb-clear-btn"
    clearBtn.title = "Clear annotations"
    clearBtn.innerHTML = `${ICON_TRASH}<span>Clear</span>`
    clearBtn.disabled = queueItems.length === 0
    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      onClear()
    })

    const tooltip = document.createElement("div")
    tooltip.className = "orb-tooltip"
    tooltip.innerHTML = `
      <div class="orb-tooltip-row" data-mode="steer">
        <span class="orb-tooltip-icon">${ICON_BULLSEYE}</span>
        <div>
          <div class="orb-tooltip-label">Steer</div>
          <div class="orb-tooltip-desc">Sends immediately on selection</div>
        </div>
      </div>
      <div class="orb-tooltip-row" data-mode="queue">
        <span class="orb-tooltip-icon">${ICON_LIST}</span>
        <div>
          <div class="orb-tooltip-label">Queue</div>
          <div class="orb-tooltip-desc">Batches annotations, send all at once</div>
        </div>
      </div>
    `

    tooltip.querySelectorAll(".orb-tooltip-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        e.stopPropagation()
        const m = (row as HTMLElement).dataset.mode as "queue" | "steer"
        mode = m
        onModeChange(mode)
        tooltip.remove()
        buildPanel()
      })
    })

    function showTooltip() {
      tooltip.style.display = ""
      const btnRect = modeBtn.getBoundingClientRect()
      const tooltipW = 220
      let tLeft = btnRect.left
      if (tLeft + tooltipW > window.innerWidth - 8) tLeft = window.innerWidth - tooltipW - 8
      if (tLeft < 8) tLeft = 8
      tooltip.style.left = `${tLeft}px`
      tooltip.style.top = `${btnRect.top - 4}px`
      tooltip.style.transform = "translateY(-100%)"
      document.body.appendChild(tooltip)
    }

    function hideTooltip() {
      setTimeout(() => {
        if (!tooltip.matches(":hover") && !modeBtn.matches(":hover")) {
          tooltip.style.display = "none"
        }
      }, 150)
    }

    modeBtn.addEventListener("mouseenter", showTooltip)
    modeBtn.addEventListener("mouseleave", hideTooltip)
    tooltip.addEventListener("mouseenter", () => {})
    tooltip.addEventListener("mouseleave", hideTooltip)

    modeBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      mode = mode === "steer" ? "queue" : "steer"
      onModeChange(mode)
      tooltip.remove()
      buildPanel()
    })

    footer.appendChild(modeBtn)
    footer.appendChild(clearBtn)
    panel.appendChild(footer)
  }

  function updateBadge(count: number) {
    badge.textContent = String(count)
    badge.style.display = count > 0 ? "" : "none"
  }

  function updateOrbState() {
    orb.classList.toggle("ac-on", enabled)
    orb.innerHTML = enabled ? ICON_CROSSHAIR_ON : ICON_CROSSHAIR
  }

  return {
    element: root,
    updateEnabled: (value: boolean) => {
      enabled = value
      updateOrbState()
      if (expanded) buildPanel()
    },
    updateCount: (count: number) => {
      updateBadge(count)
    },
    updateMode: (value: "queue" | "steer") => {
      mode = value
      if (expanded) buildPanel()
    },
    updateQueue: (items: { selector: string; annotation: string }[]) => {
      queueItems = items
      updateBadge(items.length)
      if (expanded) buildPanel()
    },
    showQueue: () => {},
    hideQueue: () => collapse(),
  }
}
