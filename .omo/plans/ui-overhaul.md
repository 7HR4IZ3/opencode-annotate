# Annotation Client UI Overhaul

## TL;DR

> **Quick Summary**: Complete rewrite of the browser annotation client UI with a modern shadcn-like aesthetic. Adds floating toolbar, element badges, queue/steer modes, and removes the dark overlay popup.
>
> **Deliverables**:
> - Updated plugin `/annotate` command accepting optional session code
> - New floating bottom toolbar with toggle, queue, settings
> - New element badges showing annotation count
> - New positioned popup (no overlay)
> - Queue mode (batch send) and Steer mode (immediate send)
> - shadcn-inspired clean UI with system fonts, subtle borders, minimal shadows
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Types → Toolbar/Styles → Main Index → Build

---

## Context

### Original Request
User wants to:
1. Provide session code when running `/annotate` command
2. Default server URL to `ws://localhost:10300` (no data-server needed)
3. Complete UI overhaul:
   - Floating toolbar at bottom with enable/disable toggle
   - Queue view showing messages
   - Popup positioned near element (no overlay)
   - "Add" button adds to queue, "Send All" sends from footer
   - Floating numbered badges on annotated elements
   - Click badge to edit annotation
   - Settings for Queue vs Steer mode

### Design Direction
- shadcn-like: clean, minimal, system fonts, subtle borders
- NO oversized rounded corners, NO pill overload, NO glassmorphism
- Think: Linear, Raycast, Vercel dashboard aesthetic
- Toolbar: semi-transparent, blur, unobtrusive
- Badges: small circular, positioned at element corner
- Popup: compact, positioned near element, no dark overlay

---

## Work Objectives

### Core Objective
Rewrite the client library with a modern floating toolbar UI, element badges, and queue/steer modes. Update plugin command to accept session code.

### Definition of Done
- [ ] Plugin `/annotate` command accepts optional session code argument
- [ ] Client defaults to `ws://localhost:10300` (no data-server needed)
- [ ] Floating toolbar at bottom with toggle, queue panel, settings
- [ ] Element badges show annotation count
- [ ] Popup positioned near element (no overlay)
- [ ] Queue mode: add to queue, send all together
- [ ] Steer mode: send immediately on add
- [ ] Settings to toggle between modes
- [ ] Both plugin and client build successfully

### Must Have
- shadcn-like clean aesthetic
- Floating toolbar with toggle
- Element badges with numbers
- Queue/steer mode selection
- Settings panel

### Must NOT Have (Guardrails)
- NO dark overlay/popup background
- NO oversized rounded corners (>12px)
- NO pill-shaped buttons
- NO glassmorphism/frosted panels
- NO gradient backgrounds
- NO heavy box shadows
- NO generic AI aesthetics

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Framework**: None

### QA Policy
- Manual testing via test.html
- Visual inspection of UI elements
- Verify queue/steer modes work correctly

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation):
├── Task 1: Plugin command update [quick]
├── Task 2: Shared types update [quick]
└── Task 3: Styles foundation [quick]

Wave 2 (Core UI):
├── Task 4: Toolbar component [deep]
├── Task 5: Badges component [deep]
├── Task 6: Popup component [deep]
└── Task 7: WSClient updates [quick]

Wave 3 (Integration):
├── Task 8: Main index rewrite [deep]
├── Task 9: Test HTML update [quick]
└── Task 10: Build all [quick]

