import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import CareerSignal from '../.vitepress/theme/components/CareerSignal.vue'
import JavaBridge from '../.vitepress/theme/components/JavaBridge.vue'
import LessonProgress from '../.vitepress/theme/components/LessonProgress.vue'
import LessonMission from '../.vitepress/theme/components/LessonMission.vue'
import LessonQuiz from '../.vitepress/theme/components/LessonQuiz.vue'
import PredictThenRun from '../.vitepress/theme/components/PredictThenRun.vue'
import PythonRunner from '../.vitepress/theme/components/PythonRunner.vue'
import ReleaseConstellation from '../.vitepress/theme/components/ReleaseConstellation.vue'
import { PYTHON_RUNNER_KEY } from '../.vitepress/theme/python-runtime'

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

  it('keeps the quiz why hidden until a pick', async () => {
    const wrapper = mount(LessonQuiz, {
      props: {
        question: 'What should frozen sync do?',
        a: 'Rewrite the lockfile',
        b: 'Fail and leave the lockfile unchanged',
        c: 'Warn and continue',
        correct: 'b',
      },
      slots: { default: 'Frozen sync refuses to invent a resolution.' },
    })

    expect(wrapper.text()).not.toContain(
      'Frozen sync refuses to invent a resolution.',
    )
    await wrapper.get('[data-test="quiz-option-a"]').trigger('click')
    expect(wrapper.text()).toContain(
      'Frozen sync refuses to invent a resolution.',
    )
  })

  it('does not mark the correct option after a wrong pick', async () => {
    const wrapper = mount(LessonQuiz, {
      props: {
        question: 'What should frozen sync do?',
        a: 'Rewrite the lockfile',
        b: 'Fail and leave the lockfile unchanged',
        c: 'Warn and continue',
        correct: 'b',
      },
      slots: { default: 'Frozen sync refuses to invent a resolution.' },
    })

    await wrapper.get('[data-test="quiz-option-a"]').trigger('click')

    expect(wrapper.get('[data-test="quiz-option-a"]').attributes('data-state')).toBe(
      'wrong',
    )
    expect(
      wrapper.get('[data-test="quiz-option-b"]').attributes('data-state'),
    ).not.toBe('correct')
  })

  it('lets a retry after a wrong pick reach correct and lock', async () => {
    const wrapper = mount(LessonQuiz, {
      props: {
        question: 'What should frozen sync do?',
        a: 'Rewrite the lockfile',
        b: 'Fail and leave the lockfile unchanged',
        c: 'Warn and continue',
        correct: 'b',
      },
      slots: { default: 'Frozen sync refuses to invent a resolution.' },
    })

    await wrapper.get('[data-test="quiz-option-a"]').trigger('click')
    await wrapper.get('[data-test="quiz-option-b"]').trigger('click')

    expect(wrapper.get('[data-test="quiz-option-b"]').attributes('data-state')).toBe(
      'correct',
    )
    expect(wrapper.get('[data-test="quiz-option-a"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="quiz-option-b"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="quiz-option-c"]').attributes('disabled')).toBeDefined()
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

  it('keeps lesson state closed until the learner opens it', () => {
    const wrapper = mount(LessonProgress, {
      props: { lessonId: 'r0-01' },
    })

    const details = wrapper.get('details').element as HTMLDetailsElement
    expect(details.open).toBe(false)
    expect(wrapper.get('summary').text()).toContain('Lesson state · r0-01')
  })

  it('keeps the career signal closed until the learner opens it', () => {
    const wrapper = mount(CareerSignal, {
      props: {
        role: 'Python backend engineer',
        signal: 'a frozen sync from the shop root',
        interviewQuestion: 'Why would a laptop pytest still fail a teammate?',
      },
    })

    const details = wrapper.get('details').element as HTMLDetailsElement
    expect(details.open).toBe(false)
    expect(wrapper.get('summary').text()).toContain(
      'Career signal · Python backend engineer',
    )
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

  it('keeps the Java bridge closed until the learner opens it', () => {
    const wrapper = mount(JavaBridge, {
      props: {
        java: 'javac checks declared types.',
        python: 'Pyright checks annotated names.',
        caution: 'Python still runs the assignment.',
      },
    })

    const details = wrapper.get('details').element as HTMLDetailsElement
    expect(details.open).toBe(false)
    expect(wrapper.get('summary').text()).toContain('Java bridge')
    expect(wrapper.text()).toContain('javac checks declared types.')
  })

  it('runs a small snippet on the in-page Python bench', async () => {
    const runner = async (source: string) => ({
      stdout: source.includes('0.1.0') ? '0.1.0\n' : '',
      stderr: '',
    })

    const wrapper = mount(PythonRunner, {
      props: { code: "print('0.1.0')", label: 'Print the starter version' },
      global: {
        provide: {
          [PYTHON_RUNNER_KEY]: runner,
        },
      },
    })

    expect(wrapper.text()).toContain('Print the starter version')
    await wrapper.get('[data-test="python-run"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="python-output"]').text()).toContain('0.1.0')
  })
})
