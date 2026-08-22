import express from 'express'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
try {
  process.loadEnvFile?.(resolve(root, '.env'))
} catch (error) {
  if (error?.code !== 'ENOENT') console.warn('Could not load .env:', error?.message)
}
const app = express()
const port = Number(process.env.PORT || 4173)

const studioDir = join(tmpdir(), 'axiom-cut-studio')
const mediaDir = join(studioDir, 'media')
const renderDir = join(studioDir, 'renders')
const subtitleDir = join(studioDir, 'subtitles')
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024
const MEDIA_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi', '.mpeg', '.mpg', '.ts'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PEXELS_LICENSE_URL = 'https://www.pexels.com/license/'
const BUILT_IN_MEDIA = [
  {
    id: 'd7a5e3b1-4c20-4f8a-9b01-6e1010000081',
    input: 'public/demo/neon-sync/library/source-13648581.mp4',
    name: 'NEON SYNC · 露台全景 A.mp4',
    role: 'source',
    thumbnailUrl: '/demo/neon-sync/library/source-13648581-poster.webp',
    createdAt: '2026-08-22T02:00:01.000Z',
    sourceUrl: 'https://www.pexels.com/video/women-practising-synchronic-dance-13648581/',
  },
  {
    id: 'd7a5e3b1-4c20-4f8a-9b01-6e1010000082',
    input: 'public/demo/neon-sync/library/source-13648582.mp4',
    name: 'NEON SYNC · 霓虹人物特写.mp4',
    role: 'source',
    thumbnailUrl: '/demo/neon-sync/library/source-13648582-poster.webp',
    createdAt: '2026-08-22T02:00:02.000Z',
    sourceUrl: 'https://www.pexels.com/video/x-13648582/',
  },
  {
    id: 'd7a5e3b1-4c20-4f8a-9b01-6e1010000083',
    input: 'public/demo/neon-sync/library/source-13648583.mp4',
    name: 'NEON SYNC · 露台人物特写.mp4',
    role: 'source',
    thumbnailUrl: '/demo/neon-sync/library/source-13648583-poster.webp',
    createdAt: '2026-08-22T02:00:03.000Z',
    sourceUrl: 'https://www.pexels.com/video/group-of-young-women-dancing-13648583/',
  },
  {
    id: 'd7a5e3b1-4c20-4f8a-9b01-6e1010000004',
    input: 'public/demo/neon-sync/library/alternate-source.mp4',
    name: 'NEON SYNC · 霓虹舞蹈机位 B.mp4',
    role: 'source',
    thumbnailUrl: '/demo/neon-sync/library/alternate-source-poster.webp',
    createdAt: '2026-08-22T02:00:04.000Z',
    sourceUrl: 'https://www.pexels.com/video/performance-with-synchronic-dancing-13648584/',
  },
  {
    id: 'd7a5e3b1-4c20-4f8a-9b01-6e1010000002',
    input: 'public/demo/neon-sync/library/close-source.mp4',
    name: 'NEON SYNC · 霓虹舞蹈机位 A.mp4',
    role: 'source',
    thumbnailUrl: '/demo/neon-sync/library/close-source-poster.webp',
    createdAt: '2026-08-22T02:00:05.000Z',
    sourceUrl: 'https://www.pexels.com/video/dancers-practising-dance-routine-13648585/',
  },
  {
    id: 'd7a5e3b1-4c20-4f8a-9b01-6e1010000086',
    input: 'public/demo/neon-sync/library/source-13648586.mp4',
    name: 'NEON SYNC · 露台全景 B.mp4',
    role: 'source',
    thumbnailUrl: '/demo/neon-sync/library/source-13648586-poster.webp',
    createdAt: '2026-08-22T02:00:06.000Z',
    sourceUrl: 'https://www.pexels.com/video/x-13648586/',
  },
  {
    id: 'd7a5e3b1-4c20-4f8a-9b01-6e1010000087',
    input: 'public/demo/neon-sync/library/source-13648587.mp4',
    name: 'NEON SYNC · 露台双人机位.mp4',
    role: 'source',
    thumbnailUrl: '/demo/neon-sync/library/source-13648587-poster.webp',
    createdAt: '2026-08-22T02:00:07.000Z',
    sourceUrl: 'https://www.pexels.com/video/x-13648587/',
  },
  {
    id: 'd7a5e3b1-4c20-4f8a-9b01-6e1010000001',
    input: 'public/demo/neon-sync/library/wide-source.mp4',
    name: 'NEON SYNC · 霓虹舞蹈主机位.mp4',
    role: 'source',
    thumbnailUrl: '/demo/neon-sync/library/wide-source-poster.webp',
    createdAt: '2026-08-22T02:00:08.000Z',
    sourceUrl: 'https://www.pexels.com/video/women-dancing-in-studio-13648588/',
  },
  {
    id: 'd7a5e3b1-4c20-4f8a-9b01-6e1010000089',
    input: 'public/demo/neon-sync/library/source-13648589.mp4',
    name: 'NEON SYNC · 露台全景 C.mp4',
    role: 'source',
    thumbnailUrl: '/demo/neon-sync/library/source-13648589-poster.webp',
    createdAt: '2026-08-22T02:00:09.000Z',
    sourceUrl: 'https://www.pexels.com/video/dancers-in-black-costumes-13648589/',
  },
  {
    id: 'd7a5e3b1-4c20-4f8a-9b01-6e1010000003',
    input: 'public/demo/neon-sync/agent-cut.mp4',
    name: 'NEON SYNC · Agent 精剪成片.mp4',
    role: 'result',
    thumbnailUrl: '/demo/neon-sync/cut-poster.webp',
    createdAt: '2026-08-22T02:00:10.000Z',
    sourceUrl: 'https://www.pexels.com/video/women-dancing-in-studio-13648588/',
  },
]
const mediaCache = new Map()
const renderJobs = new Map()
const renderQueue = []
let activeRenders = 0

await Promise.all([
  mkdir(mediaDir, { recursive: true }),
  mkdir(renderDir, { recursive: true }),
  mkdir(subtitleDir, { recursive: true }),
])

class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

const apiError = (response, status, code, message) => response.status(status).json({ error: message, code })

const safeId = (value) => {
  const id = String(value || '')
  if (!UUID_PATTERN.test(id)) throw new ApiError(400, 'INVALID_ID', '资源 ID 格式无效。')
  return id
}