Wave FINAL:
├── F1: Visual QA
└── F2: Functionality check
```

---

## TODOs

- [ ] 1. Plugin: Update /annotate command to accept session code

  **What to do**:
  - Edit `/Users/thraize/Documents/Programming/opencode-annotate-plugin/plugin/src/index.ts`
  - Update `ANNOTATE_COMMAND` constant to mention optional session code
  - The command markdown should say: "If user provides a session code after the command, use that. Otherwise create new."
  - Update tool output to show `data-server` is optional (defaults to ws://localhost:10300)

  **Must NOT do**:
  - Don't change the tool's execute function signature (args: {} is fine)
  - Don't break existing session creation flow

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `/Users/thraize/Documents/Programming/opencode-annotate-plugin/plugin/src/index.ts:12-25` - Current ANNOTATE_COMMAND constant

  **Acceptance Criteria**:
  - [ ] ANNOTATE_COMMAND mentions optional session code
  - [ ] Tool output shows data-server is optional

  **Commit**: YES
  - Message: `feat(plugin): accept optional session code in /annotate command`
  - Files: `plugin/src/index.ts`

---

- [ ] 2. Client: Update ws-client.ts with ack callback

  **What to do**:
  - Edit `/Users/thraize/Documents/Programming/opencode-annotate-plugin/client/src/ws-client.ts`
  - Add `onAck?: (messageId: string) => void` callback option
  - Add `onError?: (message: string) => void` callback option
  - Call these in handleMessage when receiving ack/error messages
  - This allows the main index to track sent messages

  **Must NOT do**:
  - Don't change the WebSocket connection logic
  - Don't break ping/pong

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 8
  - **Blocked By**: None

  **References**:
  - `/Users/thraize/Documents/Programming/opencode-annotate-plugin/client/src/ws-client.ts:1-114` - Current implementation

  **Acceptance Criteria**:
  - [ ] WSClientOptions has onAck and onError callbacks
  - [ ] handleMessage calls these callbacks

  **Commit**: YES
  - Message: `feat(client): add ack/error callbacks to WSClient`
  - Files: `client/src/ws-client.ts`

---

- [ ] 3. Client: Rewrite styles.ts with shadcn-like design tokens

  **What to do**:
  - Edit `/Users/thraize/Documents/Programming/opencode-annotate-plugin/client/src/styles.ts`
  - Complete rewrite with CSS variables for a shadcn-like design system
  - Include styles for:
    - `[data-annotate-toolbar]` - floating bottom toolbar
    - `[data-annotate-toolbar-toggle]` - toggle button
    - `[data-annotate-toolbar-queue]` - queue panel
    - `[data-annotate-toolbar-settings]` - settings panel
    - `[data-annotate-badge]` - element badges
    - `[data-annotate-popup]` - positioned popup (no overlay)
    - `[data-annotate-highlight]` - element highlight
  - Use system fonts, subtle borders, minimal shadows
  - CSS variables for colors, spacing, radius

  **Must NOT do**:
  - NO oversized rounded corners (>12px)
  - NO gradient backgrounds
  - NO heavy box shadows
  - NO glassmorphism

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`, `vercel-web-interface-guidelines`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Tasks 4, 5, 6, 8
  - **Blocked By**: None

  **References**:
  - shadcn/ui design system for reference
  - `/Users/thraize/Documents/Programming/opencode-annotate-plugin/client/src/styles.ts:1-22` - Current minimal styles

  **Acceptance Criteria**:
  - [ ] CSS variables defined for design tokens
  - [ ] All component styles included
  - [ ] No oversized corners, no gradients, no heavy shadows

  **Commit**: YES
  - Message: `feat(client): add shadcn-like design tokens and component styles`
  - Files: `client/src/styles.ts`

---

