import { readdirSync } from 'node:fs'
import { join } from 'node:path'

import type { DefaultTheme } from 'vitepress'

import { releases } from './theme/data/course'

export function createReleaseSidebar(
  releasesRoot: string,
): DefaultTheme.SidebarItem[] {
  return releases.map((release) => {
    const releaseDirectory = join(releasesRoot, release.id)
    const filenames = readdirSync(releaseDirectory)

    const lessonItems = release.lessons.map((lesson) => {
      const prefix = `${String(lesson.order).padStart(2, '0')}-`
      const matches = filenames.filter(
        (filename) => filename.startsWith(prefix) && filename.endsWith('.md'),
      )
      if (matches.length !== 1) {
        throw new Error(
          `${release.id} lesson ${lesson.order} must have exactly one Markdown file`,
        )
      }
      return {
        text: lesson.title,
        link: `/releases/${release.id}/${matches[0].replace(/\.md$/, '')}`,
      }
    })

    return {
      text: `${release.id.toUpperCase()} · ${release.title}`,
      collapsed: true,
      items: [
        { text: 'Overview', link: `/releases/${release.id}/` },
        ...lessonItems,
      ],
    }
  })
}
