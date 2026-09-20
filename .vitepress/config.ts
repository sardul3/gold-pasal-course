import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'

import { createReleaseSidebar } from './sidebar'

const releasesRoot = fileURLToPath(new URL('../docs/releases/', import.meta.url))
const releaseSidebar = createReleaseSidebar(releasesRoot)
const siteBase = process.env.GITHUB_ACTIONS ? '/gold-pasal-course/' : '/'

export default defineConfig({
  lang: 'en-US',
  title: 'Gold Pasal',
  description:
    'Build a Nepal jewelry store while learning production Python, FastAPI, operations, and safe AI systems.',
  base: siteBase,
  srcDir: 'docs',
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', href: `${siteBase}favicon.svg`, type: 'image/svg+xml' }],
    ['link', { rel: 'icon', href: `${siteBase}favicon-32.png`, type: 'image/png', sizes: '32x32' }],
    ['link', { rel: 'apple-touch-icon', href: `${siteBase}apple-touch-icon.png` }],
    ['meta', { name: 'theme-color', content: '#2d2347' }],
    ['meta', { name: 'color-scheme', content: 'light dark' }],
  ],
  markdown: {
    lineNumbers: true,
  },
  themeConfig: {
    logo: {
      light: '/mark.svg',
      dark: '/mark-dark.svg',
      alt: 'Gold Pasal assay mark',
    },
    nav: [
      { text: 'Course map', link: '/course-map' },
      { text: 'Learner desk', link: '/desk' },
      { text: 'Reference', link: '/reference/domain-glossary' },
      { text: 'Side quests', link: '/side-quests/' },
    ],
    sidebar: [
      {
        text: 'Start here',
        items: [
          { text: 'Course map', link: '/course-map' },
          { text: 'Learner desk', link: '/desk' },
          { text: 'How evidence works', link: '/reference/evidence-rubric' },
        ],
      },
      ...releaseSidebar,
      {
        text: 'Reference',
        items: [
          { text: 'Domain glossary', link: '/reference/domain-glossary' },
          { text: 'R1 pricing contract', link: '/reference/pricing-contract' },
          { text: 'Related projects', link: '/resources/related-projects' },
          { text: 'Lesson template', link: '/reference/lesson-template' },
        ],
      },
    ],
    search: {
      provider: 'local',
    },
    outline: {
      level: [2, 3],
      label: 'On this bench',
    },
    docFooter: {
      prev: 'Previous lesson',
      next: 'Next lesson',
    },
    footer: {
      message: 'Built as one cumulative, inspectable engineering story.',
      copyright: 'Gold Pasal Course',
    },
  },
})
