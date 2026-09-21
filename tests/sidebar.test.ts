import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { createReleaseSidebar } from '../.vitepress/sidebar'
import { releases } from '../.vitepress/theme/data/course'

const releasesRoot = resolve(process.cwd(), 'docs/releases')

describe('release sidebar', () => {
  it('creates a collapsed group with an overview and every lesson', () => {
    const sidebar = createReleaseSidebar(releasesRoot)
    const firstRelease = sidebar[0]

    expect(sidebar).toHaveLength(15)
    expect(firstRelease).toMatchObject({
      text: 'R0 · Core Python',
      collapsed: true,
    })
    expect(firstRelease.items).toHaveLength(releases[0].lessons.length + 1)
    expect(firstRelease.items?.[0]).toEqual({
      text: 'Overview',
      link: '/releases/r0/',
    })
    expect(firstRelease.items?.[1]).toEqual({
      text: releases[0].lessons[0].title,
      link: '/releases/r0/01-set-up-the-workshop',
    })
  })

  it('links every lesson to an existing Markdown file', () => {
    const sidebar = createReleaseSidebar(releasesRoot)
    const lessonLinks = sidebar.flatMap((group) => group.items?.slice(1) ?? [])

    expect(lessonLinks).toHaveLength(
      releases.reduce((total, release) => total + release.lessons.length, 0),
    )

    for (const item of lessonLinks) {
      expect(existsSync(`${releasesRoot}/${item.link?.replace('/releases/', '')}.md`)).toBe(true)
    }
  })
})
