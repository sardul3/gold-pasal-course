import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import LessonProgress from '../.vitepress/theme/components/LessonProgress.vue'
import LessonMission from '../.vitepress/theme/components/LessonMission.vue'
import PredictThenRun from '../.vitepress/theme/components/PredictThenRun.vue'
import ReleaseConstellation from '../.vitepress/theme/components/ReleaseConstellation.vue'

describe('lesson components', () => {
  it('renders the mission as a labelled complementary region', () => {
    const wrapper = mount(LessonMission, {
      props: {
        role: 'inventory manager',
        problem: 'Two staff members reserve the same necklace.',
        destination: 'Exactly one hold succeeds.',
      },
    })

    expect(wrapper.get('aside').attributes('aria-labelledby')).toBe('mission-title')
    expect(wrapper.get('#mission-title').text()).toBe('The job in front of you')
    expect(wrapper.text()).toContain('Incoming at the counter · inventory manager')
    expect(wrapper.text()).toContain('Done looks like: Exactly one hold succeeds.')
  })

  it('renders every release as a linked timeline step in order', () => {
    const wrapper = mount(ReleaseConstellation)
    const links = wrapper.findAll('a')

    expect(links).toHaveLength(14)
    expect(links[0].attributes('href')).toBe('/releases/r0/')
    expect(links[13].attributes('href')).toBe('/releases/r13/')
    expect(wrapper.get('ol').classes()).toContain('constellation__timeline')
    expect(wrapper.get('ol').attributes('role')).toBe('list')
  })

  it('keeps the answer hidden until a concrete prediction is recorded', async () => {
    const wrapper = mount(PredictThenRun, {
      props: { prompt: 'Which request wins?' },
      slots: { default: 'The committed transaction wins.' },
    })

    expect(wrapper.text()).not.toContain('The committed transaction wins.')
    await wrapper.get('textarea').setValue('Hold A wins')
    await wrapper.get('button').trigger('click')

    expect(wrapper.text()).toContain('The committed transaction wins.')
  })

  it('records a practiced lesson from the learner-facing control', async () => {
    localStorage.clear()
    const wrapper = mount(LessonProgress, {
      props: { lessonId: 'r1-01' },
      attachTo: document.body,
    })

    await wrapper.get('[data-test="practiced"]').trigger('click')

    expect(localStorage.getItem('gold-pasal.progress.v1')).toContain(
      '"state":"practiced"',
    )
    wrapper.unmount()
  })
})
