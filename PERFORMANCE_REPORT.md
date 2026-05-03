# SCUM Loot Manager - Performance Optimization Report

This document outlines the performance optimizations implemented in the project.

## 1. Directory Structure Recommendations

For scaling the project, consider adopting a more feature-based directory structure:

```
/src
  /components           # Shared generic components
    /ui                 # shadcn/ui generic components
  /features             # Feature-based modules
    /editor             # VisualEditor and subcomponents
    /file-tree          # FileTree and related navigation
    /settings           # Server settings
  /hooks                # Global hooks (e.g., useKeyboardShortcuts)
  /store                # Global Zustand store
  /lib                  # Utilities (utils.js, api config)
  /services             # API / DB services
  /types                # TypeScript types
  /locales              # i18n translation files
```

## 2. Package.json Updates

Added these essential performance and state management libraries:
- `@tanstack/react-virtual`: For virtualizing large lists (File Tree, JSON objects).
- `zustand`: Lightweight global state management replacing complex Context setups where possible.
- `@tanstack/react-query`: Optimal data fetching, caching, and background syncing.
- `cmdk`: Accessible and customizable command palette.
- `react-resizable-panels`: Managed resizable layout performance.

## 3. Core Component Optimizations

- **FileTree Virtualization**: Used `@tanstack/react-virtual` with a custom scrolling container. Nodes are now rendered on-demand, solving performance issues with thousands of files.
- **Visual Editor Optimization**: 
  - `ItemsSection` and `NodesSection` are significantly faster. Added fixed-height scroll containers and applied TanStack Virtual to handle editing massive Loot arrays without causing UI lockups.
- **Deferred Parsing (App.tsx)**: Applied `useDeferredValue` to `currentFileContent` and wrapped `JSON.parse` in a `useMemo`. This moves the heavy parsing off the immediate user-interaction UI thread, keeping clicks and typing responsive.
- **Command Palette (cmdk)**: 
  - Added global `Ctrl+K` shortcut.
  - Search input uses `useDeferredValue` to debounce heavy file and translation fuzzy-matching.
  - The results list uses `@tanstack/react-virtual` to seamlessly fly through unlimited match results.
- **Zustand Store**: Reorganized simple config points and selection state mapping into `src/store/index.ts` to reduce `App.tsx` re-render frequency on deep components.
- **React Query**: Configured a `QueryClient` inside `index.tsx` as preparation to replace manual `fetch` calls and caching for `services/fileSystem.ts`.

## 4. Performance Optimization Checklist

- [x] **Virtualization**: Replace any `<List>` or large `.map()` with `useVirtualizer`.
- [x] **Deferred Values**: Wrap text-search parameters and file content in `useDeferredValue` to de-prioritize heavy computation.
- [x] **Memoization**: Cache `JSON.parse` parsing inside `useMemo` triggered by the deferred raw string.
- [x] **State Minimization**: Avoid holding massive nested strings inside standard React states blindly.
- [ ] **Data Fetching (Next Step)**: Gradually move `fileSystem.ts` reads into `useQuery` hooks.
- [ ] **Context Splitting (Next Step)**: If continuing to use contexts (e.g. `SettingsContext`), ensure value objects are `useMemo`-ed to prevent downstream re-renders on context updates.
