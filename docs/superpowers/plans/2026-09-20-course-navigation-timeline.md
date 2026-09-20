# Course Navigation and Release Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every lesson directly available from collapsible release groups, replace the horizontal release strip with a vertical timeline, and bring release-page typography to a comfortable reading scale.

**Architecture:** Generate VitePress sidebar groups from the existing release metadata and the numbered lesson Markdown files, keeping curriculum data as the source of labels and filesystem names as the source of URLs. Preserve the existing Vue components and public props while changing only presentation CSS and homepage guidance.

**Tech Stack:** VitePress 1.6, Vue 3.5, TypeScript 5.9, Vitest 3.2, Node.js 22

## Global Constraints

- Keep release and lesson content, order, and URLs unchanged.
- Keep `LessonMission`'s existing `role`, `problem`, and `destination` props.
- Keep the homepage hero unchanged.
- Add no UI dependency and no learner-progress behavior.
- Preserve semantic navigation, keyboard focus styles, and capability marker colors.

---

### Task 1: Collapsible lesson sidebar

**Files:**
- Create: `.vitepress/sidebar.ts`
- Modify: `.vitepress/config.ts`
- Create: `tests/sidebar.test.ts`

**Interfaces:**
- Consumes: `releases: ReleaseDefinition[]` from `.vitepress/theme/data/course.ts` and numbered lesson files under `docs/releases/<release-id>/`.
- Produces: `createReleaseSidebar(releasesRoot: string): DefaultTheme.SidebarItem[]`.

- [ ] **Step 1: Write the failing sidebar test**

```ts
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { createReleaseSidebar } from '../.vitepress/sidebar'
import { releases } from '../.vitepress/theme/data/course'

const releasesRoot = fileURLToPath(new URL('../docs/releases/', import.meta.url))

describe('release sidebar', () => {
  it('creates a collapsed group with an overview and every lesson', () => {
    const sidebar = createReleaseSidebar(releasesRoot)
    const firstRelease = sidebar[0]

    expect(sidebar).toHaveLength(14)
    expect(firstRelease).toMatchObject({
      text: 'R0 · Your Python workshop',
      collapsed: true,
    })
    expect(firstRelease.items).toHaveLength(releases[0].lessons.length + 1)
    expect(firstRelease.items?.[0]).toEqual({
      text: 'Overview',
      link: '/releases/r0/',
    })
    expect(firstRelease.items?.[1]).toEqual({
      text: releases[0].lessons[0].title,
      link: '/releases/r0/01-welcome-to-gold-pasal-the-product-learner-contract-and-graduation-evidence',
    })
  })

  it('generates a link to an existing file for every lesson', () => {
    const sidebar = createReleaseSidebar(releasesRoot)
    const lessonLinks = sidebar.flatMap((group) => group.items?.slice(1) ?? [])

    expect(lessonLinks).toHaveLength(
      releases.reduce((total, release) => total + release.lessons.length, 0),
    )
  })
})
```

- [ ] **Step 2: Run the test and confirm the missing module failure**

Run: `npm test -- --run tests/sidebar.test.ts`

Expected: FAIL because `.vitepress/sidebar.ts` does not exist.

- [ ] **Step 3: Implement filesystem-backed sidebar generation**

Create `.vitepress/sidebar.ts`:

```ts
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { DefaultTheme } from 'vitepress'

import { releases } from './theme/data/course'

function lessonFilename(releasesRoot: string, releaseId: string, order: number): string {
  const prefix = `${String(order).padStart(2, '0')}-`
  const matches = readdirSync(join(releasesRoot, releaseId)).filter(
    (filename) => filename.startsWith(prefix) && filename.endsWith('.md'),
  )

  if (matches.length !== 1) {
    throw new Error(
      `${releaseId} lesson ${order}: expected one Markdown file, found ${matches.length}`,
    )
  }

  return matches[0].replace(/\.md$/, '')
}

export function createReleaseSidebar(releasesRoot: string): DefaultTheme.SidebarItem[] {
  return releases.map((release) => ({
    text: `${release.id.toUpperCase()} · ${release.title}`,
    collapsed: true,
    items: [
      { text: 'Overview', link: `/releases/${release.id}/` },
      ...release.lessons.map((lesson) => ({
        text: lesson.title,
        link: `/releases/${release.id}/${lessonFilename(
          releasesRoot,
          release.id,
          lesson.order,
        )}`,
      })),
    ],
  }))
}
```

Update `.vitepress/config.ts` to resolve the release-docs directory and replace the flat `releaseSidebar` mapping:

```ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'

import { createReleaseSidebar } from './sidebar'

const releasesRoot = fileURLToPath(new URL('../docs/releases/', import.meta.url))
const releaseSidebar = createReleaseSidebar(releasesRoot)
```

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run tests/sidebar.test.ts`

Expected: 2 tests pass.

- [ ] **Step 5: Commit the sidebar change**

```bash
git add .vitepress/config.ts .vitepress/sidebar.ts tests/sidebar.test.ts
git commit -m "feat: expose lessons in collapsible release navigation"
```

### Task 2: Vertical release timeline

**Files:**
- Modify: `.vitepress/theme/components/ReleaseConstellation.vue`
- Modify: `docs/index.md`
- Modify: `tests/components.test.ts`

**Interfaces:**
- Consumes: the existing `releases` array and capability labels.
- Produces: a vertical linked timeline with the same `ReleaseConstellation` component API.

- [ ] **Step 1: Add release-path component coverage**

Add the import and test to `tests/components.test.ts`:

```ts
import ReleaseConstellation from '../.vitepress/theme/components/ReleaseConstellation.vue'