- [ ] 4. Client: Create toolbar.ts - floating bottom toolbar

  **What to do**:
  - Create `/Users/thraize/Documents/Programming/opencode-annotate-plugin/client/src/toolbar.ts`
  - Export `createToolbar(options)` function
  - Options: `{ onToggle: (enabled: boolean) => void, onSendAll: () => void, onClear: () => void, onModeChange: (mode: 'queue' | 'steer') => void, queue: AnnotationQueueItem[] }`
  - Returns: `{ element: HTMLElement, updateQueue: (queue) => void, updateEnabled: (enabled) => void }`
  - Structure:
    ```
    [Toggle: Annotator Off/On] [Queue Count] [Settings Gear]
    ```
  - When settings clicked, shows dropdown with Queue/Steer toggle
  - Queue panel expands to show items with remove buttons
  - "Send All" and "Clear" buttons in queue panel
  - Fixed at bottom center, z-index 2147483646

  **Must NOT do**:
  - NO glassmorphism/frosted effect
  - NO gradient backgrounds
  - Keep it minimal and functional

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`, `vercel-web-interface-guidelines`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Task 3

  **References**:
  - Vercel dashboard toolbar for reference
  - Linear app bottom bar for reference

  **Acceptance Criteria**:
  - [ ] Toolbar renders at bottom center
  - [ ] Toggle button switches enabled/disabled state
  - [ ] Settings dropdown shows Queue/Steer toggle
  - [ ] Queue panel shows items with remove buttons
  - [ ] Send All and Clear buttons work

  **Commit**: YES
  - Message: `feat(client): create floating toolbar component`
  - Files: `client/src/toolbar.ts`

---

- [ ] 5. Client: Create badges.ts - element annotation badges

  **What to do**:
  - Create `/Users/thraize/Documents/Programming/opencode-annotate-plugin/client/src/badges.ts`
  - Export `BadgeManager` class
  - Methods:
    - `addBadge(element: Element, index: number, onClick: () => void): HTMLElement`
    - `removeBadge(badge: HTMLElement): void`
    - `updateBadge(badge: HTMLElement, index: number): void`
    - `removeAll(): void`
    - `hide(): void`
    - `show(): void`
  - Badge: small circular element (20px), positioned at top-right of target element
  - Shows number (1, 2, 3...)
  - Click handler to edit annotation
  - Uses `[data-annotate-badge]` selector

  **Must NOT do**:
  - Don't block click events on the underlying element when badge is hidden
  - Keep badges small and unobtrusive

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Task 3

  **References**:
  - VS Code error badges for reference
  - GitHub notification dots for reference

  **Acceptance Criteria**:
  - [ ] Badge appears at top-right of element
  - [ ] Badge shows correct number
  - [ ] Click handler fires
  - [ ] hide/show works
  - [ ] removeAll works

  **Commit**: YES
  - Message: `feat(client): create element badge manager`
  - Files: `client/src/badges.ts`

---

- [ ] 6. Client: Rewrite popup.ts - positioned near element

  **What to do**:
  - Edit `/Users/thraize/Documents/Programming/opencode-annotate-plugin/client/src/popup.ts`
  - Complete rewrite - NO overlay
  - Export `showAnnotationPopup(options)` function
  - Options: `{ element: AnnotatedElement, screenshot: string | null, onAdd: (annotation: string) => void, onCancel: () => void, existingAnnotation?: string }`
  - Popup positioned below element (or above if not enough space)
  - Compact design:
    - Small selector label
    - Screenshot thumbnail (if exists)
    - Text input
    - "Add" button (adds to queue in queue mode)
    - "Cancel" link
  - Close on Escape or clicking outside
  - Uses `[data-annotate-popup]` selector

  **Must NOT do**:
  - NO dark overlay background
  - NO centering on screen
  - NO heavy shadows

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`, `vercel-web-interface-guidelines`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Task 3

  **References**:
  - GitHub comment popover for reference
  - Linear tooltip/popover for reference

  **Acceptance Criteria**:
  - [ ] Popup appears below element (or above if no space)
  - [ ] No dark overlay
  - [ ] Shows selector, screenshot, input, Add button
  - [ ] Closes on Escape
  - [ ] Closes on outside click
  - [ ] Supports editing existing annotation

  **Commit**: YES
  - Message: `feat(client): rewrite popup to position near element`
  - Files: `client/src/popup.ts`

---

- [ ] 7. Client: Update annotator.ts - keep active in queue mode

  **What to do**:
  - Edit `/Users/thraize/Documents/Programming/opencode-annotate-plugin/client/src/annotator.ts`
  - Add `isStarted: boolean` public getter
  - Add `mode: 'queue' | 'steer'` property
  - In queue mode: DON'T call `this.stop()` after click - keep annotator active
  - In steer mode: call `this.stop()` after click (current behavior)
  - Add `setMode(mode)` method

  **Must NOT do**:
  - Don't break the highlight behavior
  - Don't break Escape to cancel

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6)
  - **Blocks**: Task 8
  - **Blocked By**: None

  **References**:
  - `/Users/thraize/Documents/Programming/opencode-annotate-plugin/client/src/annotator.ts:1-125` - Current implementation

  **Acceptance Criteria**:
  - [ ] `isStarted` getter exists
  - [ ] `setMode(mode)` method exists
  - [ ] Queue mode keeps annotator active after click
  - [ ] Steer mode stops annotator after click

  **Commit**: YES
  - Message: `feat(client): support queue mode in annotator`
  - Files: `client/src/annotator.ts`

---

- [ ] 8. Client: Rewrite index.ts - integrate all components

  **What to do**:
  - Edit `/Users/thraize/Documents/Programming/opencode-annotate-plugin/client/src/index.ts`
  - Complete rewrite to integrate toolbar, badges, popup, queue/steer modes
  - State management:
    - `enabled: boolean` - annotator on/off
    - `mode: 'queue' | 'steer'` - current mode
    - `queue: Array<{element, selector, text, rect, screenshot, annotation}>` - annotation queue
  - Flow:
    - Init: create toolbar, start annotator in disabled state
    - Toggle: enable/disable annotator, show/hide badges
    - Element click:
      - If queue mode: show popup, on add → add to queue, show badge, keep annotator active
      - If steer mode: show popup, on add → send immediately, stop annotator
    - Send All: send all queued annotations, clear queue, remove badges
    - Clear: clear queue, remove badges
    - Badge click: show popup with existing annotation for editing
  - Auto-init from script tag (data-session, optional data-server)

  **Must NOT do**:
  - Don't send annotations in queue mode until "Send All"
  - Don't stop annotator in queue mode after element click

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (with Tasks 9, 10)
  - **Blocks**: Task 10
  - **Blocked By**: Tasks 4, 5, 6, 7

  **References**:
  - `/Users/thraize/Documents/Programming/opencode-annotate-plugin/client/src/index.ts:1-105` - Current implementation

  **Acceptance Criteria**:
  - [ ] Toolbar initializes on init
  - [ ] Queue mode adds to queue, doesn't send
  - [ ] Steer mode sends immediately
  - [ ] Send All sends all queued items
  - [ ] Badges show on annotated elements
  - [ ] Badge click opens edit popup
  - [ ] Settings toggle changes mode

  **Commit**: YES
  - Message: `feat(client): integrate toolbar, badges, queue/steer modes`
  - Files: `client/src/index.ts`

