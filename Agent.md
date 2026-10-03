# Zournel — Mobile-First Design & Feature Specification (`Agent.md`)

## Core Principles
1. **Mobile-First Primary Target**: Every view, navigation bar, context menu, and editor interaction is designed for one-handed mobile use first (`320px–430px` viewports, `44px` minimum touch targets, safe-area insets, zero horizontal overflow, focus-preserving toolbars that never accidentally dismiss the mobile keyboard).
2. **Stacking Context Discipline**: Top-level header action menus (`Plus`, `Kebab`) in `JournalEditor` must live in a stacking context (`z-[60]`–`z-[90]`) outside any `overflow-hidden` cover container so they never clip or render behind the `z-20`/`z-40` formatting toolbar.
3. **Cohesive Navigation Rhythm**: All primary tabs (`Tasks`, `Journal`, `Account`) share `PageHeader` + `DraggableSegmentedToggle` and a sticky translucent top navigation bar.

## Feature Specifications

### 1. Progressive Gradient Memory Resurfacing ("On This Day / Resurfaced")
- **Placement**: Rendered at the very top of `JournalView` so returning users immediately encounter meaningful past reflections before scrolling the timeline.
- **Visual & Accessibility Design**:
  - Uses a **progressive multi-stop gradient** (`from-accent/15 via-accent/5 to-transparent`) with a progressive horizontal edge fade mask on mobile touch carousels.
  - Minimal, high-contrast typography (`text-primary` / `text-secondary`), semantic `<section aria-label="Resurfaced Memories">`, keyboard focus rings, and a 1-tap collapse toggle.
- **Resurfacing Logic**:
  - Prioritizes temporal milestones (`N years ago`, `1 month ago`, `1 week ago`) and gracefully falls back to earlier archived memories when milestone dates are not yet populated.
  - Includes a 1-tap **`Reflect`** action on each resurfaced card that opens a new memory pre-linked to the resurfaced memory.

### 2. Bidirectional Mentions (Memory ↔ Memory & Task ↔ Memory)
- **Data Model (`types.ts`)**:
  - `JournalEntry.linkedEntryIds?: string[]` — IDs of other memories connected to this memory.
  - `JournalEntry.linkedTaskIds?: string[]` — IDs of tasks connected to this memory.
  - `Task.linkedEntryId?: string` — ID of the memory linked to this task.
- **Bidirectional Synchronization (`useJournalStore.ts` & `useTaskStore.ts`)**:
  - When **Memory A** mentions **Memory B**, both `A.linkedEntryIds` includes `B.id` and `B.linkedEntryIds` includes `A.id` (automatic backlink).
  - When **Memory A** links **Task T** (or **Task T** creates/links **Memory A**), both `A.linkedTaskIds` includes `T.id` and `T.linkedEntryId` is set to `A.id`.
- **Mobile-First UX**:
  - **In `JournalEditor`**: A dedicated `@` Mention button in the toolbar/header (and `@` trigger) opens a mobile-friendly Mention Picker with tabs for **Memories** and **Tasks** (plus 1-tap AI Task Extraction). Connected memories and tasks render as interactive chips below the title—tapping a mentioned memory switches directly to it; tapping a linked task toggles completion.
  - **In `JournalView`**: Memory cards display interactive chips for linked memories and tasks.
  - **In `TodoView`**: Tasks show a linked memory badge (`📖 Memory Title`) that opens the referenced memory on tap, or a 1-tap `Reflect` icon to start a new linked memory.