const decodeFileName = (value) => {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return 'untitled.mp4'
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

const safeFileName = (value) => {
  const cleaned = basename(String(value || 'untitled.mp4'))
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim()
    .slice(0, 120)
  return cleaned || 'untitled.mp4'
}

const mediaMetaPath = (id) => join(mediaDir, `${id}.json`)
const mediaSourcePath = (metadata) => join(mediaDir, `${metadata.id}${metadata.extension}`)

const publicMedia = (metadata) => ({
  id: metadata.id,
  name: metadata.name,
  type: metadata.type,
  size: metadata.size,
  duration: metadata.duration,
  width: metadata.width,
  height: metadata.height,
  fps: metadata.fps,
  codec: metadata.codec,
  audioCodec: metadata.audioCodec,
  hasAudio: metadata.hasAudio,
  createdAt: metadata.createdAt,
  analysis: metadata.analysis || null,
  url: `/api/media/${metadata.id}/file`,
  fileUrl: `/api/media/${metadata.id}/file`,
  analysisUrl: `/api/media/${metadata.id}/analyze`,
  ...(metadata.builtIn === true ? {
    builtIn: true,
    collection: metadata.collection,
    role: metadata.role,
    thumbnailUrl: metadata.thumbnailUrl,
    credit: metadata.credit,
  } : {}),
})

const readMedia = async (idValue) => {
  const id = safeId(idValue)
  if (mediaCache.has(id)) return mediaCache.get(id)
  try {
    const parsed = JSON.parse(await readFile(mediaMetaPath(id), 'utf8'))
    if (parsed.id !== id || !MEDIA_EXTENSIONS.has(parsed.extension)) throw new Error('Invalid media metadata')
    await stat(mediaSourcePath(parsed))
    mediaCache.set(id, parsed)
    return parsed
  } catch (error) {
    if (error?.code === 'ENOENT') throw new ApiError(404, 'MEDIA_NOT_FOUND', '没有找到这个素材。')
    if (error instanceof ApiError) throw error
    throw new ApiError(500, 'MEDIA_METADATA_ERROR', '素材元数据无法读取。')
  }
}

const collectProcess = (command, args, { timeoutMs = 90_000, maxOutput = 4_000_000 } = {}) => new Promise((resolveProcess, rejectProcess) => {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
  let stdout = ''
  let stderr = ''
  let settled = false
  const append = (current, chunk) => current.length >= maxOutput ? current : `${current}${chunk}`.slice(-maxOutput)
  child.stdout.on('data', (chunk) => { stdout = append(stdout, chunk.toString()) })
  child.stderr.on('data', (chunk) => { stderr = append(stderr, chunk.toString()) })
  const timer = setTimeout(() => {
    if (!settled) child.kill('SIGTERM')
  }, timeoutMs)
  child.once('error', (error) => {
    if (settled) return
    settled = true
    clearTimeout(timer)
    rejectProcess(error)
  })
  child.once('close', (code, signal) => {
    if (settled) return
    settled = true
    clearTimeout(timer)
    if (code === 0) return resolveProcess({ stdout, stderr })
    const detail = stderr.trim().split('\n').slice(-8).join('\n')
    rejectProcess(new Error(`${command} exited with ${code ?? signal}: ${detail}`))
  })
})

const rendererHealth = await (async () => {
  try {
    const [ffmpeg, ffprobe] = await Promise.all([
      collectProcess('ffmpeg', ['-version'], { timeoutMs: 10_000, maxOutput: 20_000 }),
      collectProcess('ffprobe', ['-version'], { timeoutMs: 10_000, maxOutput: 20_000 }),
    ])
    const ffmpegVersion = ffmpeg.stdout.match(/^ffmpeg version\s+([^\s]+)/m)?.[1] || 'available'
    const ffprobeReady = /^ffprobe version/m.test(ffprobe.stdout)
    return { available: ffprobeReady, ready: ffprobeReady, version: `FFmpeg ${ffmpegVersion} · H.264/AAC` }
  } catch (error) {
    console.warn('FFmpeg/FFprobe unavailable:', error?.message)
    return { available: false, ready: false, version: 'FFmpeg or FFprobe not found' }
  }
})()

const requireRenderer = () => {
  if (!rendererHealth.ready) throw new ApiError(503, 'RENDERER_UNAVAILABLE', 'FFmpeg 或 FFprobe 不可用，请先安装并加入 PATH。')
}

const parseRate = (value) => {
  const [numerator, denominator = '1'] = String(value || '0').split('/')
  const result = Number(numerator) / Number(denominator)
  return Number.isFinite(result) ? Number(result.toFixed(3)) : 0
}

const probeMedia = async (filePath) => {
  const { stdout } = await collectProcess('ffprobe', [
    '-v', 'error',
    '-show_streams',
    '-show_format',
    '-of', 'json',
    filePath,
  ], { timeoutMs: 45_000 })
  const result = JSON.parse(stdout)
  const video = result.streams?.find((stream) => stream.codec_type === 'video')
  const audio = result.streams?.find((stream) => stream.codec_type === 'audio')
  if (!video) throw new ApiError(415, 'VIDEO_STREAM_REQUIRED', '素材中没有可用的视频轨道。')
  const duration = Number(result.format?.duration || video.duration)
  if (!Number.isFinite(duration) || duration <= 0) throw new ApiError(415, 'INVALID_DURATION', '无法识别素材时长。')
  return {
    duration: Number(duration.toFixed(3)),
    width: Number(video.width) || 0,
    height: Number(video.height) || 0,
    fps: parseRate(video.avg_frame_rate || video.r_frame_rate),
    codec: String(video.codec_name || 'unknown'),
    audioCodec: audio ? String(audio.codec_name || 'unknown') : null,
    hasAudio: Boolean(audio),
  }
}

const installMediaFileAtomically = async (sourcePath, destinationPath) => {
  const temporaryPath = `${destinationPath}.${process.pid}-${randomUUID()}.tmp`
  try {
    await copyFile(sourcePath, temporaryPath)
    const [fileStat, probe] = await Promise.all([
      stat(temporaryPath),
      probeMedia(temporaryPath),
    ])
    await rename(temporaryPath, destinationPath)
    return { fileStat, probe }
  } finally {
    await unlink(temporaryPath).catch(() => {})
  }
}

const writeJsonAtomically = async (destinationPath, value) => {
  const temporaryPath = `${destinationPath}.${process.pid}-${randomUUID()}.tmp`
  try {
    await writeFile(temporaryPath, JSON.stringify(value, null, 2), { encoding: 'utf8', flag: 'wx' })
    await rename(temporaryPath, destinationPath)
  } finally {
    await unlink(temporaryPath).catch(() => {})
  }
}

const seedBuiltInMedia = async () => {
  for (const item of BUILT_IN_MEDIA) {
    const inputPath = resolve(root, item.input)
    const destinationPath = join(mediaDir, `${item.id}.mp4`)
    try {
      const inputStat = await stat(inputPath)
      let fileStat
      let probe
      try {
        const [installedStat, storedMetadata] = await Promise.all([
          stat(destinationPath),
          readFile(mediaMetaPath(item.id), 'utf8').then(JSON.parse),
        ])
        const reusable = installedStat.size === inputStat.size
          && storedMetadata.id === item.id
          && storedMetadata.extension === '.mp4'
          && Number(storedMetadata.duration) > 0
          && Number(storedMetadata.width) > 0
          && Number(storedMetadata.height) > 0
        if (!reusable) throw new Error('Built-in media cache is stale')
        fileStat = installedStat
        probe = {
          duration: storedMetadata.duration,
          width: storedMetadata.width,
          height: storedMetadata.height,
          fps: storedMetadata.fps,
          codec: storedMetadata.codec,
          audioCodec: storedMetadata.audioCodec ?? null,
          hasAudio: storedMetadata.hasAudio === true,
        }
      } catch {
        ({ fileStat, probe } = await installMediaFileAtomically(inputPath, destinationPath))
      }
      const metadata = {
        id: item.id,
        extension: '.mp4',
        name: item.name,
        type: 'video/mp4',
        size: fileStat.size,
        createdAt: item.createdAt,
        ...probe,
        builtIn: true,
        collection: 'neon-sync',
        role: item.role,
        thumbnailUrl: item.thumbnailUrl,
        credit: {
          creator: 'khanhhoangminh / Pexels',
          sourceUrl: item.sourceUrl,
          licenseUrl: PEXELS_LICENSE_URL,
        },
      }
      await writeJsonAtomically(mediaMetaPath(item.id), metadata)
      mediaCache.set(item.id, metadata)
    } catch (error) {
      console.warn(`Built-in media skipped (${item.name}):`, error?.message)
    }
  }
}

await seedBuiltInMedia()

const roundTime = (value) => Number(Math.max(0, value).toFixed(3))

const analyzeMedia = async (metadata) => {
  const sourcePath = mediaSourcePath(metadata)
  const analyzedDuration = Math.min(metadata.duration, 600)
  const sceneArgs = [
    '-hide_banner', '-nostats', '-loglevel', 'info',
    '-t', String(analyzedDuration), '-i', sourcePath,
    '-vf', "select='gt(scene,0.32)',showinfo",
    '-an', '-fps_mode', 'vfr', '-f', 'null', '-',
  ]
  const silenceArgs = [
    '-hide_banner', '-nostats', '-loglevel', 'info',
    '-t', String(analyzedDuration), '-i', sourcePath,
    '-vn', '-af', 'silencedetect=n=-35dB:d=0.45',
    '-f', 'null', '-',
  ]
  const [sceneResult, silenceResult] = await Promise.all([
    collectProcess('ffmpeg', sceneArgs, { timeoutMs: 120_000 }),
    metadata.hasAudio
      ? collectProcess('ffmpeg', silenceArgs, { timeoutMs: 120_000 })
      : Promise.resolve({ stderr: '' }),
  ])

  const sceneTimes = [...sceneResult.stderr.matchAll(/pts_time:\s*([0-9.]+)/g)]
    .map((match) => Number(match[1]))
    .filter((time) => Number.isFinite(time) && time > 0.08 && time < analyzedDuration - 0.08)
  const uniqueScenes = [...new Set(sceneTimes.map((time) => roundTime(time)))]
    .sort((a, b) => a - b)
    .filter((time, index, values) => index === 0 || time - values[index - 1] >= 0.18)
    .slice(0, 300)
  const boundaries = [0, ...uniqueScenes, roundTime(analyzedDuration)]
  const shots = boundaries.slice(0, -1).map((start, index) => ({
    start: roundTime(start),
    end: roundTime(boundaries[index + 1]),
    duration: roundTime(boundaries[index + 1] - start),
  }))

  const silenceStarts = [...silenceResult.stderr.matchAll(/silence_start:\s*([0-9.]+)/g)].map((match) => Number(match[1]))
  const silenceEnds = [...silenceResult.stderr.matchAll(/silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/g)]
    .map((match) => ({ end: Number(match[1]), duration: Number(match[2]) }))
  const silences = silenceEnds.map((item, index) => {
    const start = Number.isFinite(silenceStarts[index]) ? silenceStarts[index] : Math.max(0, item.end - item.duration)
    return { start: roundTime(start), end: roundTime(item.end), duration: roundTime(item.duration) }
  }).filter((item) => item.duration >= 0.4).slice(0, 300)
  if (silenceStarts.length > silenceEnds.length) {
    const start = silenceStarts.at(-1)
    silences.push({ start: roundTime(start), end: roundTime(analyzedDuration), duration: roundTime(analyzedDuration - start) })
  }

  const suggestedCuts = [...new Set([
    ...uniqueScenes,
    ...silences.flatMap((item) => [item.start, item.end]),
  ].map((time) => roundTime(time)))]
    .filter((time) => time > 0.15 && time < analyzedDuration - 0.15)
    .sort((a, b) => a - b)
    .slice(0, 400)

  return {
    duration: metadata.duration,
    analyzedDuration: roundTime(analyzedDuration),
    truncated: metadata.duration > analyzedDuration,
    shots,
    silences,
    suggestedCuts,
    generatedAt: new Date().toISOString(),
  }
}

const boundedNumber = (value, fallback, min, max, label) => {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new ApiError(400, 'INVALID_RENDER_SETTING', `${label} 必须在 ${min} 到 ${max} 之间。`)
  }
  return parsed
}

