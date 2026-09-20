export const PYTHON_RUNNER_KEY = 'gold-pasal.python-runner'
export const PYTHON_SNIPPET_LIMIT = 4000

export type PythonRunResult = {
  stdout: string
  stderr: string
  error?: string
}

export type PythonSnippetCheck = { ok: true } | { ok: false; error: string }

export type PythonRunnerFn = (source: string) => Promise<PythonRunResult>

export function validatePythonSnippet(source: string): PythonSnippetCheck {
  if (source.trim().length === 0) {
    return { ok: false, error: 'Write a small snippet first.' }
  }
  if (source.length > PYTHON_SNIPPET_LIMIT) {
    return { ok: false, error: 'Keep the snippet under 4000 characters.' }
  }
  return { ok: true }
}

type PyodideLike = {
  runPythonAsync: (code: string) => Promise<unknown>
  setStdout: (options: { batched: (text: string) => void }) => void
  setStderr: (options: { batched: (text: string) => void }) => void
}

type LoadPyodide = (options: { indexURL: string }) => Promise<PyodideLike>

declare global {
  interface Window {
    loadPyodide?: LoadPyodide
  }
}

const PYODIDE_INDEX = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'

let runtime: Promise<PyodideLike> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('The Python bench could not load.'))
    document.head.appendChild(script)
  })
}

async function loadPythonRuntime(): Promise<PyodideLike> {
  if (typeof window === 'undefined') {
    throw new Error('The Python bench runs in the browser.')
  }
  if (!runtime) {
    runtime = (async () => {
      await loadScript(`${PYODIDE_INDEX}pyodide.js`)
      const loadPyodide = window.loadPyodide
      if (!loadPyodide) {
        throw new Error('The Python bench could not load.')
      }
      return loadPyodide({ indexURL: PYODIDE_INDEX })
    })()
  }
  return runtime
}

export async function runPythonSnippet(source: string): Promise<PythonRunResult> {
  const check = validatePythonSnippet(source)
  if (!check.ok) {
    return { stdout: '', stderr: '', error: check.error }
  }

  try {
    const pyodide = await loadPythonRuntime()
    const stdout: string[] = []
    const stderr: string[] = []
    pyodide.setStdout({ batched: (text) => stdout.push(text) })
    pyodide.setStderr({ batched: (text) => stderr.push(text) })
    await pyodide.runPythonAsync(source)
    return {
      stdout: stdout.join(''),
      stderr: stderr.join(''),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { stdout: '', stderr: '', error: message }
  }
}