---

- [ ] 9. Update test.html

  **What to do**:
  - Edit `/Users/thraize/Documents/Programming/opencode-annotate-plugin/test.html`
  - Remove `data-server` attribute from script tag (use default)
  - Keep `data-session` for testing
  - Uncomment the script tag

  **Must NOT do**:
  - Don't change the HTML structure
  - Don't remove the test content

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 10)
  - **Blocks**: Task 10
  - **Blocked By**: None

  **References**:
  - `/Users/thraize/Documents/Programming/opencode-annotate-plugin/test.html:72-76` - Current script tag

  **Acceptance Criteria**:
  - [ ] Script tag uses data-session only
  - [ ] Script tag is uncommented

  **Commit**: YES
  - Message: `chore: update test.html to use default server`
  - Files: `test.html`

---

- [ ] 10. Build plugin and client

  **What to do**:
  - Run build commands:
    ```bash
    cd /Users/thraize/Documents/Programming/opencode-annotate-plugin/plugin && bun run build
    cd /Users/thraize/Documents/Programming/opencode-annotate-plugin/client && bun run build
    ```
  - Verify no build errors
  - Verify output files exist

  **Must NOT do**:
  - Don't modify any source files

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential after Task 8)
  - **Blocks**: None
  - **Blocked By**: Tasks 8, 9

  **References**:
  - `plugin/package.json` - build script
  - `client/package.json` - build script

  **Acceptance Criteria**:
  - [ ] Plugin build succeeds
  - [ ] Client build succeeds
  - [ ] `plugin/dist/index.js` exists
  - [ ] `client/dist/index.js` exists

  **Commit**: YES
  - Message: `chore: build plugin and client`
  - Files: `plugin/dist/index.js`, `client/dist/index.js`

---

## Final Verification Wave

- [ ] F1. **Visual QA** — `unspecified-high`
  Open test.html in browser. Verify:
  - Toolbar appears at bottom center
  - Toggle enables/disables annotator
  - Clicking element shows popup near it (no overlay)
  - Adding annotation shows badge on element
  - Queue panel shows items
  - Settings toggle switches mode
  - Send All sends all annotations
  Output: `Toolbar [PASS/FAIL] | Popup [PASS/FAIL] | Badges [PASS/FAIL] | Queue [PASS/FAIL] | VERDICT`

- [ ] F2. **Functionality Check** — `unspecified-high`
  Test the full flow:
  1. Enable annotator
  2. Click element → popup appears
  3. Add annotation → badge appears
  4. Repeat for 2 more elements
  5. Click Send All → annotations sent to OpenCode
  6. Verify annotations appear in OpenCode session
  Output: `Flow [PASS/FAIL] | Annotations [N sent] | VERDICT`

---

## Commit Strategy

1. `feat(plugin): accept optional session code in /annotate command`
2. `feat(client): add ack/error callbacks to WSClient`
3. `feat(client): add shadcn-like design tokens and component styles`
4. `feat(client): create floating toolbar component`
5. `feat(client): create element badge manager`
6. `feat(client): rewrite popup to position near element`
7. `feat(client): support queue mode in annotator`
8. `feat(client): integrate toolbar, badges, queue/steer modes`
9. `chore: update test.html to use default server`
10. `chore: build plugin and client`

---

## Success Criteria

### Final Checklist
- [ ] Plugin accepts optional session code
- [ ] Client defaults to ws://localhost:10300
- [ ] Floating toolbar at bottom
- [ ] Toggle enables/disables annotator
- [ ] Queue panel shows items
- [ ] Settings toggles Queue/Steer mode
- [ ] Popup positioned near element (no overlay)
- [ ] Badges show on annotated elements
- [ ] Queue mode: add to queue, send all together
- [ ] Steer mode: send immediately
- [ ] Badge click opens edit popup
- [ ] Both builds succeed
