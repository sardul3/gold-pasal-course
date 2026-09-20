import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'

import ApiWorkbench from './components/ApiWorkbench.vue'
import ArchitectureTrail from './components/ArchitectureTrail.vue'
import CareerSignal from './components/CareerSignal.vue'
import DemoMode from './components/DemoMode.vue'
import EvidenceCard from './components/EvidenceCard.vue'
import FailureWorkbench from './components/FailureWorkbench.vue'
import JavaBridge from './components/JavaBridge.vue'
import LearnerDesk from './components/LearnerDesk.vue'
import LessonMission from './components/LessonMission.vue'
import LessonProgress from './components/LessonProgress.vue'
import LessonQuiz from './components/LessonQuiz.vue'
import PortfolioLedger from './components/PortfolioLedger.vue'
import PredictThenRun from './components/PredictThenRun.vue'
import PriceWorkbench from './components/PriceWorkbench.vue'
import PythonRunner from './components/PythonRunner.vue'
import ReleaseConstellation from './components/ReleaseConstellation.vue'
import TestMatrix from './components/TestMatrix.vue'
import Layout from './Layout.vue'
import './styles.css'

const theme: Theme = {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('ApiWorkbench', ApiWorkbench)
    app.component('ArchitectureTrail', ArchitectureTrail)
    app.component('CareerSignal', CareerSignal)
    app.component('DemoMode', DemoMode)
    app.component('EvidenceCard', EvidenceCard)
    app.component('FailureWorkbench', FailureWorkbench)
    app.component('JavaBridge', JavaBridge)
    app.component('LearnerDesk', LearnerDesk)
    app.component('LessonMission', LessonMission)
    app.component('LessonProgress', LessonProgress)
    app.component('LessonQuiz', LessonQuiz)
    app.component('PortfolioLedger', PortfolioLedger)
    app.component('PredictThenRun', PredictThenRun)
    app.component('PriceWorkbench', PriceWorkbench)
    app.component('PythonRunner', PythonRunner)
    app.component('ReleaseConstellation', ReleaseConstellation)
    app.component('TestMatrix', TestMatrix)
  },
}

export default theme
