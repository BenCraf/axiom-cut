export type PlanStep = {
  id: string
  title: string
  detail: string
  tool: string
  duration: string
}

export type AgentPlan = {
  projectTitle: string
  summary: string
  accent: string
  equation: string
  category: string
  renderEngine: string
  steps: PlanStep[]
  demo: boolean
  model?: string
}

export type EvolutionMetric = {
  label: string
  value: number
  previous: number
}

export type EvolutionMutation = {
  id: string
  title: string
  detail: string
  expectedGain: string
  selected: boolean
}

export type EvolutionResult = {
  version: string
  previousVersion: string
  score: number
  previousScore: number
  delta: number
  metrics: EvolutionMetric[]
  mutations: EvolutionMutation[]
  rationale: string
  memory: string[]
  evolvedPlan: AgentPlan
  demo: boolean
}

export type ApiStatus = {
  provider: string
  configured: boolean
  model: string
  renderer?: {
    available: boolean
    ready?: boolean
    version?: string
  }
}

export type StudioMedia = {
  id: string
  name: string
  type: string
  size: number
  duration: number
  width: number
  height: number
  fps: number
  codec: string
  audioCodec: string | null
  hasAudio: boolean
  url: string
  fileUrl: string
  analysisUrl: string
  createdAt: string
  builtIn?: boolean
  collection?: string
  role?: 'source' | 'result'
  thumbnailUrl?: string
  credit?: {
    creator: string
    sourceUrl: string
    licenseUrl: string
  }
}

export type MediaSegment = {
  start: number
  end: number
  duration: number
}

export type MediaAnalysis = {
  shots: MediaSegment[]
  silences: MediaSegment[]
  suggestedCuts: number[]
  duration: number
}

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '4:5'

export type RenderClip = {
  mediaId: string
  start?: number
  trimStart: number
  trimEnd: number
  speed: number
  volume: number
}

export type CaptionCue = {
  id?: string
  start: number
  end: number
  text: string
}

export type RenderRequest = {
  project?: JsonRecord
  settings?: JsonRecord
  clips?: RenderClip[]
  mediaId?: string
  trimStart?: number
  trimEnd?: number
  speed?: number
  volume?: number
  aspect?: AspectRatio
  fps?: 24 | 25 | 30 | 50 | 60
  quality?: 'preview' | 'standard' | 'high'
  brightness?: number
  contrast?: number
  saturation?: number
  temperature?: number
  vignette?: number
  title?: string
  titlePosition?: 'top' | 'center' | 'bottom'
  titleColor?: string
  accentColor?: string
  subtitle?: string
  subtitles?: CaptionCue[]
}

export type RenderJobStatus = 'queued' | 'rendering' | 'complete' | 'failed' | 'cancelled'

export type RenderJob = {
  id: string
  status: RenderJobStatus
  progress: number
  createdAt: string
  startedAt?: string
  completedAt?: string
  fileName?: string
  downloadUrl?: string
  error?: string
  detail?: string
}

export type PollRenderOptions = {
  signal?: AbortSignal
  timeoutMs?: number
  intervalMs?: number
  onStatus?: (job: RenderJob) => void
}

type JsonRecord = Record<string, unknown>

export class StudioApiError extends Error {
  readonly status: number
  readonly detail?: string
  readonly code?: string
  readonly payload?: unknown

  constructor(message: string, options: { status?: number; detail?: string; code?: string; payload?: unknown; cause?: unknown } = {}) {
    super(message, { cause: options.cause })
    this.name = 'StudioApiError'
    this.status = options.status ?? 0
    this.detail = options.detail
    this.code = options.code
    this.payload = options.payload
  }
}

const isRecord = (value: unknown): value is JsonRecord => typeof value === 'object' && value !== null && !Array.isArray(value)

const stringValue = (record: JsonRecord, key: string) => typeof record[key] === 'string' ? record[key] : undefined

const parseJson = (text: string): unknown => {
  if (!text.trim()) return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

const apiError = (status: number, payload: unknown, fallback: string, cause?: unknown) => {
  const record = isRecord(payload) ? payload : undefined
  const message = record
    ? stringValue(record, 'message') ?? stringValue(record, 'error') ?? fallback
    : typeof payload === 'string' && payload.trim() ? payload : fallback
  const rawDetail = record?.detail
  const detail = typeof rawDetail === 'string'
    ? rawDetail
    : rawDetail === undefined ? undefined : JSON.stringify(rawDetail)
  return new StudioApiError(message, {
    status,
    detail,
    code: record ? stringValue(record, 'code') : undefined,
    payload,
    cause,
  })
}

const readResponse = async (response: Response) => {
  const payload = parseJson(await response.text())
  if (!response.ok) throw apiError(response.status, payload, `请求失败（${response.status}）`)
  return payload
}

const requestJson = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...init.headers,
      },
    })
  } catch (error) {
    if (init.signal?.aborted) throw init.signal.reason ?? error
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new StudioApiError('无法连接剪辑服务，请确认本地服务正在运行。', { cause: error })
  }
  return await readResponse(response) as T
}

