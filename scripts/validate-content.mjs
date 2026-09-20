import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const root = new URL('../docs/releases/', import.meta.url)
const expectedCounts = {
  r0: 7,
  r1: 12,
  r2: 12,
  r3: 12,
  r4: 11,
  r5: 11,
  r6: 11,
  r7: 9,
  r8: 11,
  r9: 11,
  r10: 12,
  r11: 11,
  r12: 11,
  r13: 8,
}

const errors = []
const ids = new Set()

for (const [release, expectedCount] of Object.entries(expectedCounts)) {
  const directory = new URL(`${release}/`, root)
  let files
  try {
    files = (await readdir(directory)).filter(
      (file) => /^\d{2}-.*\.md$/.test(file) && file !== 'index.md',
    )
  } catch {
    errors.push(`${release}: release directory is missing`)
    continue
  }

  if (files.length !== expectedCount) {
    errors.push(`${release}: expected ${expectedCount} lessons, found ${files.length}`)
  }

  for (const file of files) {
    const content = await readFile(join(directory.pathname, file), 'utf8')
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)
    if (!frontmatter) {
      errors.push(`${release}/${file}: missing frontmatter`)
      continue
    }

    const id = frontmatter[1].match(/^id:\s*(\S+)$/m)?.[1]
    if (!id) errors.push(`${release}/${file}: missing id`)
    else if (ids.has(id)) errors.push(`${release}/${file}: duplicate id ${id}`)
    else ids.add(id)

    for (const field of ['title:', `release: ${release}`, 'order:', 'outcomes:', 'evidence:']) {
      if (!frontmatter[1].includes(field)) {
        errors.push(`${release}/${file}: missing or invalid ${field}`)
      }
    }

    for (const section of [
      '<LessonMission',
      '## See the idea first',
      '## Practice',
      '<EvidenceCard',
    ]) {
      if (!content.includes(section)) {
        errors.push(`${release}/${file}: missing ${section}`)
      }
    }

    const wordCount = content.trim().split(/\s+/).length
    if (wordCount < 350) {
      errors.push(`${release}/${file}: lesson is too shallow (${wordCount} words)`)
    }
    if (content.includes('The technical topic in this lesson exists to protect')) {
      errors.push(`${release}/${file}: generic generated teaching prose remains`)
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

const relatedProjects = await readFile(
  new URL('../docs/resources/related-projects.md', import.meta.url),
  'utf8',
)
if (relatedProjects.includes('file://')) {
  errors.push('related projects: file:// links do not work on the deployed site')
}
for (const url of [
  'https://github.com/sardul3/ai-sme-map',
  'https://github.com/sardul3/dealradar',
  'https://github.com/sardul3/langchain',
  'https://github.com/sardul3/make-terminal-great-again',
]) {
  if (!relatedProjects.includes(url)) {
    errors.push(`related projects: missing canonical URL ${url}`)
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(`Validated ${ids.size} lessons, release metadata, and related-project links.`)
