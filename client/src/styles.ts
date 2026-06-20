const STYLES = `
  :root {
    --ac-bg: #ffffff;
    --ac-bg-secondary: #f4f4f5;
    --ac-bg-tertiary: #e4e4e7;
    --ac-border: #d4d4d8;
    --ac-border-hover: #a1a1aa;
    --ac-text: #18181b;
    --ac-text-secondary: #71717a;
    --ac-text-tertiary: #a1a1aa;
    --ac-primary: #18181b;
    --ac-primary-hover: #27272a;
    --ac-accent: #3b82f6;
    --ac-accent-hover: #2563eb;
    --ac-destructive: #ef4444;
    --ac-destructive-hover: #dc2626;
    --ac-success: #22c55e;
    --ac-radius: 6px;
    --ac-radius-sm: 4px;
    --ac-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
    --ac-shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
    --ac-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --ac-font-mono: "SF Mono", SFMono-Regular, ui-monospace, "DejaVu Sans Mono", Menlo, Consolas, monospace;
    --ac-transition: 120ms ease;
  }

  /* Highlight */
  [data-annotate-highlight] {
    position: fixed;
    pointer-events: none;
    z-index: 2147483646;
    border: 2px solid var(--ac-accent);
    background: rgba(59, 130, 246, 0.06);
    border-radius: 2px;
  }

  [data-annotate-drag-box] {
    position: fixed;
    pointer-events: none;
    z-index: 2147483646;
    border: 1px solid var(--ac-accent);
    background: rgba(59, 130, 246, 0.08);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.35);
  }

  [data-annotate-selected-highlight] {
    position: fixed;
    pointer-events: none;
    z-index: 2147483645;
    border: 1px solid var(--ac-accent);
    background: rgba(59, 130, 246, 0.05);
    border-radius: 2px;
  }

  /* Badge */
  [data-annotate-badge] {
    position: fixed;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--ac-accent);
    color: white;
    font-family: var(--ac-font);
    font-size: 11px;
    font-weight: 600;
    line-height: 20px;
    text-align: center;
    cursor: pointer;
    z-index: 2147483646;
    box-shadow: 0 0 0 2px white;
    transform: translate(35%, -35%);
    transition: background var(--ac-transition), scale var(--ac-transition);
    user-select: none;
  }

  [data-annotate-badge]:hover {
    scale: 1.15;
    background: var(--ac-accent-hover);
  }

  [data-annotate-badge].ac-badge-hidden {
    display: none;
  }

  /* Popup */
  [data-annotate-popup] {
    position: fixed;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 8px;
    background: #2b2b2b;
    border: 1px solid #3a3a3a;
    border-radius: 22px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.18);
    padding: 0 10px;
    width: 336px;
    height: 44px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    color: #e5e5e5;
    animation: ac-popup-in 100ms ease;
  }

  @keyframes ac-popup-in {
    from { opacity: 0; transform: translateY(3px); }
    to { opacity: 1; transform: translateY(0); }
  }

  [data-annotate-popup] .ac-popup-icon-btn {
    width: 26px;
    height: 26px;
    flex: 0 0 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 13px;
    background: transparent;
    color: #8f8f8f;
    cursor: pointer;
    padding: 0;
    touch-action: manipulation;
    transition: color 120ms, background 120ms;
  }

  [data-annotate-popup] .ac-popup-icon-btn:hover {
    background: #363636;
    color: #d4d4d4;
  }

  [data-annotate-popup] .ac-popup-cancel {
    width: 20px;
    flex-basis: 20px;
  }

  [data-annotate-popup] .ac-popup-icon-btn:disabled {
    color: #5f5f5f;
    cursor: not-allowed;
  }

  [data-annotate-popup] .ac-popup-icon-btn:disabled:hover {
    background: transparent;
    color: #5f5f5f;
  }

  [data-annotate-popup] .ac-popup-mode-steer {
    color: #d4d4d4;
    background: #363636;
  }

  [data-annotate-popup] .ac-popup-submit {
    margin-left: auto;
    color: #d4d4d4;
  }

  [data-annotate-popup] .ac-popup-textarea {
    flex: 1;
    min-width: 0;
    height: 24px;
    min-height: 24px;
    max-height: 24px;
    padding: 3px 0 0;
    border: none;
    border-left: 1px solid #4a4a4a;
    border-radius: 0;
    padding-left: 10px;
    font-family: inherit;
    font-size: 13px;
    line-height: 18px;
    color: #e5e5e5;
    background: transparent;
    resize: none;
    box-sizing: border-box;
    outline: none;
    overflow: hidden;
  }

  [data-annotate-popup] .ac-popup-textarea::placeholder {
    color: #777;
  }

  [data-annotate-popup] .ac-popup-icon-btn svg {
    display: block;
    pointer-events: none;
  }

  /* Orb */
  [data-annotate-orb] {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483646;
    font-family: var(--ac-font);
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    user-select: none;
    -webkit-user-select: none;
  }

  [data-annotate-orb] > * {
    pointer-events: auto;
  }

  [data-annotate-orb] {
    position: fixed;
    z-index: 2147483647;
    bottom: 24px;
    right: 24px;
    left: auto;
    transform: none;
  }

  [data-annotate-orb-btn] {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid var(--ac-border);
    background: var(--ac-bg);
    color: var(--ac-text-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    touch-action: none;
    transition: all 180ms ease;
    user-select: none;
    -webkit-user-select: none;
  }

  [data-annotate-orb-btn] svg {
    display: block;
    fill: none;
    stroke: currentColor;
  }

  [data-annotate-orb-btn]:hover {
    border-color: #a1a1aa;
    color: #18181b;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  [data-annotate-orb-btn].ac-on {
    border-color: #3b82f6;
    color: #3b82f6;
    background: rgba(59, 130, 246, 0.04);
  }

  [data-annotate-orb-btn].ac-on:hover {
    background: rgba(59, 130, 246, 0.08);
  }

  [data-annotate-orb-btn] svg {
    display: block;
    pointer-events: none;
  }

  [data-annotate-orb-badge] {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    background: #3b82f6;
    color: white;
    font-size: 10px;
    font-weight: 600;
    line-height: 18px;
    text-align: center;
    padding: 0 4px;
    box-shadow: 0 0 0 2px white;
    pointer-events: none;
  }

  [data-annotate-orb-panel] {
    position: fixed;
    z-index: 2147483647;
    background: #fff;
    border: 1px solid #e4e4e7;
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06);
    padding: 0;
    width: 260px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    animation: ac-orb-in 100ms ease;
    overflow: hidden;
  }

  @keyframes ac-orb-in {
    from { opacity: 0; transform: translateY(3px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .orb-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
  }

  .orb-title {
    font-size: 12px;
    font-weight: 600;
    color: #09090b;
  }

  .orb-header-title {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .orb-header-actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .orb-toggle {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #a1a1aa;
    cursor: pointer;
    transition: background 120ms, color 120ms;
  }

  .orb-toggle svg {
    display: block;
    pointer-events: none;
  }

  .orb-toggle:hover {
    background: #f4f4f5;
    color: #18181b;
  }

  .orb-toggle.ac-on {
    color: #3b82f6;
  }

  .orb-icon-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #a1a1aa;
    cursor: pointer;
    transition: background 120ms, color 120ms;
  }

  .orb-icon-btn svg {
    display: block;
    pointer-events: none;
  }

  .orb-icon-btn:hover {
    background: #f4f4f5;
    color: #18181b;
  }

  .orb-icon-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .orb-icon-btn:disabled:hover {
    background: transparent;
  }

  .orb-icon-btn.ac-send {
    width: auto;
    min-width: 60px;
    gap: 5px;
    padding: 0 8px;
    color: #3b82f6;
  }

  .orb-icon-btn.ac-send:hover {
    background: rgba(59, 130, 246, 0.08);
  }

  .orb-divider {
    height: 1px;
    background: #f4f4f5;
  }

  .orb-list {
    max-height: 200px;
    overflow-y: auto;
  }

  .orb-empty {
    padding: 20px 12px;
    text-align: center;
    color: #a1a1aa;
    font-size: 12px;
  }

  .orb-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 12px;
    transition: background 120ms;
  }

  .orb-item:hover {
    background: #fafafa;
  }

  .orb-item-text {
    flex: 1;
    font-size: 12px;
    color: #3f3f46;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .orb-item-actions {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .orb-item-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: #a1a1aa;
    cursor: pointer;
    transition: background 120ms, color 120ms;
  }

  .orb-item-btn svg {
    display: block;
    width: 15px;
    height: 15px;
    pointer-events: none;
  }

  .orb-item-btn:hover {
    background: #f4f4f5;
    color: #18181b;
  }

  .orb-item-btn-danger:hover {
    background: rgba(239, 68, 68, 0.08);
    color: #ef4444;
  }

  .orb-footer {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
  }

  .orb-mode-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
    padding: 6px 8px;
    border: 1px solid #e4e4e7;
    border-radius: 4px;
    background: #fafafa;
    color: #3f3f46;
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 120ms, border-color 120ms;
  }

  .orb-mode-btn svg {
    display: block;
    pointer-events: none;
    color: #a1a1aa;
  }

  .orb-mode-btn:hover {
    background: #f4f4f5;
    border-color: #d4d4d8;
  }

  .orb-clear-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-width: 68px;
    height: 31px;
    padding: 0 8px;
    border: 1px solid #e4e4e7;
    border-radius: 4px;
    background: #fff;
    color: #71717a;
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 120ms, border-color 120ms, color 120ms;
  }

  .orb-clear-btn svg {
    display: block;
    pointer-events: none;
  }

  .orb-clear-btn:hover {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.24);
    color: #ef4444;
  }

  .orb-clear-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .orb-clear-btn:disabled:hover {
    background: #fff;
    border-color: #e4e4e7;
    color: #71717a;
  }

  .orb-tooltip {
    position: fixed;
    z-index: 2147483647;
    background: #fff;
    border: 1px solid #e4e4e7;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    padding: 4px;
    width: 220px;
    display: none;
  }

  .orb-tooltip-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 120ms;
  }

  .orb-tooltip-row:hover {
    background: #f4f4f5;
  }

  .orb-tooltip-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    color: #a1a1aa;
  }

  .orb-tooltip-icon svg {
    display: block;
  }

  .orb-tooltip-label {
    font-size: 12px;
    font-weight: 500;
    color: #18181b;
    margin-bottom: 1px;
  }

  .orb-tooltip-desc {
    font-size: 11px;
    color: #71717a;
    line-height: 1.3;
  }
`

export function injectStyles(): void {
  if (document.querySelector("style[data-annotate-styles]")) {
    return
  }

  const style = document.createElement("style")
  style.setAttribute("data-annotate-styles", "")
  style.textContent = STYLES
  document.head.appendChild(style)
}