const unwrap = (payload: unknown, key: string): unknown => isRecord(payload) && key in payload ? payload[key] : payload

const requireRecord = (payload: unknown, label: string): JsonRecord => {
  if (!isRecord(payload)) throw new StudioApiError(`${label}返回了无法识别的数据。`, { payload })
  return payload
}

const assertMedia = (payload: unknown): StudioMedia => {
  const media = requireRecord(unwrap(payload, 'media'), '媒体接口')
  const creditIsValid = media.credit === undefined || (
    isRecord(media.credit)
    && typeof media.credit.creator === 'string'
    && typeof media.credit.sourceUrl === 'string'
    && typeof media.credit.licenseUrl === 'string'
  )
  if (
    typeof media.id !== 'string'
    || typeof media.name !== 'string'
    || typeof media.type !== 'string'
    || typeof media.size !== 'number'
    || typeof media.duration !== 'number'
    || typeof media.width !== 'number'
    || typeof media.height !== 'number'
    || typeof media.fps !== 'number'
    || typeof media.codec !== 'string'
    || !(typeof media.audioCodec === 'string' || media.audioCodec === null)
    || typeof media.hasAudio !== 'boolean'
    || typeof media.url !== 'string'
    || typeof media.fileUrl !== 'string'
    || typeof media.analysisUrl !== 'string'
    || typeof media.createdAt !== 'string'
    || !(media.builtIn === undefined || typeof media.builtIn === 'boolean')
    || !(media.collection === undefined || typeof media.collection === 'string')
    || !(media.role === undefined || media.role === 'source' || media.role === 'result')
    || !(media.thumbnailUrl === undefined || typeof media.thumbnailUrl === 'string')
    || !creditIsValid
  ) {
    throw new StudioApiError('媒体接口返回的数据不完整。', { payload })
  }
  return media as StudioMedia
}

const assertRenderJob = (payload: unknown): RenderJob => {
  const job = requireRecord(unwrap(payload, 'job'), '渲染接口')
  const statuses: RenderJobStatus[] = ['queued', 'rendering', 'complete', 'failed', 'cancelled']
  if (
    typeof job.id !== 'string'
    || typeof job.status !== 'string'
    || !statuses.includes(job.status as RenderJobStatus)
    || typeof job.progress !== 'number'
    || typeof job.createdAt !== 'string'
  ) {
    throw new StudioApiError('渲染接口返回的数据不完整。', { payload })
  }
  return job as RenderJob
}

export const getStatus = (signal?: AbortSignal) => requestJson<ApiStatus>('/api/status', { signal })

export const uploadMedia = (file: File, onProgress?: (percent: number) => void): Promise<StudioMedia> => new Promise((resolve, reject) => {
  const xhr = new XMLHttpRequest()
  xhr.open('POST', '/api/media')
  xhr.responseType = 'text'
  xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
  xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name))
  xhr.setRequestHeader('x-file-type', file.type || 'application/octet-stream')

  xhr.upload.addEventListener('progress', (event) => {
    if (!event.lengthComputable) return
    onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)))
  })
  xhr.addEventListener('load', () => {
    const payload = parseJson(xhr.responseText)
    if (xhr.status < 200 || xhr.status >= 300) {
      reject(apiError(xhr.status, payload, `素材上传失败（${xhr.status}）`))
      return
    }
    try {
      onProgress?.(100)
      resolve(assertMedia(payload))
    } catch (error) {
      reject(error)
    }
  })
  xhr.addEventListener('error', () => reject(new StudioApiError('素材上传中断，请检查网络或服务状态。')))
  xhr.addEventListener('abort', () => reject(new DOMException('素材上传已取消。', 'AbortError')))
  xhr.send(file)
})

export const getMedia = async (id: string, signal?: AbortSignal): Promise<StudioMedia> => {
  const payload = await requestJson<unknown>(`/api/media/${encodeURIComponent(id)}`, { signal })
  return assertMedia(payload)
}