const safeText = (value, maxLength, label) => {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') throw new ApiError(400, 'INVALID_RENDER_SETTING', `${label} 必须是文本。`)
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, maxLength)
}

const safeHexColor = (value, fallback, label) => {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value !== 'string') throw new ApiError(400, 'INVALID_RENDER_SETTING', `${label} 必须是十六进制颜色。`)
  const normalized = value.trim().toUpperCase()
  if (/^#[0-9A-F]{6}$/.test(normalized)) return normalized
  if (/^#[0-9A-F]{3}$/.test(normalized)) {
    return `#${normalized.slice(1).split('').map((character) => character.repeat(2)).join('')}`
  }
  throw new ApiError(400, 'INVALID_RENDER_SETTING', `${label} 必须使用 #RRGGBB 格式。`)
}

const firstNonEmpty = (...values) => values.find((value) => {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'string') return value.trim().length > 0
  return value !== undefined && value !== null
})

const aspectDimensions = (value, quality = 'standard') => {
  const aspect = String(value || '16:9').toLowerCase()
  const ratios = {
    '16:9': '16:9', landscape: '16:9',
    '9:16': '9:16', portrait: '9:16',
    '1:1': '1:1', square: '1:1',
    '4:3': '4:3', '4:5': '4:5',
  }
  const normalized = ratios[aspect]
  const sizes = {
    preview: { '16:9': [960, 540], '9:16': [540, 960], '1:1': [720, 720], '4:3': [720, 540], '4:5': [720, 900] },
    standard: { '16:9': [1280, 720], '9:16': [720, 1280], '1:1': [1080, 1080], '4:3': [960, 720], '4:5': [864, 1080] },
    high: { '16:9': [1920, 1080], '9:16': [1080, 1920], '1:1': [1080, 1080], '4:3': [1440, 1080], '4:5': [1080, 1350] },
  }
  const dimensions = normalized ? sizes[quality]?.[normalized] : null
  if (!dimensions) throw new ApiError(400, 'INVALID_ASPECT', '画幅仅支持 16:9、9:16、1:1、4:3 或 4:5。')
  return { aspect: normalized, width: dimensions[0], height: dimensions[1] }
}

const projectClips = (body, project, settings) => {
  const timelineTracks = project?.timeline?.tracks || project?.tracks
  const trackClips = timelineTracks
    ?.filter((track) => track?.type === 'video' || track?.kind === 'video')
    .filter((track) => !track.hidden)
    .flatMap((track) => Array.isArray(track.clips) ? track.clips.filter((clip) => clip?.enabled !== false) : [])
    .sort((a, b) => Number(a?.start || 0) - Number(b?.start || 0))
  return body.clips || settings.clips || project.clips || project.timeline?.clips || trackClips || []
}

const normalizeSubtitles = (value, totalDuration) => {
  if (!value) return []
  const entries = typeof value === 'string' ? [{ text: value, start: 0, end: totalDuration }] : value
  if (!Array.isArray(entries)) throw new ApiError(400, 'INVALID_SUBTITLES', '字幕必须是文本或字幕片段数组。')
  if (entries.length > 200) throw new ApiError(400, 'TOO_MANY_SUBTITLES', '单次渲染最多支持 200 条字幕。')
  return entries.map((entry, index) => {
    const text = safeText(typeof entry === 'string' ? entry : entry?.text, 500, `第 ${index + 1} 条字幕`)
    const start = boundedNumber(typeof entry === 'string' ? 0 : entry?.start, 0, 0, totalDuration, '字幕开始时间')
    const end = boundedNumber(typeof entry === 'string' ? totalDuration : entry?.end, totalDuration, 0, totalDuration, '字幕结束时间')
    if (!text || end <= start) throw new ApiError(400, 'INVALID_SUBTITLES', `第 ${index + 1} 条字幕内容为空或时间范围无效。`)
    return { text, start, end }
  })
}