it('renders every release as a linked step in order', () => {
  const wrapper = mount(ReleaseConstellation)
  const links = wrapper.findAll('a')

  expect(links).toHaveLength(14)
  expect(links[0].attributes('href')).toBe('/releases/r0/')
  expect(links[13].attributes('href')).toBe('/releases/r13/')
  expect(wrapper.get('ol').classes()).toContain('constellation__timeline')
})
```

- [ ] **Step 2: Run the focused test and confirm the missing timeline class**

Run: `npm test -- --run tests/components.test.ts`

Expected: FAIL because the ordered list does not yet have `constellation__timeline`.

- [ ] **Step 3: Implement the vertical timeline**

Add `class="constellation__timeline"` to the component's `<ol>`. Replace its scoped layout CSS with a single-column timeline: remove horizontal overflow and the fourteen-column minimum width; position a two-pixel vertical rule at the horizontal center of the three-rem marker; give each list item bottom spacing; align each link's marker and text vertically; and retain the marker's opaque page background so it sits above the connecting rule.

Use these core declarations:

```css
.constellation {
  margin: 2rem 0;
  padding: 0.5rem 0;
}

ol {
  display: grid;
  gap: 0;
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
}

ol::before {
  background: var(--vp-c-divider);
  bottom: 1.5rem;
  content: "";
  left: calc(1.5rem - 1px);
  position: absolute;
  top: 1.5rem;
  width: 2px;
}

.constellation__release:not(:last-child) {
  padding-bottom: 1.25rem;
}

a {
  align-items: center;
  color: var(--vp-c-text-1);
  display: grid;
  gap: 0.85rem;
  grid-template-columns: 3rem minmax(0, 1fr);
  text-decoration: none;
}
```

Update the homepage guidance in `docs/index.md`:

```md
Follow the assay line from setup to portfolio. Every marker is a working product increment, not a chapter you read and discard.
```

- [ ] **Step 4: Run component tests**

Run: `npm test -- --run tests/components.test.ts`

Expected: all component tests pass.

- [ ] **Step 5: Commit the timeline change**

```bash
git add .vitepress/theme/components/ReleaseConstellation.vue docs/index.md tests/components.test.ts
git commit -m "feat: present releases as a vertical timeline"
```

### Task 3: Reader-scale release typography

**Files:**
- Modify: `.vitepress/theme/styles.css`
- Modify: `.vitepress/theme/components/LessonMission.vue`

**Interfaces:**
- Consumes: existing VitePress typography variables and Gold Pasal display font.
- Produces: responsive article headings and a compact mission card without changing component content or props.

- [ ] **Step 1: Preserve mission-card content coverage**

Extend the existing mission test in `tests/components.test.ts`:

```ts
expect(wrapper.get('#mission-title').text()).toBe('The job in front of you')
expect(wrapper.text()).toContain('Incoming at the counter · inventory manager')
expect(wrapper.text()).toContain('Done looks like: Exactly one hold succeeds.')
```

- [ ] **Step 2: Run the focused component test**

Run: `npm test -- --run tests/components.test.ts`

Expected: PASS, establishing that the typography-only change must preserve the public content.

- [ ] **Step 3: Reduce release-page heading scale**

Change `.vp-doc h1` in `.vitepress/theme/styles.css` to:

```css
.vp-doc h1 {
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.08;
  max-width: 24ch;
}
```

Change the mobile override to:

```css
@media (max-width: 640px) {
  .vp-doc h1 {
    font-size: 2rem;
  }

  .gp-panel {
    box-shadow: none;
  }
}
```

- [ ] **Step 4: Compact the mission card typography**

Update `LessonMission.vue` scoped styles:

```css
.mission h2 {
  border: 0;
  font-size: clamp(1.35rem, 3vw, 1.65rem);
  line-height: 1.2;
  margin: 0.15rem 0 0.6rem;
  padding: 0;
}

.mission__problem {
  font-family: var(--gp-font-display);
  font-size: 1.05rem;
  line-height: 1.55;
  margin: 0;
}

.mission__destination {
  border-top: 1px solid var(--vp-c-divider);
  font-size: 0.95rem;
  line-height: 1.55;
  margin: 0.75rem 0 0;
  padding-top: 0.75rem;
}
```

- [ ] **Step 5: Run full verification and inspect the built output**

Run: `npm run verify`

Expected: content validation, type checking, all tests, and VitePress build pass.

Run: `npm run docs:dev -- --host 127.0.0.1`

Inspect `/`, `/releases/r0/`, and one lesson at desktop and narrow widths. Confirm the sidebar groups collapse and expose lessons, the release path is vertical without horizontal overflow, focus outlines remain visible, and the R0 title and mission card are readable without dominating the viewport.

- [ ] **Step 6: Commit the typography change**

```bash
git add .vitepress/theme/styles.css .vitepress/theme/components/LessonMission.vue tests/components.test.ts
git commit -m "style: tune release page typography for reading"
```