export const listMedia = async (signal?: AbortSignal): Promise<StudioMedia[]> => {
  const payload = await requestJson<unknown>('/api/media', { signal })
  const record = requireRecord(payload, '素材库接口')
  if (!Array.isArray(record.media)) throw new StudioApiError('素材库接口返回的数据不完整。', { payload })
  return record.media.map((media) => assertMedia(media))
}

export const deleteMedia = async (id: string, signal?: AbortSignal): Promise<void> => {
  await requestJson<unknown>(`/api/media/${encodeURIComponent(id)}`, { method: 'DELETE', signal })
}

export const analyzeMedia = async (id: string, signal?: AbortSignal): Promise<MediaAnalysis> => {
  const payload = await requestJson<unknown>(`/api/media/${encodeURIComponent(id)}/analyze`, { method: 'POST', signal })
  const analysis = requireRecord(unwrap(payload, 'analysis'), '素材分析接口')
  if (!Array.isArray(analysis.shots) || !Array.isArray(analysis.silences) || !Array.isArray(analysis.suggestedCuts)) {
    throw new StudioApiError('素材分析接口返回的数据不完整。', { payload })
  }
  return analysis as MediaAnalysis
}

export const requestPlan = (prompt: string, signal?: AbortSignal) => requestJson<AgentPlan>('/api/plan', {
  method: 'POST',
  body: JSON.stringify({ prompt }),
  signal,
})

export const requestEvolution = (
  prompt: string,
  plan: AgentPlan,
  previousEvolution?: Partial<EvolutionResult>,
  signal?: AbortSignal,
) => requestJson<EvolutionResult>('/api/evolve', {
  method: 'POST',
  body: JSON.stringify({ prompt, plan, previousEvolution }),
  signal,
})

export const startRender = async (render: RenderRequest, signal?: AbortSignal): Promise<RenderJob> => {
  const payload = await requestJson<unknown>('/api/render', {
    method: 'POST',
    body: JSON.stringify(render),
    signal,
  })
  return assertRenderJob(payload)
}

export const getRenderJob = async (id: string, signal?: AbortSignal): Promise<RenderJob> => {
  const payload = await requestJson<unknown>(`/api/render/${encodeURIComponent(id)}`, { signal })
  return assertRenderJob(payload)
}

export const cancelRender = async (id: string, signal?: AbortSignal): Promise<RenderJob> => {
  const payload = await requestJson<unknown>(`/api/render/${encodeURIComponent(id)}`, { method: 'DELETE', signal })
  return assertRenderJob(payload)
}

export const downloadUrl = (id: string) => `/api/render/${encodeURIComponent(id)}/download`

const wait = (milliseconds: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal?.aborted) {
    reject(signal.reason ?? new DOMException('操作已取消。', 'AbortError'))
    return
  }
  const timer = window.setTimeout(() => {
    signal?.removeEventListener('abort', abort)
    resolve()
  }, milliseconds)
  const abort = () => {
    window.clearTimeout(timer)
    reject(signal?.reason ?? new DOMException('操作已取消。', 'AbortError'))
  }
  signal?.addEventListener('abort', abort, { once: true })
})

export const pollRenderJob = async (id: string, options: PollRenderOptions = {}): Promise<RenderJob> => {
  const timeoutMs = options.timeoutMs ?? 15 * 60_000
  const intervalMs = Math.max(200, options.intervalMs ?? 800)
  const controller = new AbortController()
  const timeoutError = new StudioApiError('渲染等待超时，任务可能仍在后台运行。', { code: 'RENDER_TIMEOUT' })
  const timeout = window.setTimeout(() => controller.abort(timeoutError), Math.max(0, timeoutMs))
  const abort = () => controller.abort(options.signal?.reason ?? new DOMException('操作已取消。', 'AbortError'))
  if (options.signal?.aborted) abort()
  else options.signal?.addEventListener('abort', abort, { once: true })

  try {
    while (true) {
      const job = await getRenderJob(id, controller.signal)
      options.onStatus?.(job)
      if (job.status === 'complete') return job
      if (job.status === 'failed') {
        throw new StudioApiError(job.error || '视频渲染失败。', { detail: job.detail, code: 'RENDER_FAILED', payload: job })
      }
      if (job.status === 'cancelled') {
        throw new StudioApiError('视频渲染已取消。', { code: 'RENDER_CANCELLED', payload: job })
      }
      await wait(intervalMs, controller.signal)
    }
  } finally {
    window.clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abort)
  }
}
