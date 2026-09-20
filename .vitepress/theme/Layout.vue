<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import { computed } from 'vue'

import LessonProgress from './components/LessonProgress.vue'

const { Layout } = DefaultTheme
const { frontmatter } = useData()

const lessonId = computed(() => {
  const id = frontmatter.value.id
  return typeof id === 'string' && /^r\d+-\d+$/.test(id) ? id : ''
})
</script>

<template>
  <Layout>
    <template #doc-after>
      <LessonProgress v-if="lessonId" :lesson-id="lessonId" />
    </template>
  </Layout>
</template>
