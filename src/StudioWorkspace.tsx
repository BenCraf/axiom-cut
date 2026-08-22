import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import {
  AlertCircle,
  BarChart3,
  BrainCircuit,
  Captions,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  Clock3,
  Copy,
  Download,
  Eye,
  FileJson,
  FileVideo2,
  Film,
  FolderOpen,
  Gauge,
  History,
  ImagePlay,
  LoaderCircle,
  Maximize2,
  Music2,
  Pause,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  ScanSearch,
  Scissors,
  Settings2,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Split,
  Square,
  Trash2,
  Undo2,
  Upload,
  Video,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react'
import {
  AspectRatio,
  Caption,
  HistoryAction,
  MediaAsset,
  createCaption,
  createClip,
  createDefaultProject,
  createHistory,
  deserializeProject,
  findClip,
  historyReducer,
  loadProjectFromStorage,
  projectDuration,
  saveProjectToStorage,
  serializeProject,
} from './editorModel'
import {
  AgentPlan,
  ApiStatus,
  EvolutionResult,
  MediaAnalysis,
  RenderJob,
  StudioApiError,
  StudioMedia,
  analyzeMedia,
  cancelRender,
  deleteMedia,
  downloadUrl,
  getStatus,
  listMedia,
  pollRenderJob,
  requestEvolution,
  requestPlan,
  startRender,
  uploadMedia,
} from './studioApi'
import './studio.css'

type InspectorTab = 'agent' | 'adjust' | 'export'
type AgentStage = 'idle' | 'planning' | 'applying' | 'ready'
type Toast = { kind: 'success' | 'error'; message: string }

const LOCAL_PLAN: AgentPlan = {
  projectTitle: '叙事短片 · 智能精剪',
  summary: '识别素材重点，建立清晰节奏，完成字幕、调色、构图与声音处理。',
  accent: '#71e5f6',
  equation: 'story × rhythm',
  category: '通用视频',
  renderEngine: 'FFmpeg + deterministic timeline',
  steps: [
    { id: '01', title: '检查素材', detail: '读取画面、声音和镜头结构', tool: 'probe()', duration: '0.4s' },
    { id: '02', title: '组织叙事', detail: '确定开场、主体和收束段落', tool: 'sequence()', duration: '0.6s' },
    { id: '03', title: '清理节奏', detail: '裁掉空白并调整镜头速度', tool: 'trim()', duration: '0.5s' },
    { id: '04', title: '建立信息层', detail: '加入标题、字幕与安全构图', tool: 'compose()', duration: '0.7s' },
    { id: '05', title: '统一视听', detail: '匹配调色、画幅和音量', tool: 'grade()', duration: '0.5s' },
    { id: '06', title: '锁定成片', detail: '保存可回滚版本与渲染参数', tool: 'lock()', duration: '0.3s' },
  ],
  demo: true,
  model: 'Local deterministic planner',
}

const QUICK_RECIPES = [
  '剪成 15 秒高密度横屏短片，开头 2 秒先给结论',
  '做成 9:16 竖屏口播，加入醒目标题和三段字幕',
  '做成克制的电影感版本，轻微降饱和并保留环境声',
]
const MAX_RENDER_CLIPS = 12
const MAX_CAPTIONS = 200
const PLAYHEAD_PUBLISH_INTERVAL_MS = 80

const sleep = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))
const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const formatBytes = (bytes: number) => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / 1024 / 1024).toFixed(1)} MB`
const formatTime = (seconds: number) => {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0)
  const minutes = Math.floor(safe / 60)
  const remaining = Math.floor(safe % 60)
  const frames = Math.floor((safe % 1) * 30)
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}:${String(frames).padStart(2, '0')}`
}
const formatDuration = (seconds: number) => seconds < 60 ? `${seconds.toFixed(1)}s` : `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
const clipTimelineEnd = (clip: { start: number; sourceStart: number; sourceEnd: number; speed: number }) => clip.start + (clip.sourceEnd - clip.sourceStart) / clip.speed
const clipTimingKey = (clip: { id: string; start: number; sourceStart: number; sourceEnd: number; speed: number }) => `${clip.id}:${clip.start}:${clip.sourceStart}:${clip.sourceEnd}:${clip.speed}`

const mediaToAsset = (media: StudioMedia): MediaAsset => ({
  id: media.id,
  name: media.name,
  kind: media.type.startsWith('audio/') ? 'audio' : 'video',
  mimeType: media.type,
  size: media.size,
  duration: media.duration,
  width: media.width,
  height: media.height,
  fps: media.fps,
  codec: media.codec,
  hasAudio: media.hasAudio,
  serverUrl: media.fileUrl,
  thumbnailUrl: media.thumbnailUrl,
  builtIn: media.builtIn,
  collection: media.collection,
  role: media.role,
  credit: media.credit ? { ...media.credit } : undefined,
  status: 'ready',
  createdAt: media.createdAt,
})

const currentCaptionAt = (captions: Caption[], time: number) => captions.find((caption) => time >= caption.start && time <= caption.end)

function StudioWorkspace({ onOpenShowcase }: { onOpenShowcase: () => void }) {
  const [history, dispatch] = useReducer(
    historyReducer,
    undefined,
    () => createHistory(loadProjectFromStorage() ?? createDefaultProject({ name: '我的智能剪辑工程' })),
  )
  const project = history.present
  const [tab, setTab] = useState<InspectorTab>('agent')
  const [prompt, setPrompt] = useState(QUICK_RECIPES[0])
  const [plan, setPlan] = useState<AgentPlan>(LOCAL_PLAN)
  const [agentStage, setAgentStage] = useState<AgentStage>('idle')
  const [agentStep, setAgentStep] = useState(-1)
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ provider: 'DeepSeek', configured: false, model: 'deepseek-v4-flash', renderer: { available: false, ready: false } })
  const [evolution, setEvolution] = useState<EvolutionResult | null>(null)
  const [playing, setPlaying] = useState(false)
  const [playhead, setPlayhead] = useState(project.playhead)
  const [seekRevision, setSeekRevision] = useState(0)
  const [showGuides, setShowGuides] = useState(true)
  const [timelineZoom, setTimelineZoom] = useState(1)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const [analysis, setAnalysis] = useState<Record<string, MediaAnalysis>>({})
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [renderJob, setRenderJob] = useState<RenderJob | null>(null)
  const [renderRevision, setRenderRevision] = useState<string | null>(null)
  const [renderError, setRenderError] = useState('')
  const [rendering, setRendering] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [saved, setSaved] = useState(true)
  const [saveFailed, setSaveFailed] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [mediaOpen, setMediaOpen] = useState(false)
  const [projectName, setProjectName] = useState(project.name)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const projectInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const renderAbortRef = useRef<AbortController | null>(null)
  const latestProjectRef = useRef(project)
  const playheadRef = useRef(project.playhead)
  const playbackCursorRef = useRef(project.playhead)
  const pendingSeekRef = useRef(true)
  const syncedVideoRef = useRef<{ clipId: string; timingKey: string } | null>(null)
  const playAttemptRef = useRef(0)
  const pendingPlayVideoRef = useRef<HTMLVideoElement | null>(null)
  const playbackRunRef = useRef(0)

  const videoTracks = project.tracks.filter((track) => track.kind === 'video')
  const primaryVideoTrack = videoTracks[0]
  const videoClips = useMemo(() => primaryVideoTrack?.clips.filter((clip) => clip.enabled).sort((a, b) => a.start - b.start) ?? [], [primaryVideoTrack])
  const sortedMedia = useMemo(() => [...project.media].sort((left, right) => {
    const leftIsBuiltIn = left.builtIn === true
    const rightIsBuiltIn = right.builtIn === true
    if (leftIsBuiltIn !== rightIsBuiltIn) return leftIsBuiltIn ? -1 : 1
    if (!leftIsBuiltIn || !rightIsBuiltIn) return 0
    const roleOrder = { source: 0, result: 1 } as const
    const roleDifference = roleOrder[left.role ?? 'source'] - roleOrder[right.role ?? 'source']
    return roleDifference || left.createdAt.localeCompare(right.createdAt)
  }), [project.media])
  const neonSyncAssets = sortedMedia.filter((asset) => asset.builtIn && asset.collection === 'neon-sync')
  const neonSyncSourceCount = neonSyncAssets.filter((asset) => asset.role === 'source').length
  const neonSyncResultCount = neonSyncAssets.filter((asset) => asset.role === 'result').length
  const rawDuration = projectDuration(project)
  const duration = Math.max(rawDuration, 1)
  const timelineDuration = Math.max(duration, 10)
  const selectedAsset = project.media.find((asset) => asset.id === project.selection.mediaId) ?? sortedMedia[0] ?? null
  const selectedClipEntry = project.selection.clipId ? findClip(project, project.selection.clipId) : null
  const timelineClip = videoClips.find((clip) => {
    const end = clip.start + (clip.sourceEnd - clip.sourceStart) / clip.speed
    return playhead >= clip.start && playhead < end
  })
  const previewAsset = timelineClip
    ? project.media.find((asset) => asset.id === timelineClip.mediaId) ?? null
    : null
  const previewTime = timelineClip
    ? timelineClip.sourceStart + Math.max(0, playhead - timelineClip.start) * timelineClip.speed
    : playhead
  const activeCaption = currentCaptionAt(project.captions, playhead)
  const activeAnalysis = selectedAsset ? analysis[selectedAsset.id] : undefined
  const renderPercent = renderJob ? clamp(renderJob.progress <= 1 ? renderJob.progress * 100 : renderJob.progress, 0, 100) : 0
  const renderStale = renderJob?.status === 'complete' && renderRevision !== project.updatedAt
  const renderScaleValid = videoClips.length > 0 && videoClips.length <= MAX_RENDER_CLIPS && project.captions.length <= MAX_CAPTIONS
  const rendererReady = Boolean(apiStatus.renderer?.ready ?? apiStatus.renderer?.available)
  const timelineHasNoOverlap = videoClips.every((clip, index) => index === 0 || clip.start >= clipTimelineEnd(videoClips[index - 1]) - .001)
  const allMediaAccessible = videoClips.every((clip) => project.media.some((asset) => asset.id === clip.mediaId && Boolean(asset.serverUrl)))
  const preflightChecks: Array<[string, boolean]> = [
    ['FFmpeg 渲染器就绪', rendererReady],
    ['素材可访问', allMediaAccessible],
    ['时间线有画面', videoClips.length > 0],
    ['裁切范围有效', videoClips.every((clip) => clip.sourceEnd > clip.sourceStart)],
    ['片段没有重叠', timelineHasNoOverlap],
    ['字幕位于成片范围内', project.captions.every((caption) => caption.start >= 0 && caption.end > caption.start && caption.start < duration && caption.end <= duration + .05)],
    [`规模不超过 ${MAX_RENDER_CLIPS} 片段 / ${MAX_CAPTIONS} 字幕`, renderScaleValid],
  ]
  const renderReady = preflightChecks.every(([, pass]) => pass)
  const videoClipsRef = useRef(videoClips)
  const durationRef = useRef(rawDuration)

  useEffect(() => {
    getStatus().then(setApiStatus).catch(() => undefined)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    listMedia(controller.signal).then((items) => {
      const assets = items.map(mediaToAsset)
      const knownIds = new Set(latestProjectRef.current.media.map((asset) => asset.id))
      const missingCount = assets.reduce((count, asset) => {
        if (knownIds.has(asset.id)) return count
        knownIds.add(asset.id)
        return count + 1
      }, 0)
      dispatch({ type: 'SYNC_MEDIA', assets })
      if (missingCount) setToast({ kind: 'success', message: `已同步 ${missingCount} 个素材到素材库，时间线保持不变。` })
    }).catch(() => undefined)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    setProjectName(project.name)
  }, [project.id, project.name])

  useEffect(() => {
    latestProjectRef.current = project
    setSaved(false)
    setSaveFailed(false)
    const timer = window.setTimeout(() => {
      const ok = saveProjectToStorage(project)
      setSaved(ok)
      setSaveFailed(!ok)
    }, 500)
    return () => window.clearTimeout(timer)
  }, [project])

  useEffect(() => () => {
    saveProjectToStorage(latestProjectRef.current)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!mediaOpen) return undefined
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMediaOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mediaOpen])

  useEffect(() => {
    videoClipsRef.current = videoClips
    durationRef.current = rawDuration
  }, [rawDuration, videoClips])

  useEffect(() => {
    if (project.playhead === playheadRef.current) return
    playheadRef.current = project.playhead
    playbackCursorRef.current = project.playhead
    pendingSeekRef.current = true
    syncedVideoRef.current = null
    setPlayhead(project.playhead)
  }, [project.playhead])

  useEffect(() => {
    if (!playing) return
    const run = ++playbackRunRef.current
    let frame = 0
    let previous = performance.now()
    let lastPublished = previous

    playbackCursorRef.current = playheadRef.current

    const tick = (now: number) => {
      if (playbackRunRef.current !== run) return
      const elapsed = Math.min(.1, (now - previous) / 1000)
      previous = now
      const clips = videoClipsRef.current
      const totalDuration = durationRef.current
      let next = playbackCursorRef.current
      let publishImmediately = false
      const activeClip = clips.find((clip) => next >= clip.start && next < clipTimelineEnd(clip))

      if (activeClip) {
        const video = videoRef.current
        const synced = syncedVideoRef.current
        const videoMatchesClip = video?.dataset.timelineClipId === activeClip.id
          && synced?.clipId === activeClip.id
          && synced.timingKey === clipTimingKey(activeClip)

        if (video && videoMatchesClip && video.readyState >= 2 && !video.seeking) {
          const sourceTime = clamp(video.currentTime, activeClip.sourceStart, activeClip.sourceEnd)
          next = activeClip.start + (sourceTime - activeClip.sourceStart) / activeClip.speed
          if (video.ended || sourceTime >= activeClip.sourceEnd - .01) {
            next = clipTimelineEnd(activeClip)
            publishImmediately = true
          }
        }
      } else {
        const nextClip = clips.find((clip) => clip.start > next + .0001)
        const advanced = next + elapsed
        if (nextClip && advanced >= nextClip.start) {
          next = nextClip.start
          publishImmediately = true
        } else {
          next = advanced
        }
      }

      next = clamp(next, 0, totalDuration)
      playbackCursorRef.current = next

      if (publishImmediately || now - lastPublished >= PLAYHEAD_PUBLISH_INTERVAL_MS) {
        lastPublished = now
        if (Math.abs(next - playheadRef.current) >= .001) {
          playheadRef.current = next
          setPlayhead(next)
        }
      }

      if (next >= totalDuration - .0001) {
        playheadRef.current = totalDuration
        playbackCursorRef.current = totalDuration
        setPlayhead(totalDuration)
        dispatch({ type: 'SET_PLAYHEAD', time: totalDuration })
        setPlaying(false)
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      if (playbackRunRef.current === run) playbackRunRef.current += 1
      cancelAnimationFrame(frame)
    }
  }, [playing])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !timelineClip || !previewAsset?.serverUrl) {
      playAttemptRef.current += 1
      pendingPlayVideoRef.current = null
      syncedVideoRef.current = null
      return
    }
    const desired = clamp(previewTime, 0, Math.max(0, previewAsset.duration - .02))
    const timingKey = clipTimingKey(timelineClip)
    const synced = syncedVideoRef.current
    const requiresSeek = pendingSeekRef.current
      || synced?.clipId !== timelineClip.id
      || synced.timingKey !== timingKey
      || !playing

    video.playbackRate = timelineClip.speed
    video.volume = clamp(timelineClip.volume, 0, 1)

    if (requiresSeek && Math.abs(video.currentTime - desired) > .012) video.currentTime = desired
    pendingSeekRef.current = false
    syncedVideoRef.current = { clipId: timelineClip.id, timingKey }

    if (playing) {
      if (video.paused && pendingPlayVideoRef.current !== video) {
        const attempt = ++playAttemptRef.current
        pendingPlayVideoRef.current = video
        void video.play().then(() => {
          if (playAttemptRef.current === attempt) pendingPlayVideoRef.current = null
        }).catch((error: unknown) => {
          if (playAttemptRef.current !== attempt || videoRef.current !== video) return
          playAttemptRef.current += 1
          playbackRunRef.current += 1
          pendingPlayVideoRef.current = null
          video.pause()
          const current = clamp(playbackCursorRef.current, 0, durationRef.current)
          playheadRef.current = current
          playbackCursorRef.current = current
          setPlayhead(current)
          dispatch({ type: 'SET_PLAYHEAD', time: current })
          setPlaying(false)
          setToast({
            kind: 'error',
            message: error instanceof DOMException && error.name === 'NotAllowedError'
              ? '浏览器阻止了预览播放，请再次点击播放。'
              : '预览视频播放失败，请检查素材是否仍可访问后重试。',
          })
        })
      }
    } else {
      playAttemptRef.current += 1
      pendingPlayVideoRef.current = null
      video.pause()
    }
  }, [playing, playhead, previewAsset?.id, previewAsset?.serverUrl, previewTime, seekRevision, timelineClip?.id, timelineClip?.sourceStart, timelineClip?.sourceEnd, timelineClip?.speed, timelineClip?.volume])

  useEffect(() => () => renderAbortRef.current?.abort(), [])

  const notify = (kind: Toast['kind'], message: string) => setToast({ kind, message })
  const edit = (action: HistoryAction) => dispatch(action)
  const resetPlaybackClock = (targetPlayhead: number, targetDuration = durationRef.current) => {
    const safeDuration = Math.max(0, Number.isFinite(targetDuration) ? targetDuration : 0)
    const next = clamp(targetPlayhead, 0, safeDuration)
    playbackRunRef.current += 1
    playAttemptRef.current += 1
    pendingPlayVideoRef.current = null
    videoRef.current?.pause()
    setPlaying(false)
    durationRef.current = safeDuration
    playheadRef.current = next
    playbackCursorRef.current = next
    pendingSeekRef.current = true
    syncedVideoRef.current = null
    setPlayhead(next)
    setSeekRevision((revision) => revision + 1)
  }
  const seekPlayhead = (time: number) => {
    const next = clamp(time, 0, durationRef.current)
    playheadRef.current = next
    playbackCursorRef.current = next
    pendingSeekRef.current = true
    syncedVideoRef.current = null
    setPlayhead(next)
    setSeekRevision((revision) => revision + 1)
    dispatch({ type: 'SET_PLAYHEAD', time: next })
  }
  const togglePlayback = () => {
    if (playing) {
      const current = clamp(playbackCursorRef.current, 0, durationRef.current)
      playbackRunRef.current += 1
      playAttemptRef.current += 1
      pendingPlayVideoRef.current = null
      videoRef.current?.pause()
      playheadRef.current = current
      setPlayhead(current)
      setPlaying(false)
      dispatch({ type: 'SET_PLAYHEAD', time: current })
      return
    }
    if (playheadRef.current >= durationRef.current - .0001) seekPlayhead(0)
    playbackCursorRef.current = playheadRef.current
    pendingSeekRef.current = true
    setSeekRevision((revision) => revision + 1)
    setPlaying(true)
  }
  const openShowcase = () => {
    const current = clamp(playbackCursorRef.current, 0, durationRef.current)
    playbackRunRef.current += 1
    playAttemptRef.current += 1
    pendingPlayVideoRef.current = null
    videoRef.current?.pause()
    setPlaying(false)
    playheadRef.current = current
    playbackCursorRef.current = current
    setPlayhead(current)
    dispatch({ type: 'SET_PLAYHEAD', time: current })
    onOpenShowcase()
  }

  const importMediaFiles = async (files: File[]) => {
    const remainingSlots = Math.max(0, MAX_RENDER_CLIPS - videoClips.length)
    const valid = files.filter((file) => file.type.startsWith('video/') || /\.(mkv|m4v|ts)$/i.test(file.name)).slice(0, remainingSlots)
    if (!remainingSlots) {
      notify('error', `单个成片最多支持 ${MAX_RENDER_CLIPS} 个视频片段，请先删除或合并片段。`)
      return
    }
    if (!valid.length) {
      notify('error', '请选择 MP4、MOV、WebM、MKV 或 TS 视频文件。')
      return
    }
    if (valid.length < files.length) notify('error', `本次只导入前 ${valid.length} 个视频；单个成片最多支持 ${MAX_RENDER_CLIPS} 个片段。`)
    let cursor = projectDuration(project)
    try {
      for (let index = 0; index < valid.length; index += 1) {
        const media = await uploadMedia(valid[index], (percent) => setUploadProgress(Math.round((index * 100 + percent) / valid.length)))
        const asset = mediaToAsset(media)
        const at = new Date().toISOString()
        edit({ type: 'ADD_MEDIA', asset, select: true, at })
        const trackId = asset.kind === 'audio' ? 'audio-main' : 'video-main'
        const clip = createClip(asset, { start: cursor })
        edit({ type: 'ADD_CLIP', trackId, clip, select: true, at })
        cursor += Math.max(.01, asset.duration)
      }
      setTab('agent')
      notify('success', `已导入 ${valid.length} 个素材，并自动放入时间线。`)
    } catch (error) {
      notify('error', error instanceof Error ? error.message : '素材导入失败。')
    } finally {
      setUploadProgress(null)
    }
  }

  const handleMediaInput = (event: ChangeEvent<HTMLInputElement>) => {
    void importMediaFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    void importMediaFiles(Array.from(event.dataTransfer.files))
  }

  const runAnalysis = async () => {
    if (!selectedAsset) return
    setAnalyzingId(selectedAsset.id)
    try {
      const result = await analyzeMedia(selectedAsset.id)
      setAnalysis((current) => ({ ...current, [selectedAsset.id]: result }))
      notify('success', `分析完成：识别 ${result.shots.length} 个镜头和 ${result.silences.length} 个静音段。`)
    } catch (error) {
      notify('error', error instanceof Error ? error.message : '素材分析失败。')
    } finally {
      setAnalyzingId(null)
    }
  }

  const applyAgentIntent = (brief: string, generatedPlan: AgentPlan, mediaAnalysis?: MediaAnalysis) => {
    const at = new Date().toISOString()
    const requestedDuration = Number(brief.match(/(\d+(?:\.\d+)?)\s*秒/)?.[1])
    const selectedClipMatchesAsset = selectedClipEntry?.clip.mediaId === selectedAsset?.id
    const targetClip = selectedClipMatchesAsset
      ? selectedClipEntry?.clip
      : videoClips.find((clip) => clip.mediaId === selectedAsset?.id) ?? videoClips[0]
    const targetTrackId = selectedClipMatchesAsset ? selectedClipEntry?.track.id : primaryVideoTrack?.id
    if (/9\s*:\s*16|竖屏|短视频|reels|tiktok/i.test(brief)) edit({ type: 'UPDATE_ASPECT', aspect: '9:16', at })
    else if (/1\s*:\s*1|方形|square/i.test(brief)) edit({ type: 'UPDATE_ASPECT', aspect: '1:1', at })
    else if (/16\s*:\s*9|横屏|电影宽屏/i.test(brief)) edit({ type: 'UPDATE_ASPECT', aspect: '16:9', at })

    if (targetClip && targetTrackId) {
      const originalTimelineEnd = clipTimelineEnd(targetClip)
      const desiredSpeed = /慢动作|放慢|slow/i.test(brief) ? .72 : /快节奏|加速|高密度|快剪/i.test(brief) ? 1.22 : targetClip.speed
      const desiredVolume = /静音|无声|mute/i.test(brief) ? 0 : /保留环境声|声音自然/i.test(brief) ? .82 : targetClip.volume
      let desiredStart = targetClip.sourceStart
      let desiredEnd = targetClip.sourceEnd
      if (mediaAnalysis && /去掉.*(?:停顿|空白|静音)|紧凑|高密度|快剪/i.test(brief)) {
        const leading = mediaAnalysis.silences.find((silence) => silence.start <= desiredStart + .15 && silence.end < desiredEnd - .1)
        const trailing = [...mediaAnalysis.silences].reverse().find((silence) => silence.end >= desiredEnd - .15 && silence.start > desiredStart + .1)
        desiredStart = leading?.end ?? desiredStart
        desiredEnd = trailing?.start ?? desiredEnd
      }
      if (Number.isFinite(requestedDuration) && requestedDuration > .2) {
        const availableTimeline = Math.max(.2, requestedDuration - targetClip.start)
        desiredEnd = Math.min(desiredEnd, desiredStart + availableTimeline * desiredSpeed)
      }

      const cuts = mediaAnalysis && /按镜头|节奏切|快剪|高密度/i.test(brief)
        ? mediaAnalysis.suggestedCuts.filter((cut) => cut > desiredStart + .2 && cut < desiredEnd - .2).slice(0, Math.min(4, Math.max(0, MAX_RENDER_CLIPS - videoClips.length)))
        : []
      const segmentIds = [targetClip.id]
      let rightClipId = targetClip.id
      cuts.forEach((cut) => {
        const nextId = makeId('clip')
        edit({ type: 'SPLIT_CLIP', clipId: rightClipId, timelineTime: targetClip.start + (cut - targetClip.sourceStart) / targetClip.speed, rightClipId: nextId, at })
        segmentIds.push(nextId)
        rightClipId = nextId
      })
      const boundaries = [desiredStart, ...cuts, desiredEnd]
      segmentIds.forEach((id, index) => {
        edit({ type: 'UPDATE_SPEED', clipId: id, speed: desiredSpeed, at })
        edit({ type: 'UPDATE_VOLUME', clipId: id, volume: desiredVolume, at })
        edit({ type: 'UPDATE_TRIM', clipId: id, sourceStart: boundaries[index], sourceEnd: boundaries[index + 1], at })
      })
      let cursor = targetClip.start
      segmentIds.forEach((id, index) => {
        edit({ type: 'MOVE_CLIP', clipId: id, toTrackId: targetTrackId, start: cursor, at })
        cursor += (boundaries[index + 1] - boundaries[index]) / desiredSpeed
      })
      const timelineDelta = cursor - originalTimelineEnd
      if (Math.abs(timelineDelta) > .001) {
        videoClips
          .filter((clip) => clip.id !== targetClip.id && clip.start >= originalTimelineEnd - .001)
          .forEach((clip) => edit({ type: 'MOVE_CLIP', clipId: clip.id, toTrackId: targetTrackId, start: Math.max(0, clip.start + timelineDelta), at }))
      }
      if (Number.isFinite(requestedDuration) && requestedDuration > .2) {
        videoClips
          .filter((clip) => clip.id !== targetClip.id)
          .forEach((clip) => {
            const movedStart = clip.start >= originalTimelineEnd - .001 ? Math.max(0, clip.start + timelineDelta) : clip.start
            const movedEnd = movedStart + (clip.sourceEnd - clip.sourceStart) / clip.speed
            if (movedStart >= requestedDuration) edit({ type: 'DELETE_CLIP', clipId: clip.id, at })
            else if (movedEnd > requestedDuration) {
              edit({ type: 'UPDATE_TRIM', clipId: clip.id, sourceEnd: clip.sourceStart + (requestedDuration - movedStart) * clip.speed, at })
            }
          })
        project.captions.forEach((caption) => {
          if (caption.start >= requestedDuration) edit({ type: 'DELETE_CAPTION', captionId: caption.id, at })
          else if (caption.end > requestedDuration) edit({ type: 'UPDATE_CAPTION', captionId: caption.id, patch: { end: requestedDuration }, at })
        })
      }
    }

    if (/电影感|克制|高级|cinematic/i.test(brief)) {
      edit({ type: 'UPDATE_COLOR', color: { brightness: -.05, contrast: 1.14, saturation: .9, temperature: -.08, vignette: .16 }, at })
    } else if (/清新|明亮|通透/i.test(brief)) {
      edit({ type: 'UPDATE_COLOR', color: { brightness: .08, contrast: 1.03, saturation: 1.12, temperature: .05, vignette: 0 }, at })
    }

    const titleMatch = brief.match(/标题(?:是|为|写|改成|[:：])?[“"']?([^，。,.\n”"']{2,28})/)
    if (/标题|开头|结论|产品|发布|口播/i.test(brief)) {
      edit({
        type: 'UPDATE_TITLE',
        title: {
          enabled: true,
          text: titleMatch?.[1]?.trim() || generatedPlan.projectTitle,
          subtitle: generatedPlan.summary.slice(0, 42),
          position: 'top',
          accentColor: generatedPlan.accent,
        },
        at,
      })
    }

    if (/字幕|caption|口播/i.test(brief) && project.captions.length === 0) {
      const total = Math.max(Number.isFinite(requestedDuration) ? Math.min(duration, requestedDuration) : duration, 6)
      const samples = ['先把最重要的信息说清楚', '让镜头跟随内容自然推进', '最后用一个明确结论收住']
      samples.forEach((text, index) => edit({
        type: 'ADD_CAPTION',
        caption: { id: makeId('caption'), start: total * (.08 + index * .27), end: total * (.24 + index * .27), text },
        at,
      }))
    }
    edit({ type: 'RENAME_PROJECT', name: generatedPlan.projectTitle, at })
  }

  const runAgent = async () => {
    if (!project.media.length) {
      notify('error', '先导入一段真实视频，Agent 才能把方案落实到时间线。')
      return
    }
    if (!prompt.trim() || agentStage === 'planning' || agentStage === 'applying') return
    const at = new Date().toISOString()
    edit({ type: 'CREATE_VERSION', version: { id: makeId('version'), name: `Agent 处理前 · ${project.name}`, createdAt: at }, at })
    setAgentStage('planning')
    setAgentStep(0)
    let nextPlan = LOCAL_PLAN
    let mediaAnalysis = activeAnalysis
    try {
      if (selectedAsset && !mediaAnalysis) {
        setAnalyzingId(selectedAsset.id)
        mediaAnalysis = await analyzeMedia(selectedAsset.id)
        setAnalysis((current) => ({ ...current, [selectedAsset.id]: mediaAnalysis as MediaAnalysis }))
        setAnalyzingId(null)
      }
      const mediaContext = selectedAsset
        ? `\n素材技术信息：${selectedAsset.duration.toFixed(1)} 秒，${selectedAsset.width ?? 0}×${selectedAsset.height ?? 0}，${selectedAsset.fps ?? 0} FPS，${mediaAnalysis?.shots.length ?? 0} 个镜头，${mediaAnalysis?.silences.length ?? 0} 个静音段。`
        : ''
      nextPlan = await requestPlan(`${prompt}${mediaContext}`)
    } catch (error) {
      setAnalyzingId(null)
      nextPlan = { ...LOCAL_PLAN, summary: prompt, model: 'Local fallback' }
      if (apiStatus.configured) notify('error', error instanceof Error ? `${error.message}，已改用本地方案。` : 'DeepSeek 暂不可用，已改用本地方案。')
    }
    setPlan(nextPlan)
    setAgentStage('applying')
    for (let index = 0; index < nextPlan.steps.length; index += 1) {
      setAgentStep(index)
      await sleep(230)
    }
    applyAgentIntent(prompt, nextPlan, mediaAnalysis)
    setAgentStep(nextPlan.steps.length)
    setAgentStage('ready')
    notify('success', 'Agent 已把方案写入可编辑时间线，所有修改都可以撤销。')
  }

  const evolveProject = async () => {
    if (!project.media.length) {
      notify('error', '导入并完成一次剪辑后再运行自进化。')
      return
    }
    setAgentStage('planning')
    try {
      const result = await requestEvolution(prompt, plan, evolution ?? undefined)
      const at = new Date().toISOString()
      edit({ type: 'CREATE_VERSION', version: { id: makeId('version'), name: `${result.previousVersion} · 进化前`, createdAt: at }, at })
      edit({ type: 'UPDATE_COLOR', color: { contrast: Math.min(1.25, project.settings.contrast + .04), saturation: Math.min(1.25, project.settings.saturation + .03) }, at })
      edit({ type: 'UPDATE_TITLE', title: { enabled: true, accentColor: result.evolvedPlan.accent, subtitle: result.evolvedPlan.summary.slice(0, 46) }, at })
      setPlan(result.evolvedPlan)
      setEvolution(result)
      setAgentStage('ready')
      notify('success', `自进化完成：${result.previousVersion} → ${result.version}，评分 +${result.delta.toFixed(1)}。`)
    } catch (error) {
      setAgentStage('ready')
      notify('error', error instanceof Error ? error.message : '自进化失败。')
    }
  }

  const splitSelectedClip = () => {
    const clip = selectedClipEntry?.clip
    if (!clip) return
    if (videoClips.length >= MAX_RENDER_CLIPS) {
      notify('error', `单个成片最多支持 ${MAX_RENDER_CLIPS} 个视频片段。`)
      return
    }
    edit({ type: 'SPLIT_CLIP', clipId: clip.id, timelineTime: playhead, rightClipId: makeId('clip'), at: new Date().toISOString() })
  }

  const nudgeSelectedClip = (delta: number) => {
    const located = selectedClipEntry
    if (!located) return
    const index = videoClips.findIndex((clip) => clip.id === located.clip.id)
    const previousEnd = index > 0 ? clipTimelineEnd(videoClips[index - 1]) : 0
    const clipDuration = (located.clip.sourceEnd - located.clip.sourceStart) / located.clip.speed
    const nextStart = index >= 0 && index < videoClips.length - 1 ? videoClips[index + 1].start : Number.POSITIVE_INFINITY
    const maximumStart = Number.isFinite(nextStart) ? Math.max(previousEnd, nextStart - clipDuration) : Number.POSITIVE_INFINITY
    const requested = Math.max(previousEnd, located.clip.start + delta)
    edit({ type: 'MOVE_CLIP', clipId: located.clip.id, toTrackId: located.track.id, start: Math.min(requested, maximumStart), at: new Date().toISOString() })
  }

  const selectAsset = (mediaId: string) => {
    const firstClip = videoClips.find((clip) => clip.mediaId === mediaId)
    edit({ type: 'SELECT', selection: { mediaId, clipId: null, captionId: null, trackId: null } })
    if (firstClip) seekPlayhead(firstClip.start)
  }

  const addSelectedAssetToTimeline = () => {
    if (!selectedAsset || !primaryVideoTrack || selectedAsset.kind !== 'video') return
    if (videoClips.length >= MAX_RENDER_CLIPS) {
      notify('error', `单个成片最多支持 ${MAX_RENDER_CLIPS} 个视频片段。`)
      return
    }
    const at = new Date().toISOString()
    edit({ type: 'ADD_CLIP', trackId: primaryVideoTrack.id, clip: createClip(selectedAsset, { start: projectDuration(project) }), select: true, at })
    notify('success', '已把所选素材加入时间线末尾。')
  }

  const removeSelectedAsset = async () => {
    if (!selectedAsset) return
    if (selectedAsset.builtIn) {
      notify('error', '这是内置演示素材，可加入时间线，但不能从素材库删除。')
      return
    }
    if (!window.confirm(`确定从本地素材库删除“${selectedAsset.name}”吗？这个操作会同时移除它的时间线片段。`)) return
    try {
      await deleteMedia(selectedAsset.id)
      edit({ type: 'REMOVE_MEDIA', mediaId: selectedAsset.id, at: new Date().toISOString() })
      notify('success', '素材及其时间线片段已删除。')
    } catch (error) {
      notify('error', error instanceof Error ? error.message : '素材删除失败。')
    }
  }

  const duplicateSelectedClip = () => {
    const located = selectedClipEntry
    if (!located) return
    if (videoClips.length >= MAX_RENDER_CLIPS) {
      notify('error', `单个成片最多支持 ${MAX_RENDER_CLIPS} 个视频片段。`)
      return
    }
    const clipDuration = (located.clip.sourceEnd - located.clip.sourceStart) / located.clip.speed
    edit({
      type: 'ADD_CLIP',
      trackId: located.track.id,
      clip: { ...located.clip, id: makeId('clip'), name: `${located.clip.name} 副本`, start: Math.max(projectDuration(project), located.clip.start + clipDuration) },
      select: true,
      at: new Date().toISOString(),
    })
  }

  const addCaptionAtPlayhead = () => {
    if (project.captions.length >= MAX_CAPTIONS) {
      notify('error', `单个成片最多支持 ${MAX_CAPTIONS} 条字幕。`)
      return
    }
    edit({ type: 'ADD_CAPTION', caption: createCaption(playhead), select: true, at: new Date().toISOString() })
  }

  const createVersion = () => {
    const at = new Date().toISOString()
    edit({ type: 'CREATE_VERSION', version: { id: makeId('version'), name: `手动快照 · ${project.name}`, createdAt: at }, at })
    setVersionsOpen(true)
    notify('success', '已创建可回滚版本。')
  }

  const restoreVersion = (versionId: string) => {
    const version = project.versions.find((candidate) => candidate.id === versionId)
    if (!version) return
    const targetProject = { ...version.snapshot, versions: project.versions }
    resetPlaybackClock(targetProject.playhead, projectDuration(targetProject))
    edit({ type: 'RESTORE_VERSION', versionId, at: new Date().toISOString() })
    setVersionsOpen(false)
    notify('success', '已恢复所选版本，可继续撤销。')
  }

  const exportProject = () => {
    const blob = new Blob([serializeProject(project, true)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${project.name.replace(/[\\/:*?"<>|]/g, '-') || 'axiom-cut-project'}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const importProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const imported = deserializeProject(await file.text())
      resetPlaybackClock(imported.playhead, projectDuration(imported))
      edit({ type: 'RESET_HISTORY', project: imported })
      notify('success', '工程已载入；持久素材会继续使用本地媒体服务。')
    } catch {
      notify('error', '这个文件不是有效的 Axiom Cut 工程。')
    }
  }

  const renderVideo = async () => {
    if (!videoClips.length) {
      notify('error', '时间线上没有可渲染的视频片段。')
      return
    }
    if (!renderReady) {
      notify('error', '渲染检查尚未全部通过，请先处理素材、片段重叠或规模限制。')
      return
    }
    renderAbortRef.current?.abort()
    const controller = new AbortController()
    renderAbortRef.current = controller
    setRenderError('')
    setRendering(true)
    setTab('export')
    try {
      const job = await startRender({
        clips: videoClips.map((clip) => ({ mediaId: clip.mediaId, start: clip.start, trimStart: clip.sourceStart, trimEnd: clip.sourceEnd, speed: clip.speed, volume: clip.volume })),
        aspect: project.settings.aspect,
        fps: project.settings.fps,
        quality: 'high',
        brightness: project.settings.brightness,
        contrast: project.settings.contrast,
        saturation: project.settings.saturation,
        temperature: project.settings.color.temperature,
        vignette: project.settings.color.vignette,
        title: project.settings.title.enabled ? project.settings.title.text : '',
        titlePosition: project.settings.title.position,
        titleColor: project.settings.title.color,
        accentColor: project.settings.title.accentColor,
        subtitles: project.captions.length
          ? project.captions
          : project.settings.title.enabled && project.settings.title.subtitle
            ? [{ id: 'title-subtitle', start: .08, end: Math.min(3.4, duration), text: project.settings.title.subtitle }]
            : [],
        project: { id: project.id, name: project.name },
      }, controller.signal)
      setRenderRevision(project.updatedAt)
      setRenderJob(job)
      const completed = await pollRenderJob(job.id, {
        signal: controller.signal,
        onStatus: setRenderJob,
        intervalMs: 500,
        timeoutMs: 30 * 60_000,
      })
      setRenderJob(completed)
      notify('success', '真实 MP4 已完成，可以立即下载。')
    } catch (error) {
      if (controller.signal.aborted) return
      const message = error instanceof StudioApiError ? [error.message, error.detail].filter(Boolean).join(' · ') : error instanceof Error ? error.message : '渲染失败。'
      setRenderError(message)
      notify('error', message)
    } finally {
      setRendering(false)
    }
  }

  const stopRender = async () => {
    renderAbortRef.current?.abort()
    if (renderJob?.id) await cancelRender(renderJob.id).catch(() => undefined)
    setRendering(false)
    setRenderJob((job) => job ? { ...job, status: 'cancelled' } : job)
  }

  const seekTimeline = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1)
    seekPlayhead(ratio * timelineDuration)
  }

  const filterStyle = {
    filter: `brightness(${1 + project.settings.brightness}) contrast(${project.settings.contrast}) saturate(${project.settings.saturation})`,
  }
  const temperatureColor = project.settings.color.temperature >= 0
    ? `rgba(255, 132, 72, ${Math.abs(project.settings.color.temperature) * .2})`
    : `rgba(72, 136, 255, ${Math.abs(project.settings.color.temperature) * .2})`
  const ratioClass = `ratio-${project.settings.aspect.replace(':', '-')}`
  const isAgentRunning = agentStage === 'planning' || agentStage === 'applying'
  const renderComplete = renderJob?.status === 'complete'
  const renderFresh = renderComplete && !renderStale

  return <div className="studio-shell">
    <header className="studio-topbar">
      <div className="studio-brand"><div className="studio-brand-mark"><Scissors size={21} /></div><div><strong>AXIOM CUT</strong><span>VIDEO AGENT STUDIO</span></div></div>
      <div className="project-identity"><label>PROJECT / AUTOSAVE</label><input className="project-name-input" value={projectName} onChange={(event) => setProjectName(event.target.value)} onBlur={() => edit({ type: 'RENAME_PROJECT', name: projectName, at: new Date().toISOString() })} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} /></div>
      <div className="studio-toolbar">
        <div className="toolbar-group"><button className="studio-icon-button" disabled={!history.past.length} onClick={() => edit({ type: 'UNDO' })} title="撤销"><Undo2 size={18} /></button><button className="studio-icon-button" disabled={!history.future.length} onClick={() => edit({ type: 'REDO' })} title="重做"><Redo2 size={18} /></button></div>
        <span className={`save-state ${saveFailed ? 'failed' : ''}`}>{saveFailed ? <AlertCircle size={15} /> : saved ? <CheckCircle2 size={15} /> : <LoaderCircle className="spin" size={15} />} {saveFailed ? '保存失败' : saved ? '已自动保存' : '保存中'}</span>
        <button className="studio-button mobile-library" onClick={() => setMediaOpen(true)} title="打开素材库"><Film size={17} /> 素材库</button>
        <button className="studio-button showcase-link hide-compact" onClick={openShowcase}><ImagePlay size={17} /> 展示 Demo</button>
        <button className="studio-button hide-compact" onClick={() => setVersionsOpen(true)}><History size={17} /> 版本</button>
        <button className="studio-button primary" disabled={!renderReady && !rendering} onClick={() => { setTab('export'); if (!rendering && (!renderComplete || renderStale)) void renderVideo() }}><Download size={17} /> {rendering ? '渲染中' : renderFresh ? '查看成片' : renderStale ? '重新渲染' : '导出成片'}</button>
      </div>
    </header>

    <input ref={mediaInputRef} hidden multiple type="file" accept="video/*,.mkv,.m4v,.ts" onChange={handleMediaInput} />
    <input ref={projectInputRef} hidden type="file" accept="application/json,.json" onChange={importProject} />
    {mediaOpen && <button className="asset-drawer-backdrop" aria-label="关闭素材库" onClick={() => setMediaOpen(false)} />}

    <main className="studio-main">
      <aside className={`asset-panel ${mediaOpen ? 'compact-open' : ''}`}>
        <div className="panel-title-row"><div><h2>素材库</h2><span>MEDIA / LOCAL</span></div><div className="panel-title-actions"><button onClick={() => mediaInputRef.current?.click()} title="导入素材"><Plus size={19} /></button><button className="compact-close" onClick={() => setMediaOpen(false)} title="关闭素材库"><X size={18} /></button></div></div>
        <div className={`asset-dropzone ${dragging ? 'dragging' : ''}`} onClick={() => mediaInputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragging(true) }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={handleDrop} role="button" tabIndex={0}>
          <Upload size={24} /><strong>导入真实视频</strong><span>拖放或点击选择<br />MP4 · MOV · WebM · MKV</span>
          {uploadProgress !== null && <div className="upload-progress"><i style={{ width: `${uploadProgress}%` }} /></div>}
        </div>
        <div className="asset-list">
          <div className="asset-list-heading"><span>工程素材</span><span>{project.media.length} ITEMS</span></div>
          {neonSyncAssets.length > 0 && <div className="built-in-collection-banner">
            <div className="collection-banner-title"><span><Sparkles size={15} /> BUILT-IN</span><strong>NEON SYNC</strong></div>
            <p>女团风完整展示素材</p>
            <div className="collection-stats"><span>{neonSyncSourceCount} 支完整源片</span><i /> <span>{neonSyncResultCount} 支 Agent 成片</span></div>
          </div>}
          {sortedMedia.length ? sortedMedia.map((asset) => <button className={`asset-card ${asset.builtIn ? 'built-in' : ''} ${selectedAsset?.id === asset.id ? 'active' : ''}`} key={asset.id} onClick={() => selectAsset(asset.id)} title={asset.builtIn ? '内置演示素材，可选择后加入时间线' : asset.name}>
            <div className="asset-thumb">
              {asset.thumbnailUrl
                ? <img src={asset.thumbnailUrl} alt="" loading="lazy" />
                : asset.kind === 'video' && asset.serverUrl && !asset.builtIn
                  ? <video src={asset.serverUrl} muted preload="metadata" />
                  : asset.kind === 'audio' ? <Music2 size={21} /> : <FileVideo2 size={21} />}
              {asset.builtIn && <b className={`asset-role-badge ${asset.role === 'result' ? 'result' : 'source'}`}>{asset.role === 'result' ? 'RESULT' : 'SOURCE'}</b>}
              <span className="asset-duration">{formatDuration(asset.duration)}</span>
            </div>
            <div className="asset-info"><strong>{asset.name}</strong><span>{asset.width && asset.height ? `${asset.width}×${asset.height}` : asset.kind.toUpperCase()} · {asset.fps ? `${asset.fps.toFixed(0)} FPS` : asset.codec ?? 'MEDIA'}</span><small>{asset.builtIn ? `内置演示 · ${asset.credit?.creator ?? 'NEON SYNC'}` : `${formatBytes(asset.size)} · ${asset.hasAudio ? '含声音' : '无声音轨'}`}</small></div>
          </button>) : <div className="asset-empty">还没有素材。导入视频后会自动读取时长、分辨率、帧率和声音信息。</div>}
        </div>
        <div className="analysis-card">
          <header><strong><ScanSearch size={16} /> 媒体检查</strong><span>{activeAnalysis ? 'READY' : 'FFMPEG'}</span></header>
          <p>{activeAnalysis ? `${activeAnalysis.shots.length} 个镜头 · ${activeAnalysis.silences.length} 个静音段 · ${activeAnalysis.suggestedCuts.length} 个建议切点` : '检测镜头变化与静音区间，为 Agent 提供可验证的剪辑依据。'}</p>
          {selectedAsset && <>
            <div className="analysis-actions"><button className="studio-button accent" disabled={analyzingId === selectedAsset.id} onClick={() => void runAnalysis()}>{analyzingId === selectedAsset.id ? <LoaderCircle className="spin" size={16} /> : <BarChart3 size={16} />} {activeAnalysis ? '重新分析' : '分析当前素材'}</button><button className="studio-icon-button" onClick={addSelectedAssetToTimeline} title="加入时间线"><Plus size={16} /></button><button className="studio-icon-button" disabled={selectedAsset.builtIn} onClick={() => void removeSelectedAsset()} title={selectedAsset.builtIn ? '内置演示素材不可删除' : '删除素材'}><Trash2 size={16} /></button></div>
            {selectedAsset.builtIn && <div className="built-in-media-note"><strong><Sparkles size={13} /> 内置演示 · 不可删除</strong>{selectedAsset.credit && <span>{selectedAsset.credit.creator} · <a href={selectedAsset.credit.sourceUrl} target="_blank" rel="noreferrer">素材来源</a> · <a href={selectedAsset.credit.licenseUrl} target="_blank" rel="noreferrer">授权说明</a></span>}</div>}
          </>}
        </div>
      </aside>

      <section className="editor-center">
        <div className="preview-region">
          <div className="canvas-toolbar"><div><span><i /> LIVE PREVIEW</span><span>{project.settings.width} × {project.settings.height}</span></div><div><button className="studio-icon-button" onClick={() => setShowGuides((value) => !value)} title="安全线">{showGuides ? <Eye size={16} /> : <Square size={16} />}</button><button className="studio-icon-button" onClick={() => previewRef.current?.requestFullscreen?.()} title="全屏预览"><Maximize2 size={16} /></button></div></div>
          <div ref={previewRef} className={`preview-stage ${ratioClass}`} onClick={() => videoClips.length && togglePlayback()}>
            {previewAsset?.serverUrl ? <>
              <video ref={videoRef} key={previewAsset.id} data-timeline-clip-id={timelineClip?.id} src={previewAsset.serverUrl} style={filterStyle} playsInline preload="metadata" />
              <div className="preview-temperature" style={{ background: temperatureColor }} />
              <div className="preview-filter" style={{ background: `radial-gradient(circle, transparent 50%, rgba(0,0,0,${project.settings.color.vignette * .72}) 100%)` }} />
              {showGuides && <div className="safe-guides" />}
              {project.settings.title.enabled && <div className={`preview-title position-${project.settings.title.position}`}><span style={{ color: project.settings.title.accentColor }}>{project.settings.aspect === '9:16' || project.settings.aspect === '4:5' ? 'AXIOM CUT / CODE FILM' : 'AXIOM CUT / CODE DIRECTED'}</span><strong style={{ color: project.settings.title.color }}>{project.settings.title.text}</strong></div>}
              {(activeCaption?.text || project.settings.title.subtitle) && <div className="preview-caption">{activeCaption?.text || project.settings.title.subtitle}</div>}
              <div className="preview-status"><i /> {playing ? 'PLAYING' : 'FRAME READY'} · {project.settings.aspect}</div>
            </> : project.media.length ? <div className="preview-gap"><div><Clock3 size={28} /><strong>{videoClips.length ? '当前是时间线空隙' : '素材尚未加入时间线'}</strong><span>{playing ? '正在播放黑场，进入下一片段后会继续显示画面。' : '这里会在成片中输出黑场与静音；可移动播放头或把素材加入时间线。'}</span>{videoClips.length ? <button onClick={(event) => { event.stopPropagation(); seekPlayhead(videoClips[0].start) }}><Play size={15} /> 跳到首个片段</button> : <button onClick={(event) => { event.stopPropagation(); addSelectedAssetToTimeline() }}><Plus size={15} /> 加入所选素材</button>}</div></div> : <div className="preview-empty"><div className="empty-film-copy"><span>COMPLETE VIDEO AGENT / V1.0</span><h1>从一句话到<br /><em>真实成片</em></h1><p>导入视频，Agent 会检查镜头、生成计划、写入可编辑时间线，并由 FFmpeg 渲染出可下载的 MP4。</p><div className="empty-film-actions"><button onClick={(event) => { event.stopPropagation(); mediaInputRef.current?.click() }}><Upload size={18} /> 导入视频开始</button><button onClick={(event) => { event.stopPropagation(); openShowcase() }}><CirclePlay size={18} /> 查看代码动画 Demo</button></div></div></div>}
          </div>
        </div>

        <div className="studio-transport">
          <div className="transport-cluster"><button onClick={() => seekPlayhead(0)}><SkipBack size={17} /></button><button className="play-main" disabled={!videoClips.length} onClick={togglePlayback}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><button onClick={() => seekPlayhead(Math.min(duration, playhead + 1 / 30))}><SkipForward size={17} /></button></div>
          <strong className="transport-time">{formatTime(playhead)} <span>/ {formatTime(duration)}</span></strong>
          <span className="transport-time transport-fps">{project.settings.fps} FPS</span>
          <input className="playhead-slider" aria-label="播放位置" type="range" min="0" max={duration} step=".01" value={Math.min(playhead, duration)} onChange={(event) => seekPlayhead(Number(event.target.value))} />
          <div className="transport-meta"><span>{project.settings.aspect}</span><span>{videoClips.length} CLIPS</span></div>
        </div>

        <div className="timeline-panel">
          <div className="timeline-toolbar"><div><strong>时间线</strong><button onClick={splitSelectedClip} disabled={!selectedClipEntry}><Split size={14} /><span>分割</span></button><button onClick={duplicateSelectedClip} disabled={!selectedClipEntry}><Copy size={14} /><span>复制</span></button><button onClick={() => nudgeSelectedClip(-.5)} disabled={!selectedClipEntry} title="向前移动 0.5 秒"><ChevronLeft size={14} /><span>前移</span></button><button onClick={() => nudgeSelectedClip(.5)} disabled={!selectedClipEntry} title="向后移动 0.5 秒"><ChevronRight size={14} /><span>后移</span></button><button onClick={() => selectedClipEntry && edit({ type: 'DELETE_CLIP', clipId: selectedClipEntry.clip.id, at: new Date().toISOString() })} disabled={!selectedClipEntry}><Trash2 size={14} /><span>删除</span></button></div><div className="timeline-zoom"><Zap size={14} /><input aria-label="时间线缩放" type="range" min="1" max="3" step=".1" value={timelineZoom} onChange={(event) => setTimelineZoom(Number(event.target.value))} /></div></div>
          <div className="timeline-body">
            <div className="track-labels"><div className="track-label"><Video size={15} /><strong>主画面</strong></div><div className="track-label"><Captions size={15} /><strong>字幕</strong></div><div className="track-label"><Music2 size={15} /><strong>声音</strong></div></div>
            <div className="timeline-scroll" style={{ width: `${timelineZoom * 100}%` }} onClick={seekTimeline}>
              <div className="time-ruler">{Array.from({ length: 11 }, (_, index) => <i className="time-tick" key={index} style={{ left: `${index * 10}%` }}><span>{formatTime(timelineDuration * index / 10).slice(0, 5)}</span></i>)}</div>
              <div className="timeline-track">{videoClips.map((clip) => <button key={clip.id} className={`timeline-clip ${project.selection.clipId === clip.id ? 'selected' : ''}`} style={{ left: `${clip.start / timelineDuration * 100}%`, width: `${Math.max(2.5, (clip.sourceEnd - clip.sourceStart) / clip.speed / timelineDuration * 100)}%` }} onClick={(event) => { event.stopPropagation(); edit({ type: 'SELECT', selection: { clipId: clip.id, mediaId: clip.mediaId, trackId: primaryVideoTrack.id, captionId: null } }) }}><strong>{clip.name}</strong><span>{clip.speed.toFixed(2)}× · {formatDuration((clip.sourceEnd - clip.sourceStart) / clip.speed)}</span></button>)}</div>
              <div className="timeline-track">{project.captions.map((caption) => <button key={caption.id} className={`timeline-clip caption ${project.selection.captionId === caption.id ? 'selected' : ''}`} style={{ left: `${caption.start / timelineDuration * 100}%`, width: `${Math.max(2.5, (caption.end - caption.start) / timelineDuration * 100)}%` }} onClick={(event) => { event.stopPropagation(); edit({ type: 'SELECT', selection: { captionId: caption.id, clipId: null, trackId: null } }) }}><strong>{caption.text}</strong><span>{formatDuration(caption.end - caption.start)}</span></button>)}</div>
              <div className="timeline-track">{videoClips.filter((clip) => project.media.find((asset) => asset.id === clip.mediaId)?.hasAudio).map((clip) => <div key={clip.id} className="timeline-clip audio" style={{ left: `${clip.start / timelineDuration * 100}%`, width: `${Math.max(2.5, (clip.sourceEnd - clip.sourceStart) / clip.speed / timelineDuration * 100)}%` }}><strong>原声 · {Math.round(clip.volume * 100)}%</strong><span>WAVEFORM</span></div>)}</div>
              <div className="timeline-playhead" style={{ left: `${playhead / timelineDuration * 100}%` }} />
            </div>
          </div>
        </div>
      </section>

      <aside className="inspector-panel">
        <nav className="inspector-tabs"><button className={tab === 'agent' ? 'active' : ''} onClick={() => setTab('agent')}><BrainCircuit size={16} /> Agent</button><button className={tab === 'adjust' ? 'active' : ''} onClick={() => setTab('adjust')}><SlidersHorizontal size={16} /> 调整</button><button className={tab === 'export' ? 'active' : ''} onClick={() => setTab('export')}><Download size={16} /> 导出</button></nav>
        <div className="inspector-scroll">
          {tab === 'agent' && <>
            <div className="inspector-section"><header><strong><WandSparkles size={17} /> 剪辑指令</strong><span>{apiStatus.configured ? 'DEEPSEEK' : 'LOCAL'}</span></header><p className="help">用自然语言描述成片目标。Agent 会先给计划，再把能确定执行的修改写入工程。</p><div className="agent-compose"><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="例如：做成 15 秒竖屏口播，前两秒给结论…" /><footer><span>{apiStatus.configured ? `${apiStatus.provider} · ${apiStatus.model}` : '本地确定性备用方案'}</span><button disabled={isAgentRunning || !prompt.trim()} onClick={() => void runAgent()}>{isAgentRunning ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />} 执行剪辑</button></footer></div><div className="quick-recipes">{QUICK_RECIPES.map((recipe, index) => <button key={recipe} onClick={() => setPrompt(recipe)}>方案 {index + 1}</button>)}</div></div>
            <div className="inspector-section"><header><strong><Settings2 size={16} /> 执行过程</strong><span>{Math.min(plan.steps.length, Math.max(0, agentStep + (agentStage === 'ready' ? 1 : 0)))}/{plan.steps.length}</span></header><div className="agent-pipeline">{plan.steps.map((step, index) => { const done = agentStage === 'ready' || agentStep > index; const active = isAgentRunning && agentStep === index; return <div className={`pipeline-step ${done ? 'done' : ''} ${active ? 'active' : ''}`} key={step.id}><i>{done ? <Check size={13} /> : String(index + 1).padStart(2, '0')}</i><div><strong>{step.title}</strong><span>{step.detail}</span></div><code>{step.tool}</code></div> })}</div></div>
            <div className="inspector-section"><header><strong><Sparkles size={16} /> 自进化</strong><span>{evolution?.version ?? 'V1.0'}</span></header>{evolution ? <><div className="evolution-score"><div className="score-orb">{evolution.score.toFixed(0)}</div><div><strong>本轮 +{evolution.delta.toFixed(1)}</strong><span>{evolution.rationale}</span></div></div><div className="mutation-list">{evolution.mutations.map((mutation) => <div className={`mutation ${mutation.selected ? 'selected' : ''}`} key={mutation.id}><strong><span>{mutation.id} · {mutation.title}</span><span>{mutation.expectedGain}</span></strong>{mutation.selected && <div style={{ marginTop: 5 }}>已选择并应用到当前版本</div>}</div>)}</div></> : <p className="help">评估叙事、构图、节奏和连续性，生成 3 个变体，只应用评分最高的一项，并自动保存进化前版本。</p>}<button className="studio-button accent" style={{ width: '100%' }} disabled={isAgentRunning} onClick={() => void evolveProject()}><Sparkles size={16} /> 运行一轮自进化</button></div>
          </>}

          {tab === 'adjust' && <>
            <div className="inspector-section"><header><strong><Film size={16} /> 画幅与画布</strong><span>{project.settings.width}×{project.settings.height}</span></header><div className="aspect-buttons">{(['16:9', '9:16', '1:1', '4:3', '4:5'] as AspectRatio[]).map((aspect) => <button key={aspect} className={project.settings.aspect === aspect ? 'active' : ''} onClick={() => edit({ type: 'UPDATE_ASPECT', aspect, at: new Date().toISOString() })}>{aspect}</button>)}</div></div>
            <div className="inspector-section"><header><strong><Gauge size={16} /> 片段</strong><span>{selectedClipEntry ? selectedClipEntry.clip.name.slice(0, 16) : '未选择'}</span></header>{selectedClipEntry ? <div className="field-stack"><div className="field-pair"><label>入点<input type="number" min="0" max={selectedAsset?.duration ?? selectedClipEntry.clip.sourceEnd} step=".1" value={selectedClipEntry.clip.sourceStart} onChange={(event) => edit({ type: 'UPDATE_TRIM', clipId: selectedClipEntry.clip.id, sourceStart: Number(event.target.value), at: new Date().toISOString() })} /></label><label>出点<input type="number" min=".01" max={selectedAsset?.duration ?? selectedClipEntry.clip.sourceEnd} step=".1" value={selectedClipEntry.clip.sourceEnd} onChange={(event) => edit({ type: 'UPDATE_TRIM', clipId: selectedClipEntry.clip.id, sourceEnd: Number(event.target.value), at: new Date().toISOString() })} /></label></div><div className="field-row"><label>速度 · {selectedClipEntry.clip.speed.toFixed(2)}×</label><input type="number" min=".25" max="4" step=".05" value={selectedClipEntry.clip.speed} onChange={(event) => edit({ type: 'UPDATE_SPEED', clipId: selectedClipEntry.clip.id, speed: Number(event.target.value), at: new Date().toISOString() })} /></div><div className="field-row"><label>音量 · {Math.round(selectedClipEntry.clip.volume * 100)}%</label><input type="number" min="0" max="2" step=".05" value={selectedClipEntry.clip.volume} onChange={(event) => edit({ type: 'UPDATE_VOLUME', clipId: selectedClipEntry.clip.id, volume: Number(event.target.value), at: new Date().toISOString() })} /></div></div> : <p className="help">在时间线上点选一个片段，即可裁切、调速和调音量。</p>}</div>
            <div className="inspector-section"><header><strong><SlidersHorizontal size={16} /> 程序调色</strong><span>LIVE</span></header><div className="field-stack">{([['亮度', 'brightness', -.5, .5, .01], ['对比度', 'contrast', .5, 1.8, .01], ['饱和度', 'saturation', 0, 2, .01], ['色温', 'temperature', -1, 1, .01], ['暗角', 'vignette', 0, 1, .01]] as const).map(([label, key, min, max, step]) => { const value = key === 'brightness' || key === 'contrast' || key === 'saturation' ? project.settings[key] : project.settings.color[key]; return <div className="field-row" key={key}><label>{label} · {value.toFixed(2)}</label><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => edit({ type: 'UPDATE_COLOR', color: { [key]: Number(event.target.value) }, at: new Date().toISOString() })} /></div> })}<button className="studio-button" onClick={() => edit({ type: 'UPDATE_COLOR', color: { brightness: 0, contrast: 1, saturation: 1, temperature: 0, vignette: 0 }, at: new Date().toISOString() })}><RotateCcw size={15} /> 重置调色</button></div></div>
            <div className="inspector-section"><header><strong><FileVideo2 size={16} /> 标题图层</strong><span>{project.settings.title.enabled ? 'ON' : 'OFF'}</span></header><div className="field-stack"><label className="field-row"><span>显示标题</span><input type="checkbox" checked={project.settings.title.enabled} onChange={(event) => edit({ type: 'UPDATE_TITLE', title: { enabled: event.target.checked }, at: new Date().toISOString() })} /></label><div className="field-row wide"><label>主标题</label><input className="text-field" value={project.settings.title.text} placeholder="输入成片标题" onChange={(event) => edit({ type: 'UPDATE_TITLE', title: { text: event.target.value }, at: new Date().toISOString() })} /></div><div className="field-row wide"><label>副标题</label><input className="text-field" value={project.settings.title.subtitle} placeholder="一句简短说明" onChange={(event) => edit({ type: 'UPDATE_TITLE', title: { subtitle: event.target.value }, at: new Date().toISOString() })} /></div><div className="title-controls"><label>位置<select value={project.settings.title.position} onChange={(event) => edit({ type: 'UPDATE_TITLE', title: { position: event.target.value as 'top' | 'center' | 'bottom' }, at: new Date().toISOString() })}><option value="top">顶部</option><option value="center">居中</option><option value="bottom">底部</option></select></label><label>标题色<input aria-label="标题颜色" type="color" value={project.settings.title.color} onChange={(event) => edit({ type: 'UPDATE_TITLE', title: { color: event.target.value }, at: new Date().toISOString() })} /></label><label>强调色<input aria-label="标题强调色" type="color" value={project.settings.title.accentColor} onChange={(event) => edit({ type: 'UPDATE_TITLE', title: { accentColor: event.target.value }, at: new Date().toISOString() })} /></label></div></div></div>
            <div className="inspector-section"><header><strong><Captions size={16} /> 字幕</strong><span>{project.captions.length} CUES</span></header><div className="caption-list">{project.captions.map((caption) => <div className="caption-item" key={caption.id}><div><input value={caption.text} onChange={(event) => edit({ type: 'UPDATE_CAPTION', captionId: caption.id, patch: { text: event.target.value }, at: new Date().toISOString() })} /><div className="caption-time-fields"><label>开始<input aria-label={`${caption.text} 开始时间`} type="number" min="0" max={Math.max(0, duration - .05)} step=".1" value={caption.start} onChange={(event) => edit({ type: 'UPDATE_CAPTION', captionId: caption.id, patch: { start: Number(event.target.value) }, at: new Date().toISOString() })} /></label><label>结束<input aria-label={`${caption.text} 结束时间`} type="number" min=".05" max={duration} step=".1" value={caption.end} onChange={(event) => edit({ type: 'UPDATE_CAPTION', captionId: caption.id, patch: { end: Number(event.target.value) }, at: new Date().toISOString() })} /></label></div></div><button onClick={() => edit({ type: 'DELETE_CAPTION', captionId: caption.id, at: new Date().toISOString() })}><Trash2 size={14} /></button></div>)}</div><button className="add-caption" disabled={project.captions.length >= MAX_CAPTIONS} onClick={addCaptionAtPlayhead}><Plus size={14} /> 在播放头添加字幕</button></div>
          </>}

          {tab === 'export' && <>
            <div className={`render-hero ${renderStale ? 'stale' : ''}`}><div className="render-icon">{rendering ? <LoaderCircle className="spin" size={26} /> : renderFresh ? <CheckCircle2 size={28} /> : renderStale ? <RotateCcw size={27} /> : <Film size={27} />}</div><h2>{renderFresh ? 'MP4 已完成' : renderStale ? '设置已改变，需要重新渲染' : rendering ? '正在生成真实成片' : 'FFmpeg 成片渲染'}</h2><p>{renderStale ? '时间线或画面设置已在上次成片后更新。重新渲染后，下载文件才会与当前预览保持一致。' : '按当前时间线裁切、拼接、调速、调色、混音并烧录标题字幕，输出 H.264 / AAC MP4。'}</p>{rendering ? <button onClick={() => void stopRender()}><X size={17} /> 取消渲染</button> : renderFresh ? <div className="render-actions"><a className="download-render" href={renderJob.downloadUrl || downloadUrl(renderJob.id)} download><Download size={17} /> 下载 MP4 成片</a><button onClick={() => void renderVideo()}><RotateCcw size={16} /> 重新渲染</button></div> : <button disabled={!renderReady} onClick={() => void renderVideo()}><Film size={17} /> {renderStale ? '按当前设置重新渲染' : '开始真实渲染'}</button>}
              {(rendering || renderJob) && <div className="render-progress"><div><i style={{ width: `${renderPercent}%` }} /></div><span><b>{renderJob?.status?.toUpperCase() ?? 'QUEUED'}</b><b>{renderPercent.toFixed(0)}%</b></span></div>}
              <div className="render-specs"><div><span>RESOLUTION</span><strong>{project.settings.width}×{project.settings.height}</strong></div><div><span>FRAME RATE</span><strong>{project.settings.fps} FPS</strong></div><div><span>VIDEO</span><strong>H.264</strong></div><div><span>AUDIO</span><strong>AAC</strong></div></div>{renderError && <div className="render-error"><AlertCircle size={15} /> {renderError}</div>}</div>
            <div className="inspector-section"><header><strong><Save size={16} /> 工程与版本</strong><span>SCHEMA V1</span></header><p className="help">工程 JSON 保存完整时间线、字幕和参数；媒体使用本地服务中的持久引用，不会写入密钥。</p><div className="export-actions"><button onClick={exportProject}><FileJson size={16} /> 下载工程 JSON</button><button onClick={() => projectInputRef.current?.click()}><FolderOpen size={16} /> 载入工程 JSON</button><button onClick={createVersion}><History size={16} /> 创建可回滚版本</button></div></div>
            <div className="inspector-section"><header><strong><CheckCircle2 size={16} /> 渲染检查</strong><span>{renderReady ? 'PASS' : 'WAIT'}</span></header><div className="agent-pipeline">{preflightChecks.map(([label, pass], index) => <div className={`pipeline-step ${pass ? 'done' : ''}`} key={label}><i>{pass ? <Check size={13} /> : index + 1}</i><div><strong>{label}</strong><span>{pass ? '已通过' : '需要处理'}</span></div><code>{pass ? 'PASS' : 'WAIT'}</code></div>)}</div></div>
          </>}
        </div>
      </aside>
    </main>

    {versionsOpen && <div className="studio-modal-backdrop" onMouseDown={() => setVersionsOpen(false)}><div className="version-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><h2>版本与回滚</h2><p style={{ margin: '6px 0 0', color: '#77858e', fontSize: 12 }}>Agent 和自进化运行前会自动创建快照。</p></div><button onClick={() => setVersionsOpen(false)}><X size={18} /></button></header>{project.versions.length ? [...project.versions].reverse().map((version, index) => <div className="version-card" key={version.id}><span>V{project.versions.length - index}</span><div><strong>{version.name}</strong><small>{new Date(version.createdAt).toLocaleString('zh-CN')} · {version.snapshot.tracks.flatMap((track) => track.clips).length} clips</small></div><button onClick={() => restoreVersion(version.id)}><RotateCcw size={13} /> 恢复</button></div>) : <div className="asset-empty">暂无版本快照。点击下方按钮创建第一个版本。</div>}<button className="studio-button accent" style={{ width: '100%', marginTop: 14 }} onClick={createVersion}><Plus size={16} /> 创建当前版本快照</button></div></div>}
    {toast && <div className={`studio-toast ${toast.kind}`}>{toast.kind === 'success' ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}<span>{toast.message}</span></div>}
  </div>
}

export default StudioWorkspace