const normalizeRenderRequest = async (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'INVALID_RENDER_REQUEST', '渲染参数格式无效。')
  const project = body.project && typeof body.project === 'object' ? body.project : {}
  const settings = body.settings && typeof body.settings === 'object'
    ? body.settings
    : project.settings && typeof project.settings === 'object' ? project.settings : {}
  const rawClips = projectClips(body, project, settings)
  const fallbackMediaId = body.mediaId || settings.mediaId || project.mediaId
  const clips = Array.isArray(rawClips) && rawClips.length ? rawClips : fallbackMediaId ? [{ mediaId: fallbackMediaId }] : []
  if (!clips.length) throw new ApiError(400, 'NO_RENDER_CLIPS', '时间线中至少需要一个视频片段。')
  if (clips.length > 12) throw new ApiError(400, 'TOO_MANY_RENDER_CLIPS', '单次渲染最多支持 12 个视频片段。')

  const globalTrimStart = body.trimStart ?? settings.trimStart
  const globalTrimEnd = body.trimEnd ?? settings.trimEnd
  const globalSpeed = body.speed ?? settings.speed
  const globalVolume = body.volume ?? settings.volume
  const normalizedClips = await Promise.all(clips.map(async (clip, index) => {
    if (!clip || typeof clip !== 'object') throw new ApiError(400, 'INVALID_RENDER_CLIP', `第 ${index + 1} 个片段格式无效。`)
    const metadata = await readMedia(clip.mediaId || clip.assetId || clip.sourceId)
    const trimStart = boundedNumber(clip.trimStart ?? clip.sourceStart ?? clip.in ?? globalTrimStart, 0, 0, metadata.duration, '片段入点')
    const trimEnd = boundedNumber(clip.trimEnd ?? clip.sourceEnd ?? clip.out ?? globalTrimEnd, metadata.duration, 0, metadata.duration, '片段出点')
    if (trimEnd - trimStart < 0.08) throw new ApiError(400, 'INVALID_TRIM_RANGE', `第 ${index + 1} 个片段的入点必须早于出点。`)
    const speed = boundedNumber(clip.speed ?? globalSpeed, 1, 0.25, 4, '速度')
    const volume = boundedNumber(clip.volume ?? globalVolume, 1, 0, 2, '音量')
    const rawTimelineStart = clip.start ?? clip.timelineStart
    const requestedStart = rawTimelineStart === undefined || rawTimelineStart === null
      ? null
      : boundedNumber(rawTimelineStart, 0, 0, 3600, '片段时间线起点')
    const sourceDuration = trimEnd - trimStart
    return {
      mediaId: metadata.id,
      metadata,
      trimStart,
      trimEnd,
      sourceDuration,
      outputDuration: sourceDuration / speed,
      speed,
      volume,
      requestedStart,
      originalIndex: index,
    }
  }))
  const hasTimelineStarts = normalizedClips.some((clip) => clip.requestedStart !== null)
  const orderedClips = hasTimelineStarts
    ? [...normalizedClips].sort((first, second) => {
      if (first.requestedStart === null) return second.requestedStart === null ? first.originalIndex - second.originalIndex : 1
      if (second.requestedStart === null) return -1
      return first.requestedStart - second.requestedStart || first.originalIndex - second.originalIndex
    })
    : normalizedClips
  let timelineCursor = 0
  for (const clip of orderedClips) {
    const effectiveStart = clip.requestedStart === null ? timelineCursor : Math.max(timelineCursor, clip.requestedStart)
    clip.gapBefore = Math.max(0, effectiveStart - timelineCursor)
    clip.timelineStart = effectiveStart
    timelineCursor = effectiveStart + clip.outputDuration
  }
  const totalDuration = timelineCursor
  if (totalDuration > 3600) throw new ApiError(400, 'RENDER_TOO_LONG', '单次成片时长不能超过 60 分钟。')
  const quality = String(body.quality ?? settings.quality ?? 'standard')
  if (!['preview', 'standard', 'high'].includes(quality)) throw new ApiError(400, 'INVALID_QUALITY', '画质仅支持 preview、standard 或 high。')
  const aspect = aspectDimensions(body.aspect ?? settings.aspect ?? project.aspect, quality)
  const brightness = boundedNumber(body.brightness ?? settings.brightness, 0, -1, 1, '亮度')
  const contrast = boundedNumber(body.contrast ?? settings.contrast, 1, 0.1, 3, '对比度')
  const saturation = boundedNumber(body.saturation ?? settings.saturation, 1, 0, 3, '饱和度')
  const temperature = boundedNumber(body.temperature ?? settings.temperature ?? settings.color?.temperature, 0, -1, 1, '色温')
  const vignette = boundedNumber(body.vignette ?? settings.vignette ?? settings.color?.vignette, 0, 0, 1, '暗角')
  const titleValue = body.title ?? settings.title ?? project.titleOverlay ?? ''
  const title = safeText(titleValue && typeof titleValue === 'object' ? titleValue.text : titleValue, 200, '标题')
  const titleSettings = settings.title && typeof settings.title === 'object' ? settings.title : {}
  const titlePosition = String(body.titlePosition ?? settings.titlePosition ?? titleSettings.position ?? 'top')
  if (!['top', 'center', 'bottom'].includes(titlePosition)) throw new ApiError(400, 'INVALID_TITLE_POSITION', '标题位置仅支持 top、center 或 bottom。')
  const titleColor = safeHexColor(body.titleColor ?? settings.titleColor ?? titleSettings.color, '#FFFFFF', '标题颜色')
  const accentColor = safeHexColor(body.accentColor ?? settings.accentColor ?? titleSettings.accentColor, '#69E2F5', '强调色')
  const subtitlesValue = firstNonEmpty(
    body.subtitles,
    body.subtitle,
    settings.subtitles,
    settings.subtitle,
    project.subtitles,
    project.captions,
    titleSettings.subtitle,
  )
  const subtitles = normalizeSubtitles(subtitlesValue, totalDuration)
  const fps = boundedNumber(body.fps ?? settings.fps, 30, 24, 60, '帧率')
  if (![24, 25, 30, 50, 60].includes(fps)) throw new ApiError(400, 'INVALID_FPS', '帧率仅支持 24、25、30、50 或 60。')
  return {
    clips: orderedClips,
    totalDuration,
    ...aspect,
    brightness,
    contrast,
    saturation,
    temperature,
    vignette,
    fps,
    quality,
    title,
    titlePosition,
    titleColor,
    accentColor,
    subtitles,
  }
}

const assTime = (seconds) => {
  const value = Math.max(0, seconds)
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  const secs = (value % 60).toFixed(2).padStart(5, '0')
  return `${hours}:${String(minutes).padStart(2, '0')}:${secs}`
}

const assText = (value) => String(value)
  .replace(/\\/g, '＼')
  .replace(/{/g, '｛')
  .replace(/}/g, '｝')
  .replace(/\r\n?|\n/g, '\\N')

