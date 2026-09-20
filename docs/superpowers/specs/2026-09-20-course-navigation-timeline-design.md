# Course navigation and release timeline design

## Outcome

Make the fourteen-release course easier to navigate and read. Learners can open a release in the left sidebar and go directly to any lesson, scan the release sequence vertically without horizontal dragging, and read release pages without oversized headings or mission text.

## Navigation

Replace the flat list of release links with fourteen collapsible VitePress sidebar groups.

Each release group contains:

- an overview link to `/releases/rN/`;
- one link for every lesson in curriculum order.

Groups start collapsed and use VitePress's current-page behavior so the release containing the active page remains discoverable. Link labels use the release and lesson titles already defined in the shared course data. Lesson paths are derived from the matching Markdown filenames rather than duplicated manually.

## Homepage release timeline

Keep `ReleaseConstellation` as the homepage release-path component, but render its ordered list as a vertical timeline at every viewport width.

Each item has:

- a circular release marker;
- the release title;
- its capability label;
- a link to the release overview.

A continuous vertical rule connects the markers. The component must not require horizontal scrolling. Existing capability-specific marker colors, keyboard focus treatment, semantic navigation, and ordered-list structure remain intact.

Update the homepage introduction so it tells learners to follow the vertical release path instead of dragging sideways.

## Release-page typography

Reduce the global documentation-page `h1` scale from display-sized marketing typography to a comfortable article heading. Preserve the display typeface and hierarchy while using responsive sizing suitable for desktop and mobile.

Tighten `LessonMission` by reducing its heading and problem-copy sizes and using compact, readable spacing. The card keeps its release-context eyebrow, highlighted left border, problem statement, and “Done looks like” destination.

Homepage hero typography is unaffected because it has separate selectors.

## Data and component boundaries

The shared release definitions remain the source of truth for release order, titles, capabilities, and lesson titles. Sidebar generation may add a small path-resolution helper close to the VitePress configuration. No curriculum content or lesson order changes.

`ReleaseConstellation` remains presentation-only and reads release data from the existing course module. `LessonMission` remains a reusable content component with the same public props.

## Verification

Automated tests should verify that:

- every release sidebar group includes its overview and all lessons;
- generated lesson links resolve to existing Markdown files;
- the release timeline still renders all fourteen linked releases;
- mission-card content remains present after styling changes.

Run the repository's full `npm run verify` command. Also inspect the built site at desktop and narrow widths to confirm sidebar usability, timeline alignment, readable typography, keyboard focus, and absence of horizontal timeline overflow.

## Non-goals

- Changing release or lesson content, order, or URLs.
- Adding progress persistence or completion controls to the sidebar.
- Redesigning the homepage hero, course map, or other learning components.
- Introducing a new navigation component or UI dependency.