const assColor = (hex) => {
  const red = hex.slice(1, 3)
  const green = hex.slice(3, 5)
  const blue = hex.slice(5, 7)
  return `&H00${blue}${green}${red}`
}

const createAssFile = async (job, request) => {
  if (!request.title && !request.subtitles.length) return null
  const titleLayout = {
    top: { alignment: 8, marginV: 58 },
    center: { alignment: 5, marginV: 0 },
    bottom: { alignment: 2, marginV: 126 },
  }[request.titlePosition]
  const lines = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${request.width}`,
    `PlayResY: ${request.height}`,
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Title,Heiti SC,${request.width >= 1000 ? 54 : 46},${assColor(request.titleColor)},&H000000FF,${assColor(request.accentColor)},&HA0000000,-1,0,0,0,100,100,0,0,1,2.4,1,${titleLayout.alignment},60,60,${titleLayout.marginV},1`,
    `Style: Body,Heiti SC,${request.width >= 1000 ? 39 : 34},&H00FFFFFF,&H000000FF,&H0010181F,&HA0000000,-1,0,0,0,100,100,0,0,1,2.2,0,2,52,52,64,1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ]
  if (request.title && request.totalDuration > 0.15) {
    lines.push(`Dialogue: 0,${assTime(0.08)},${assTime(Math.min(3.4, request.totalDuration))},Title,,0,0,0,,${assText(request.title)}`)
  }
  for (const cue of request.subtitles) {
    lines.push(`Dialogue: 0,${assTime(cue.start)},${assTime(cue.end)},Body,,0,0,0,,${assText(cue.text)}`)
  }
  const filePath = join(subtitleDir, `${job.id}.ass`)
  await writeFile(filePath, `${lines.join('\n')}\n`, 'utf8')
  return filePath
}

const atempoFilters = (speed) => {
  const filters = []
  let remaining = speed
  while (remaining > 2.00001) {
    filters.push('atempo=2')
    remaining /= 2
  }
  while (remaining < 0.49999) {
    filters.push('atempo=0.5')
    remaining /= 0.5
  }
  filters.push(`atempo=${remaining.toFixed(5)}`)
  return filters.join(',')
}

const escapeFilterPath = (value) => String(value)
  .replace(/\\/g, '\\\\')
  .replace(/:/g, '\\:')
  .replace(/,/g, '\\,')
  .replace(/'/g, "\\'")

const renderSummary = (request) => ({
  clipCount: request.clips.length,
  duration: roundTime(request.totalDuration),
  gapDuration: roundTime(request.clips.reduce((sum, clip) => sum + clip.gapBefore, 0)),
  aspect: request.aspect,
  width: request.width,
  height: request.height,
  fps: request.fps,
  quality: request.quality,
  temperature: request.temperature,
  vignette: request.vignette,
  title: request.title,
  titlePosition: request.titlePosition,
  titleColor: request.titleColor,
  accentColor: request.accentColor,
})

const publicJob = (job) => ({
  id: job.id,
  status: job.status,
  progress: job.progress,
  createdAt: job.createdAt,
  startedAt: job.startedAt || null,
  completedAt: job.completedAt || null,
  error: job.error || null,
  summary: job.summary,
  downloadUrl: job.status === 'complete' ? `/api/render/${job.id}/download` : null,
})

const buildFfmpegArgs = (request, outputPath, subtitlePath) => {
  const args = ['-y', '-hide_banner', '-loglevel', 'error']
  for (const clip of request.clips) {
    args.push('-ss', clip.trimStart.toFixed(6), '-t', clip.sourceDuration.toFixed(6), '-i', mediaSourcePath(clip.metadata))
  }
  const graph = []
  const concatInputs = []
  request.clips.forEach((clip, index) => {
    if (clip.gapBefore > 0.0005) {
      graph.push(
        `color=c=black:s=${request.width}x${request.height}:r=${request.fps}:d=${clip.gapBefore.toFixed(6)},` +
        `format=yuv420p,setsar=1[vg${index}]`,
      )
      graph.push(
        `anullsrc=r=48000:cl=stereo:d=${clip.gapBefore.toFixed(6)},` +
        `aformat=sample_fmts=fltp:channel_layouts=stereo[ag${index}]`,
      )
      concatInputs.push(`[vg${index}][ag${index}]`)
    }
    const videoFilters = [
      `scale=${request.width}:${request.height}:force_original_aspect_ratio=increase`,
      `crop=${request.width}:${request.height}`,
      'setsar=1',
      `fps=${request.fps}`,
      `eq=brightness=${request.brightness.toFixed(4)}:contrast=${request.contrast.toFixed(4)}:saturation=${request.saturation.toFixed(4)}`,
    ]
    if (Math.abs(request.temperature) > 0.0005) {
      const warmth = request.temperature * 0.13
      videoFilters.push(
        `colorbalance=rs=${warmth.toFixed(5)}:rm=${warmth.toFixed(5)}:rh=${warmth.toFixed(5)}:` +
        `bs=${(-warmth).toFixed(5)}:bm=${(-warmth).toFixed(5)}:bh=${(-warmth).toFixed(5)}:pl=1`,
      )
    }
    if (request.vignette > 0.0005) {
      videoFilters.push(`vignette=angle=${(0.15 + request.vignette * 0.7).toFixed(5)}:eval=init`)
    }
    videoFilters.push('format=yuv420p', `setpts=(PTS-STARTPTS)/${clip.speed.toFixed(5)}`)
    graph.push(`[${index}:v:0]${videoFilters.join(',')}[v${index}]`)
    if (clip.metadata.hasAudio) {
      graph.push(
        `[${index}:a:0]asetpts=PTS-STARTPTS,volume=${clip.volume.toFixed(4)},${atempoFilters(clip.speed)},` +
        `aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a${index}]`,
      )
    } else {
      graph.push(
        `anullsrc=r=48000:cl=stereo:d=${clip.outputDuration.toFixed(6)},` +
        `volume=${clip.volume.toFixed(4)},aformat=sample_fmts=fltp:channel_layouts=stereo[a${index}]`,
      )
    }
    concatInputs.push(`[v${index}][a${index}]`)
  })
  graph.push(`${concatInputs.join('')}concat=n=${concatInputs.length}:v=1:a=1[vc][aout]`)
  graph.push(subtitlePath ? `[vc]ass=${escapeFilterPath(subtitlePath)}[vout]` : '[vc]null[vout]')
  const encoding = request.quality === 'preview'
    ? { preset: 'veryfast', crf: '28' }
    : request.quality === 'high' ? { preset: 'slow', crf: '18' } : { preset: 'medium', crf: '22' }
  args.push(
    '-filter_complex', graph.join(';'),
    '-map', '[vout]', '-map', '[aout]',
    '-c:v', 'libx264', '-preset', encoding.preset, '-crf', encoding.crf,
    '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', request.totalDuration.toFixed(6), '-movflags', '+faststart',
    '-progress', 'pipe:1', '-nostats', outputPath,
  )
  return args
}

const runRenderJob = async (job) => {
  job.status = 'rendering'
  job.startedAt = new Date().toISOString()
  const outputPath = join(renderDir, `${job.id}.mp4`)
  job.outputPath = outputPath
  let subtitlePath = null
  try {
    subtitlePath = await createAssFile(job, job.request)
    if (job.cancelRequested) throw new ApiError(499, 'RENDER_CANCELLED', '渲染已取消。')
    const args = buildFfmpegArgs(job.request, outputPath, subtitlePath)
    await new Promise((resolveRender, rejectRender) => {
      const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })
      job.process = child
      let stderr = ''
      let progressBuffer = ''
      let settled = false
      const finish = (error) => {
        if (settled) return
        settled = true
        job.process = null
        error ? rejectRender(error) : resolveRender()
      }
      child.stdout.on('data', (chunk) => {
        progressBuffer += chunk.toString()
        const lines = progressBuffer.split(/\r?\n/)
        progressBuffer = lines.pop() || ''
        for (const line of lines) {
          const match = line.match(/^(?:out_time_us|out_time_ms)=(\d+)$/)
          if (match) {
            const seconds = Number(match[1]) / 1_000_000
            job.progress = Math.max(job.progress, Math.min(99, Math.round((seconds / job.request.totalDuration) * 100)))
          }
        }
      })
      child.stderr.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-24_000) })
      child.once('error', finish)
      child.once('close', (code, signal) => {
        if (job.cancelRequested) return finish(new ApiError(499, 'RENDER_CANCELLED', '渲染已取消。'))
        if (code === 0) return finish()
        const detail = stderr.trim().split('\n').slice(-8).join('\n')
        finish(new Error(`ffmpeg exited with ${code ?? signal}: ${detail}`))
      })
    })
    const outputStat = await stat(outputPath)
    if (!outputStat.size) throw new Error('ffmpeg produced an empty file')
    job.status = 'complete'
    job.progress = 100
    job.completedAt = new Date().toISOString()
  } catch (error) {
    if (job.cancelRequested || error?.code === 'RENDER_CANCELLED') {
      job.status = 'cancelled'
      job.error = null
    } else {
      console.error(`Render ${job.id} failed:`, error?.message)
      job.status = 'failed'
      job.error = '渲染失败，请检查素材编码或调整剪辑参数后重试。'
      job.internalError = String(error?.message || error).slice(-2000)
    }
    job.completedAt = new Date().toISOString()
    await unlink(outputPath).catch(() => {})
  } finally {
    if (subtitlePath) await unlink(subtitlePath).catch(() => {})
  }
}

const pumpRenderQueue = () => {
  while (activeRenders < 1 && renderQueue.length) {
    const job = renderQueue.shift()
    if (!job || job.status !== 'queued') continue
    activeRenders += 1
    runRenderJob(job).finally(() => {
      activeRenders -= 1
      pumpRenderQueue()
    })
  }
}

app.use(express.json({ limit: '1mb' }))

app.get('/api/status', (_request, response) => {
  response.json({
    provider: 'DeepSeek',
    configured: Boolean(process.env.DEEPSEEK_API_KEY),
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
    renderer: {
      engine: 'FFmpeg',
      ...rendererHealth,
      formats: ['16:9', '9:16', '1:1', '4:3', '4:5'],
      maxUploadBytes: MAX_UPLOAD_BYTES,
    },
  })
})

app.get('/api/media', async (_request, response) => {
  const files = await readdir(mediaDir)
  const ids = files
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.slice(0, -5))
    .filter((id) => UUID_PATTERN.test(id))
  const results = await Promise.all(ids.map(async (id) => {
    try {
      return publicMedia(await readMedia(id))
    } catch {
      return null
    }
  }))
  response.json({ media: results.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) })
})

app.post('/api/media', express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }), async (request, response) => {
  requireRenderer()
  if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
    return apiError(response, 400, 'EMPTY_UPLOAD', '请选择一个有效的视频文件。')
  }
  const requestedType = String(request.get('x-file-type') || request.get('content-type') || 'application/octet-stream')
    .split(';')[0]
    .trim()
    .toLowerCase()
  if (!/^video\/[a-z0-9.+-]{1,64}$/.test(requestedType) && requestedType !== 'application/octet-stream') {
    return apiError(response, 415, 'UNSUPPORTED_MEDIA_TYPE', '目前仅支持视频素材。')
  }
  const name = safeFileName(decodeFileName(request.headers['x-file-name']))
  const extension = extname(name).toLowerCase() || '.mp4'
  if (!MEDIA_EXTENSIONS.has(extension)) {
    return apiError(response, 415, 'UNSUPPORTED_FILE_EXTENSION', '支持 MP4、MOV、M4V、WebM、MKV、AVI、MPEG 和 TS 视频。')
  }
  const id = randomUUID()
  const sourcePath = join(mediaDir, `${id}${extension}`)
  try {
    await writeFile(sourcePath, request.body, { flag: 'wx' })
    const probe = await probeMedia(sourcePath)
    const metadata = {
      id,
      extension,
      name,
      type: requestedType === 'application/octet-stream' ? 'video/*' : requestedType,
      size: request.body.length,
      createdAt: new Date().toISOString(),
      ...probe,
    }
    await writeFile(mediaMetaPath(id), JSON.stringify(metadata, null, 2), { encoding: 'utf8', flag: 'wx' })
    mediaCache.set(id, metadata)
    response.status(201).json({ media: publicMedia(metadata) })
  } catch (error) {
    await Promise.allSettled([unlink(sourcePath), unlink(mediaMetaPath(id))])
    if (error instanceof ApiError) throw error
    console.error('Media upload failed:', error?.message)
    throw new ApiError(415, 'MEDIA_PROBE_FAILED', '视频无法解析，请确认文件未损坏且编码受 FFmpeg 支持。')
  }
})

app.get('/api/media/:id', async (request, response) => {
  const metadata = await readMedia(request.params.id)
  response.json({ media: publicMedia(metadata) })
})

app.get('/api/media/:id/file', async (request, response, next) => {
  try {
    const metadata = await readMedia(request.params.id)
    response.type(metadata.type === 'video/*' ? 'video/mp4' : metadata.type)
    response.set('Content-Disposition', `inline; filename="${metadata.id}${metadata.extension}"`)
    response.sendFile(mediaSourcePath(metadata), (error) => {
      if (error && !response.headersSent) next(error)
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/media/:id/analyze', async (request, response) => {
  requireRenderer()
  const metadata = await readMedia(request.params.id)
  if (metadata.analysis && request.query.refresh !== '1') return response.json({ analysis: metadata.analysis })
  try {
    const analysis = await analyzeMedia(metadata)
    metadata.analysis = analysis
    await writeFile(mediaMetaPath(metadata.id), JSON.stringify(metadata, null, 2), 'utf8')
    mediaCache.set(metadata.id, metadata)
    response.json({ analysis })
  } catch (error) {
    console.error(`Media analysis ${metadata.id} failed:`, error?.message)
    throw new ApiError(422, 'MEDIA_ANALYSIS_FAILED', '素材分析失败，但仍可继续手动剪辑和渲染。')
  }
})

app.delete('/api/media/:id', async (request, response) => {
  const metadata = await readMedia(request.params.id)
  if (metadata.builtIn === true) {
    return apiError(response, 403, 'BUILT_IN_MEDIA', '这是演示素材，不能从素材库中删除。')
  }
  const isRendering = [...renderJobs.values()].some((job) =>
    (job.status === 'queued' || job.status === 'rendering') && job.request.clips.some((clip) => clip.mediaId === metadata.id),
  )
  if (isRendering) return apiError(response, 409, 'MEDIA_IN_USE', '这个素材正在渲染，完成或取消任务后才能删除。')
  await Promise.allSettled([unlink(mediaSourcePath(metadata)), unlink(mediaMetaPath(metadata.id))])
  mediaCache.delete(metadata.id)
  response.json({ ok: true, id: metadata.id })
})

app.get('/api/render', (_request, response) => {
  const jobs = [...renderJobs.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50)
    .map(publicJob)
  response.json({ jobs })
})

app.post('/api/render', async (request, response) => {
  requireRenderer()
  const normalized = await normalizeRenderRequest(request.body)
  const job = {
    id: randomUUID(),
    status: 'queued',
    progress: 0,
    createdAt: new Date().toISOString(),
    request: normalized,
    summary: renderSummary(normalized),
    cancelRequested: false,
  }
  renderJobs.set(job.id, job)
  renderQueue.push(job)
  pumpRenderQueue()
  response.status(202).json({ job: publicJob(job) })
})

app.get('/api/render/:id', (request, response) => {
  const id = safeId(request.params.id)
  const job = renderJobs.get(id)
  if (!job) return apiError(response, 404, 'RENDER_NOT_FOUND', '没有找到这个渲染任务。')
  response.json({ job: publicJob(job) })
})

app.delete('/api/render/:id', async (request, response) => {
  const id = safeId(request.params.id)
  const job = renderJobs.get(id)
  if (!job) return apiError(response, 404, 'RENDER_NOT_FOUND', '没有找到这个渲染任务。')
  if (job.status === 'complete') return apiError(response, 409, 'RENDER_ALREADY_COMPLETE', '成片已经完成，无需取消。')
  if (job.status === 'failed' || job.status === 'cancelled') return response.json({ job: publicJob(job) })
  job.cancelRequested = true
  if (job.status === 'queued') {
    const queueIndex = renderQueue.findIndex((queued) => queued.id === id)
    if (queueIndex >= 0) renderQueue.splice(queueIndex, 1)
    job.status = 'cancelled'
    job.completedAt = new Date().toISOString()
  } else {
    job.status = 'cancelled'
    job.completedAt = new Date().toISOString()
    job.process?.kill('SIGTERM')
  }
  response.json({ job: publicJob(job) })
})

app.get('/api/render/:id/download', async (request, response) => {
  const id = safeId(request.params.id)
  const job = renderJobs.get(id)
  if (!job) return apiError(response, 404, 'RENDER_NOT_FOUND', '没有找到这个渲染任务。')
  if (job.status !== 'complete' || !job.outputPath) return apiError(response, 409, 'RENDER_NOT_READY', '成片还没有准备好。')
  try {
    await stat(job.outputPath)
    response.download(job.outputPath, `axiom-cut-${id.slice(0, 8)}.mp4`)
  } catch {
    throw new ApiError(410, 'RENDER_FILE_GONE', '渲染文件已经被系统清理，请重新生成。')
  }
})

const fallbackPlan = (prompt) => {
  const isGolden = /黄金|golden/i.test(prompt)
  const isPythagoras = /勾股|pythag/i.test(prompt)
  const isMath = isGolden || isPythagoras || /数学|公式|导数|几何|math|equation/i.test(prompt)
  const isProduct = /产品|发布|品牌|广告|product|brand/i.test(prompt)
  const isVlog = /vlog|旅行|探店|日常|口播/i.test(prompt)
  return {
    projectTitle: isGolden ? '黄金分割 · 生长秩序' : isPythagoras ? '勾股定理 · 面积证明' : isMath ? '代码数学动画' : isProduct ? '产品发布短片' : isVlog ? '叙事 Vlog 精剪' : '代码驱动剪辑',
    summary: prompt.slice(0, 88),
    accent: isGolden ? '#f4d35e' : isPythagoras ? '#83c78f' : isMath ? '#64d8ef' : '#ff6b55',
    equation: isGolden ? 'φ = (1 + √5) / 2' : isPythagoras ? 'a² + b² = c²' : isMath ? "f'(x) = lim Δy / Δx" : 'speed × clarity',
    category: isMath ? '数学动画' : isProduct ? '产品短片' : isVlog ? 'Vlog' : '通用视频',
    renderEngine: isMath ? 'React SVG + frame()' : 'Video + SVG Overlay',
    steps: [
      { id: '01', title: '理解素材', detail: '识别主体、语义和可用镜头', tool: 'analyze()', duration: '0.4s' },
      { id: '02', title: '建立节奏', detail: '把叙事拆成确定性时间段', tool: 'sequence()', duration: '0.7s' },
      { id: '03', title: '生成图层', detail: '用 SVG / CSS 构建标题与图形', tool: 'compose()', duration: '1.1s' },
      { id: '04', title: '编排运动', detail: '写入关键帧、缓动和转场', tool: 'animate()', duration: '0.9s' },
      { id: '05', title: '静态检查', detail: '检查遮挡、越界和阅读时长', tool: 'inspect()', duration: '0.5s' },
      { id: '06', title: '锁定工程', detail: '输出可复现的场景配置', tool: 'serialize()', duration: '0.3s' },
    ],
    demo: true,
    model: 'Local demo',
  }
}

const nextVersion = (version = 'v1.0') => {
  const match = String(version).match(/v(\d+)\.(\d+)/i)
  if (!match) return 'v1.1'
  return `v${match[1]}.${Number(match[2]) + 1}`
}

const fallbackEvolution = (prompt, plan, previousEvolution = {}) => {
  const previousVersion = previousEvolution.version || 'v1.0'
  const previousScore = Number(previousEvolution.score) || 78.6
  const generation = Math.max(1, Number(nextVersion(previousVersion).split('.')[1]))
  const gain = Math.max(2.4, 13.8 - generation * 1.7)
  const score = Math.min(96.8, Number((previousScore + gain).toFixed(1)))
  const baseMetrics = Array.isArray(previousEvolution.metrics) && previousEvolution.metrics.length === 4
    ? previousEvolution.metrics.map((item) => Number(item.value) || 78)
    : [82, 79, 74, 80]
  const evolvedMetrics = [
    { label: '叙事清晰度', value: Math.min(98, baseMetrics[0] + 10), previous: baseMetrics[0] },
    { label: '构图平衡', value: Math.min(97, baseMetrics[1] + 13), previous: baseMetrics[1] },
    { label: '节奏控制', value: Math.min(95, baseMetrics[2] + 12), previous: baseMetrics[2] },
    { label: '视觉连续性', value: Math.min(98, baseMetrics[3] + 11), previous: baseMetrics[3] },
  ]
  const isGolden = /黄金|golden/i.test(prompt)
  const isPythagoras = /勾股|pythag/i.test(prompt)
  const accent = isGolden ? '#ffd86a' : isPythagoras ? '#91dda0' : '#67d7ed'
  return {
    version: nextVersion(previousVersion),
    previousVersion,
    score,
    previousScore,
    delta: Number((score - previousScore).toFixed(1)),
    metrics: evolvedMetrics,
    mutations: [
      { id: 'μ-01', title: '强化视觉锚点', detail: '让核心几何对象先于公式出现，降低首屏认知负担。', expectedGain: '+8.4', selected: true },
      { id: 'μ-02', title: '提高运动密度', detail: '缩短停顿并增加轨迹残影，节奏更有冲击力。', expectedGain: '+5.1', selected: false },
      { id: 'μ-03', title: '公式分步显影', detail: '按推导顺序拆分公式，但会增加整体时长。', expectedGain: '+4.6', selected: false },
    ],
    rationale: 'μ-01 同时提高叙事清晰度和构图平衡，且不改变原有 18 秒节奏，因此被选为本轮最优变体。',
    memory: ['核心对象先出现，再给出符号解释', '深色背景 + 蓝黄高对比标注', '每个结论至少保留 1.2 秒阅读时间'],
    evolvedPlan: {
      ...plan,
      summary: `${String(plan.summary || prompt).replace(/[。.]$/, '')}；核心对象提前 12 帧，公式按视觉锚点同步显影。`,
      accent,
    },
    demo: true,
  }
}

const systemPrompt = `你是一个代码驱动视频剪辑导演 Agent。你可以处理产品短片、Vlog、知识讲解、数学动画和用户上传的视频素材。根据需求生成可执行计划，只输出 JSON。
JSON 格式必须是：
{
  "projectTitle": "不超过16字的中文标题",
  "summary": "不超过80字的中文方案摘要",
  "accent": "#58c4dd 形式的十六进制颜色",
  "equation": "数学任务填写核心公式，非数学任务填写核心视觉概念",
  "category": "数学动画/产品短片/Vlog/知识讲解/通用视频之一",
  "renderEngine": "React SVG + frame() 或 Video + SVG Overlay",
  "steps": [{"id":"01","title":"步骤名","detail":"一句具体动作","tool":"单个英文工具名","duration":"0.8s"}]
}
steps 必须恰好 6 项，依次覆盖：理解素材、建立节奏、生成代码图层、编排运动、静态检查、锁定工程。模型只负责规划和参数，不得声称生成了像素或视频文件。不要输出 markdown。`

const evolutionSystemPrompt = `你是代码剪辑 Agent 的视觉评审与自进化模块。你要评估当前方案并进行一轮“变异-选择-记忆”，只输出 JSON。
JSON 格式：
{
  "score": 92.4,
  "metrics": [{"label":"叙事清晰度","value":94,"previous":82}],
  "mutations": [{"id":"μ-01","title":"变体名","detail":"具体改动","expectedGain":"+8.4","selected":true}],
  "rationale": "选择最优变体的理由",
  "memory": ["可复用的项目偏好"],
  "improvedSummary": "应用最优变体后的方案摘要",
  "accent": "#67d7ed"
}
metrics 必须恰好包含叙事清晰度、构图平衡、节奏控制、视觉连续性 4 项；mutations 必须恰好 3 项且仅 1 项 selected=true；所有分数范围 0-100。不要输出 markdown。`

app.post('/api/plan', async (request, response) => {
  const prompt = typeof request.body?.prompt === 'string' ? request.body.prompt.trim() : ''
  if (!prompt) return response.status(400).json({ error: '请先描述你想制作的动画。' })
  if (prompt.length > 2000) return response.status(400).json({ error: '指令请控制在 2000 字以内。' })

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return response.json(fallbackPlan(prompt))

  try {
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'
    const apiResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        thinking: { type: 'disabled' },
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 1200,
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!apiResponse.ok) {
      const detail = await apiResponse.text()
      console.error('DeepSeek API error:', apiResponse.status, detail.slice(0, 500))
      return response.status(502).json({ error: `DeepSeek 请求失败（${apiResponse.status}）` })
    }
    const completion = await apiResponse.json()
    const content = completion.choices?.[0]?.message?.content
    const plan = JSON.parse(content)
    if (!Array.isArray(plan.steps) || plan.steps.length !== 6) throw new Error('Invalid plan shape')
    response.json({ ...plan, demo: false, model })
  } catch (error) {
    console.error('Plan generation error:', error)
    response.status(502).json({ error: 'DeepSeek 暂时没有返回有效计划，请稍后重试。' })
  }
})

app.post('/api/evolve', async (request, response) => {
  const prompt = typeof request.body?.prompt === 'string' ? request.body.prompt.trim() : ''
  const plan = request.body?.plan
  const previousEvolution = request.body?.previousEvolution || {}
  if (!prompt || !plan || !Array.isArray(plan.steps)) return response.status(400).json({ error: '缺少可进化的剪辑计划。' })

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return response.json(fallbackEvolution(prompt, plan, previousEvolution))

  try {
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'
    const previousVersion = previousEvolution.version || 'v1.0'
    const previousScore = Number(previousEvolution.score) || 78.6
    const apiResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        thinking: { type: 'disabled' },
        messages: [
          { role: 'system', content: evolutionSystemPrompt },
          { role: 'user', content: JSON.stringify({ brief: prompt, currentPlan: plan, previousScore, previousMetrics: previousEvolution.metrics || [] }) },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1600,
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!apiResponse.ok) {
      const detail = await apiResponse.text()
      console.error('DeepSeek evolution error:', apiResponse.status, detail.slice(0, 500))
      return response.status(502).json({ error: `DeepSeek 自进化请求失败（${apiResponse.status}）` })
    }
    const completion = await apiResponse.json()
    const result = JSON.parse(completion.choices?.[0]?.message?.content)
    if (!Array.isArray(result.metrics) || result.metrics.length !== 4 || !Array.isArray(result.mutations) || result.mutations.length !== 3) throw new Error('Invalid evolution shape')
    const score = Math.max(previousScore, Math.min(100, Number(result.score) || previousScore))
    response.json({
      version: nextVersion(previousVersion),
      previousVersion,
      score,
      previousScore,
      delta: Number((score - previousScore).toFixed(1)),
      metrics: result.metrics,
      mutations: result.mutations,
      rationale: result.rationale,
      memory: result.memory,
      evolvedPlan: { ...plan, summary: result.improvedSummary || plan.summary, accent: result.accent || plan.accent, demo: false, model },
      demo: false,
    })
  } catch (error) {
    console.error('Evolution error:', error)
    response.status(502).json({ error: 'DeepSeek 暂时没有返回有效的进化结果，请稍后重试。' })
  }
})

app.use('/api', (_request, response) => apiError(response, 404, 'API_NOT_FOUND', '这个接口不存在。'))

app.use((error, request, response, next) => {
  if (response.headersSent) return next(error)
  if (error?.type === 'entity.too.large' || error?.status === 413) {
    const isMediaUpload = request.path === '/api/media'
    return apiError(
      response,
      413,
      isMediaUpload ? 'UPLOAD_TOO_LARGE' : 'REQUEST_TOO_LARGE',
      isMediaUpload ? '单个素材不能超过 500MB。' : '请求内容过大。',
    )
  }
  if (error?.type === 'entity.parse.failed') {
    return apiError(response, 400, 'INVALID_JSON', '请求中的 JSON 格式无效。')
  }
  if (error instanceof ApiError) return apiError(response, error.status, error.code, error.message)
  if (request.path.startsWith('/api/')) {
    console.error('API error:', error)
    return apiError(response, 500, 'INTERNAL_ERROR', '服务暂时无法完成这个请求。')
  }
  next(error)
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(resolve(root, 'dist')))
  app.get('*splat', (_request, response) => response.sendFile(resolve(root, 'dist/index.html')))
} else {
  const { createServer } = await import('vite')
  const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'spa' })
  app.use(vite.middlewares)
}

export { app, fallbackPlan, fallbackEvolution }

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  app.listen(port, '127.0.0.1', () => {
    console.log(`Axiom Cut is running at http://127.0.0.1:${port}`)
  })
}
