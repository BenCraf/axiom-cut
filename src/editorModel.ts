export type MediaKind = 'video' | 'audio' | 'image'
export type TrackKind = 'video' | 'audio' | 'caption'
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '4:3'

export interface MediaCredit {
  creator: string
  sourceUrl: string
  licenseUrl: string
}

export interface MediaAsset {
  id: string
  name: string
  kind: MediaKind
  mimeType: string
  size: number
  duration: number
  width?: number
  height?: number
  fps?: number
  codec?: string
  hasAudio?: boolean
  /** A durable server route such as /api/media/:id/file. blob: URLs are discarded on save. */
  serverUrl?: string
  thumbnailUrl?: string
  builtIn?: boolean
  collection?: string
  role?: 'source' | 'result'
  credit?: MediaCredit
  status: 'uploading' | 'ready' | 'error'
  createdAt: string
  error?: string
}

export interface ColorAdjustments {
  brightness: number
  contrast: number
  saturation: number
  temperature: number
  vignette: number
}

export interface TitleSettings {
  enabled: boolean
  text: string
  subtitle: string
  position: 'top' | 'center' | 'bottom'
  color: string
  accentColor: string
}

export interface EditSettings {
  aspect: AspectRatio
  width: number
  height: number
  fps: 24 | 25 | 30 | 60
  backgroundColor: string
  title: TitleSettings
  brightness: number
  contrast: number
  saturation: number
  color: ColorAdjustments
}

export interface Clip {
  id: string
  mediaId: string
  name: string
  start: number
  sourceStart: number
  sourceEnd: number
  speed: number
  volume: number
  enabled: boolean
  color: ColorAdjustments
}

export type TimelineClip = Clip

export interface TimelineTrack {
  id: string
  kind: TrackKind
  name: string
  locked: boolean
  muted: boolean
  hidden: boolean
  clips: Clip[]
}

export interface Caption {
  id: string
  start: number
  end: number
  text: string
  speaker?: string
  emphasis?: boolean
}

export interface ProjectSelection {
  mediaId: string | null
  trackId: string | null
  clipId: string | null
  captionId: string | null
}

export interface ProjectSnapshot {
  schemaVersion: 1
  id: string
  name: string
  createdAt: string
  updatedAt: string
  media: MediaAsset[]
  tracks: TimelineTrack[]
  captions: Caption[]
  settings: EditSettings
  selection: ProjectSelection
  playhead: number
}

export interface ProjectVersion {
  id: string
  name: string
  createdAt: string
  snapshot: ProjectSnapshot
}

export interface Project extends ProjectSnapshot {
  versions: ProjectVersion[]
}

export interface CreateProjectOptions {
  id?: string
  name?: string
  now?: string
  aspectRatio?: AspectRatio
}

const DEFAULT_COLOR: ColorAdjustments = {
  brightness: 0,
  contrast: 1,
  saturation: 1,
  temperature: 0,
  vignette: 0,
}

const ASPECT_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '4:3': { width: 1440, height: 1080 },
}

const EMPTY_SELECTION: ProjectSelection = {
  mediaId: null,
  trackId: null,
  clipId: null,
  captionId: null,
}

const makeId = (prefix: string): string => {
  const value = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${value}`
}

const cloneColor = (color: ColorAdjustments): ColorAdjustments => ({ ...color })

const createDefaultSettings = (aspectRatio: AspectRatio): EditSettings => ({
  aspect: aspectRatio,
  ...ASPECT_DIMENSIONS[aspectRatio],
  fps: 30,
  backgroundColor: '#07090c',
  title: {
    enabled: false,
    text: '',
    subtitle: '',
    position: 'bottom',
    color: '#f5f7fa',
    accentColor: '#69e2f5',
  },
  brightness: DEFAULT_COLOR.brightness,
  contrast: DEFAULT_COLOR.contrast,
  saturation: DEFAULT_COLOR.saturation,
  color: cloneColor(DEFAULT_COLOR),
})

export const createDefaultProject = (options: CreateProjectOptions = {}): Project => {
  const now = options.now ?? new Date().toISOString()
  const aspectRatio = options.aspectRatio ?? '16:9'
  return {
    schemaVersion: 1,
    id: options.id ?? makeId('project'),
    name: options.name?.trim() || '未命名剪辑',
    createdAt: now,
    updatedAt: now,
    media: [],
    tracks: [
      { id: 'video-main', kind: 'video', name: '主画面', locked: false, muted: false, hidden: false, clips: [] },
      { id: 'video-overlay', kind: 'video', name: '叠加层', locked: false, muted: false, hidden: false, clips: [] },
      { id: 'audio-main', kind: 'audio', name: '声音', locked: false, muted: false, hidden: false, clips: [] },
      { id: 'caption-main', kind: 'caption', name: '字幕', locked: false, muted: false, hidden: false, clips: [] },
    ],
    captions: [],
    settings: createDefaultSettings(aspectRatio),
    selection: { ...EMPTY_SELECTION },
    playhead: 0,
    versions: [],
  }
}

type ActionTime = { at?: string }

export type ProjectAction =
  | ({ type: 'RENAME_PROJECT'; name: string } & ActionTime)
  | ({ type: 'ADD_MEDIA'; asset: MediaAsset; select?: boolean } & ActionTime)
  | ({ type: 'SYNC_MEDIA'; assets: MediaAsset[] } & ActionTime)
  | ({ type: 'UPDATE_MEDIA'; mediaId: string; patch: Partial<Omit<MediaAsset, 'id'>> } & ActionTime)
  | ({ type: 'REMOVE_MEDIA'; mediaId: string } & ActionTime)
  | ({ type: 'SELECT'; selection: Partial<ProjectSelection> } & ActionTime)
  | ({ type: 'SET_PLAYHEAD'; time: number } & ActionTime)
  | ({ type: 'ADD_TRACK'; track: TimelineTrack } & ActionTime)
  | ({ type: 'UPDATE_TRACK'; trackId: string; patch: Partial<Pick<TimelineTrack, 'name' | 'locked' | 'muted' | 'hidden'>> } & ActionTime)
  | ({ type: 'ADD_CLIP'; trackId: string; clip: Clip; select?: boolean } & ActionTime)
  | ({ type: 'DELETE_CLIP'; clipId: string } & ActionTime)
  | ({ type: 'SPLIT_CLIP'; clipId: string; timelineTime: number; rightClipId: string } & ActionTime)
  | ({ type: 'MOVE_CLIP'; clipId: string; toTrackId: string; start: number } & ActionTime)
  | ({ type: 'UPDATE_TRIM'; clipId: string; sourceStart?: number; sourceEnd?: number } & ActionTime)
  | ({ type: 'UPDATE_SPEED'; clipId: string; speed: number } & ActionTime)
  | ({ type: 'UPDATE_VOLUME'; clipId: string; volume: number } & ActionTime)
  | ({ type: 'UPDATE_COLOR'; color: Partial<ColorAdjustments>; clipId?: string } & ActionTime)
  | ({ type: 'UPDATE_ASPECT'; aspect: AspectRatio } & ActionTime)
  | ({ type: 'UPDATE_TITLE'; title: Partial<TitleSettings> } & ActionTime)
  | ({ type: 'ADD_CAPTION'; caption: Caption; select?: boolean } & ActionTime)
  | ({ type: 'UPDATE_CAPTION'; captionId: string; patch: Partial<Omit<Caption, 'id'>> } & ActionTime)
  | ({ type: 'DELETE_CAPTION'; captionId: string } & ActionTime)
  | ({ type: 'CREATE_VERSION'; version: Pick<ProjectVersion, 'id' | 'name' | 'createdAt'> } & ActionTime)
  | ({ type: 'RESTORE_VERSION'; versionId: string } & ActionTime)
  | ({ type: 'REPLACE_PROJECT'; project: Project } & ActionTime)

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))
const finite = (value: number, fallback = 0): number => Number.isFinite(value) ? value : fallback
const stamp = (project: Project, at?: string): Pick<Project, 'updatedAt'> => ({ updatedAt: at ?? project.updatedAt })
const sortedClips = (clips: Clip[]): Clip[] => [...clips].sort((a, b) => a.start - b.start)
const sortedCaptions = (captions: Caption[]): Caption[] => [...captions].sort((a, b) => a.start - b.start)

const normalizeColor = (base: ColorAdjustments, patch: Partial<ColorAdjustments>): ColorAdjustments => ({
  brightness: clamp(finite(patch.brightness ?? base.brightness), -1, 1),
  contrast: clamp(finite(patch.contrast ?? base.contrast, 1), 0.25, 3),
  saturation: clamp(finite(patch.saturation ?? base.saturation, 1), 0, 3),
  temperature: clamp(finite(patch.temperature ?? base.temperature), -1, 1),
  vignette: clamp(finite(patch.vignette ?? base.vignette), 0, 1),
})

const updateClip = (project: Project, clipId: string, updater: (clip: Clip) => Clip): TimelineTrack[] => project.tracks.map((track) => {
  const index = track.clips.findIndex((clip) => clip.id === clipId)
  if (index < 0) return track
  const clips = [...track.clips]
  clips[index] = updater(clips[index])
  return { ...track, clips: sortedClips(clips) }
})

const normalizeSelection = (
  selection: ProjectSelection,
  media: MediaAsset[],
  tracks: TimelineTrack[],
  captions: Caption[],
): ProjectSelection => {
  const selectedClip = tracks.flatMap((track) => track.clips.map((clip) => ({ clip, trackId: track.id })))
    .find(({ clip }) => clip.id === selection.clipId)
  const mediaIds = new Set(media.map((asset) => asset.id))
  return {
    mediaId: selectedClip
      ? selectedClip.clip.mediaId
      : selection.mediaId && mediaIds.has(selection.mediaId) ? selection.mediaId : null,
    trackId: selectedClip
      ? selectedClip.trackId
      : selection.trackId && tracks.some((track) => track.id === selection.trackId) ? selection.trackId : null,
    clipId: selectedClip?.clip.id ?? null,
    captionId: selection.captionId && captions.some((caption) => caption.id === selection.captionId) ? selection.captionId : null,
  }
}

const withoutMediaFromSnapshot = (snapshot: ProjectSnapshot, mediaId: string): ProjectSnapshot => {
  const media = snapshot.media.filter((asset) => asset.id !== mediaId)
  const tracks = snapshot.tracks.map((track) => ({
    ...track,
    clips: track.clips.filter((clip) => clip.mediaId !== mediaId),
  }))
  return {
    ...snapshot,
    media,
    tracks,
    selection: normalizeSelection(snapshot.selection, media, tracks, snapshot.captions),
  }
}

const snapshotProject = (project: Project): ProjectSnapshot => {
  const media = project.media.map((asset) => ({ ...asset }))
  const tracks = project.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((clip) => ({ ...clip, color: cloneColor(clip.color) })),
  }))
  const captions = project.captions.map((caption) => ({ ...caption }))
  return {
    schemaVersion: 1,
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    media,
    tracks,
    captions,
    settings: {
      ...project.settings,
      title: { ...project.settings.title },
      color: cloneColor(project.settings.color),
    },
    selection: normalizeSelection(project.selection, media, tracks, captions),
    playhead: project.playhead,
  }
}

export const projectDuration = (project: Project): number => {
  const clipEnd = project.tracks.flatMap((track) => track.clips).reduce((end, clip) => {
    const duration = Math.max(0, clip.sourceEnd - clip.sourceStart) / Math.max(0.01, clip.speed)
    return Math.max(end, clip.start + duration)
  }, 0)
  const captionEnd = project.captions.reduce((end, caption) => Math.max(end, caption.end), 0)
  return Math.max(clipEnd, captionEnd)
}

export const findClip = (project: Project, clipId: string): { track: TimelineTrack; clip: Clip } | null => {
  for (const track of project.tracks) {
    const clip = track.clips.find((candidate) => candidate.id === clipId)
    if (clip) return { track, clip }
  }
  return null
}

export const projectReducer = (project: Project, action: ProjectAction): Project => {
  switch (action.type) {
    case 'RENAME_PROJECT': {
      const name = action.name.trim()
      return name && name !== project.name ? { ...project, name, ...stamp(project, action.at) } : project
    }
    case 'ADD_MEDIA': {
      if (project.media.some((asset) => asset.id === action.asset.id)) return project
      return {
        ...project,
        media: [...project.media, { ...action.asset }],
        selection: action.select ? { ...project.selection, mediaId: action.asset.id } : project.selection,
        ...stamp(project, action.at),
      }
    }
    case 'SYNC_MEDIA': {
      const knownIds = new Set(project.media.map((asset) => asset.id))
      const missing = action.assets.filter((asset) => {
        if (knownIds.has(asset.id)) return false
        knownIds.add(asset.id)
        return true
      })
      if (!missing.length) return project
      return { ...project, media: [...project.media, ...missing.map((asset) => ({ ...asset }))] }
    }
    case 'UPDATE_MEDIA': {
      if (!project.media.some((asset) => asset.id === action.mediaId)) return project
      return {
        ...project,
        media: project.media.map((asset) => asset.id === action.mediaId ? { ...asset, ...action.patch, id: asset.id } : asset),
        ...stamp(project, action.at),
      }
    }
    case 'REMOVE_MEDIA': {
      if (!project.media.some((asset) => asset.id === action.mediaId)) return project
      const media = project.media.filter((asset) => asset.id !== action.mediaId)
      const tracks = project.tracks.map((track) => ({ ...track, clips: track.clips.filter((clip) => clip.mediaId !== action.mediaId) }))
      return {
        ...project,
        media,
        tracks,
        selection: normalizeSelection(project.selection, media, tracks, project.captions),
        versions: project.versions.map((version) => ({
          ...version,
          snapshot: withoutMediaFromSnapshot(version.snapshot, action.mediaId),
        })),
        ...stamp(project, action.at),
      }
    }
    case 'SELECT':
      return { ...project, selection: { ...project.selection, ...action.selection } }
    case 'SET_PLAYHEAD': {
      const playhead = clamp(finite(action.time), 0, Math.max(projectDuration(project), 0))
      return playhead === project.playhead ? project : { ...project, playhead }
    }
    case 'ADD_TRACK': {
      if (project.tracks.some((track) => track.id === action.track.id)) return project
      return { ...project, tracks: [...project.tracks, { ...action.track, clips: [...action.track.clips] }], ...stamp(project, action.at) }
    }
    case 'UPDATE_TRACK': {
      if (!project.tracks.some((track) => track.id === action.trackId)) return project
      return {
        ...project,
        tracks: project.tracks.map((track) => track.id === action.trackId ? { ...track, ...action.patch, id: track.id, kind: track.kind, clips: track.clips } : track),
        ...stamp(project, action.at),
      }
    }
    case 'ADD_CLIP': {
      const target = project.tracks.find((track) => track.id === action.trackId)
      if (!target || target.locked || target.kind === 'caption' || findClip(project, action.clip.id) || !project.media.some((asset) => asset.id === action.clip.mediaId)) return project
      const clip: Clip = {
        ...action.clip,
        start: Math.max(0, finite(action.clip.start)),
        sourceStart: Math.max(0, finite(action.clip.sourceStart)),
        sourceEnd: Math.max(action.clip.sourceStart + 0.01, finite(action.clip.sourceEnd, action.clip.sourceStart + 0.01)),
        speed: clamp(finite(action.clip.speed, 1), 0.25, 4),
        volume: clamp(finite(action.clip.volume, 1), 0, 2),
        color: normalizeColor(DEFAULT_COLOR, action.clip.color),
      }
      return {
        ...project,
        tracks: project.tracks.map((track) => track.id === action.trackId ? { ...track, clips: sortedClips([...track.clips, clip]) } : track),
        selection: action.select ? { ...project.selection, trackId: action.trackId, clipId: clip.id } : project.selection,
        ...stamp(project, action.at),
      }
    }
    case 'DELETE_CLIP': {
      const located = findClip(project, action.clipId)
      if (!located || located.track.locked) return project
      return {
        ...project,
        tracks: project.tracks.map((track) => ({ ...track, clips: track.clips.filter((clip) => clip.id !== action.clipId) })),
        selection: project.selection.clipId === action.clipId ? { ...project.selection, clipId: null } : project.selection,
        ...stamp(project, action.at),
      }
    }
    case 'SPLIT_CLIP': {
      const located = findClip(project, action.clipId)
      if (!located || located.track.locked || findClip(project, action.rightClipId)) return project
      const { clip } = located
      const timelineEnd = clip.start + (clip.sourceEnd - clip.sourceStart) / clip.speed
      if (action.timelineTime <= clip.start + 0.01 || action.timelineTime >= timelineEnd - 0.01) return project
      const sourceSplit = clip.sourceStart + (action.timelineTime - clip.start) * clip.speed
      const left = { ...clip, sourceEnd: sourceSplit }
      const right = { ...clip, id: action.rightClipId, name: `${clip.name} B`, start: action.timelineTime, sourceStart: sourceSplit }
      return {
        ...project,
        tracks: project.tracks.map((track) => track.id === located.track.id
          ? { ...track, clips: sortedClips(track.clips.flatMap((candidate) => candidate.id === clip.id ? [left, right] : [candidate])) }
          : track),
        selection: { ...project.selection, trackId: located.track.id, clipId: right.id },
        ...stamp(project, action.at),
      }
    }
    case 'MOVE_CLIP': {
      const located = findClip(project, action.clipId)
      const target = project.tracks.find((track) => track.id === action.toTrackId)
      if (!located || !target || located.track.locked || target.locked || target.kind === 'caption') return project
      const asset = project.media.find((item) => item.id === located.clip.mediaId)
      if (!asset || (asset.kind === 'audio' && target.kind !== 'audio')) return project
      const moved = { ...located.clip, start: Math.max(0, finite(action.start)) }
      return {
        ...project,
        tracks: project.tracks.map((track) => {
          const without = track.clips.filter((clip) => clip.id !== action.clipId)
          return track.id === target.id ? { ...track, clips: sortedClips([...without, moved]) } : without.length === track.clips.length ? track : { ...track, clips: without }
        }),
        selection: { ...project.selection, trackId: target.id, clipId: moved.id },
        ...stamp(project, action.at),
      }
    }
    case 'UPDATE_TRIM': {
      const located = findClip(project, action.clipId)
      if (!located || located.track.locked) return project
      const asset = project.media.find((item) => item.id === located.clip.mediaId)
      const maximum = Math.max(0.01, asset?.duration ?? located.clip.sourceEnd)
      const nextStart = clamp(finite(action.sourceStart ?? located.clip.sourceStart), 0, maximum - 0.01)
      const nextEnd = clamp(finite(action.sourceEnd ?? located.clip.sourceEnd, maximum), nextStart + 0.01, maximum)
      return { ...project, tracks: updateClip(project, action.clipId, (clip) => ({ ...clip, sourceStart: nextStart, sourceEnd: nextEnd })), ...stamp(project, action.at) }
    }
    case 'UPDATE_SPEED': {
      const located = findClip(project, action.clipId)
      if (!located || located.track.locked) return project
      return { ...project, tracks: updateClip(project, action.clipId, (clip) => ({ ...clip, speed: clamp(finite(action.speed, 1), 0.25, 4) })), ...stamp(project, action.at) }
    }
    case 'UPDATE_VOLUME': {
      const located = findClip(project, action.clipId)
      if (!located || located.track.locked) return project
      return { ...project, tracks: updateClip(project, action.clipId, (clip) => ({ ...clip, volume: clamp(finite(action.volume, 1), 0, 2) })), ...stamp(project, action.at) }
    }
    case 'UPDATE_COLOR': {
      if (action.clipId) {
        const located = findClip(project, action.clipId)
        if (!located || located.track.locked) return project
        return { ...project, tracks: updateClip(project, action.clipId, (clip) => ({ ...clip, color: normalizeColor(clip.color, action.color) })), ...stamp(project, action.at) }
      }
      const color = normalizeColor(project.settings.color, action.color)
      return {
        ...project,
        settings: { ...project.settings, color, brightness: color.brightness, contrast: color.contrast, saturation: color.saturation },
        ...stamp(project, action.at),
      }
    }
    case 'UPDATE_ASPECT': {
      const dimensions = ASPECT_DIMENSIONS[action.aspect]
      return { ...project, settings: { ...project.settings, aspect: action.aspect, ...dimensions }, ...stamp(project, action.at) }
    }
    case 'UPDATE_TITLE':
      return { ...project, settings: { ...project.settings, title: { ...project.settings.title, ...action.title } }, ...stamp(project, action.at) }
    case 'ADD_CAPTION': {
      if (project.captions.some((caption) => caption.id === action.caption.id)) return project
      const start = Math.max(0, finite(action.caption.start))
      const caption = { ...action.caption, start, end: Math.max(start + 0.05, finite(action.caption.end, start + 2)), text: action.caption.text.trim() }
      if (!caption.text) return project
      return {
        ...project,
        captions: sortedCaptions([...project.captions, caption]),
        selection: action.select ? { ...project.selection, captionId: caption.id } : project.selection,
        ...stamp(project, action.at),
      }
    }
    case 'UPDATE_CAPTION': {
      const current = project.captions.find((caption) => caption.id === action.captionId)
      if (!current) return project
      const start = Math.max(0, finite(action.patch.start ?? current.start))
      const end = Math.max(start + 0.05, finite(action.patch.end ?? current.end, start + 2))
      const text = action.patch.text === undefined ? current.text : action.patch.text.trim()
      if (!text) return project
      return {
        ...project,
        captions: sortedCaptions(project.captions.map((caption) => caption.id === action.captionId ? { ...caption, ...action.patch, id: caption.id, start, end, text } : caption)),
        ...stamp(project, action.at),
      }
    }
    case 'DELETE_CAPTION': {
      if (!project.captions.some((caption) => caption.id === action.captionId)) return project
      return {
        ...project,
        captions: project.captions.filter((caption) => caption.id !== action.captionId),
        selection: project.selection.captionId === action.captionId ? { ...project.selection, captionId: null } : project.selection,
        ...stamp(project, action.at),
      }
    }
    case 'CREATE_VERSION': {
      if (project.versions.some((version) => version.id === action.version.id)) return project
      const version: ProjectVersion = { ...action.version, name: action.version.name.trim() || '未命名版本', snapshot: snapshotProject(project) }
      return { ...project, versions: [...project.versions, version].slice(-20), ...stamp(project, action.at) }
    }
    case 'RESTORE_VERSION': {
      const version = project.versions.find((candidate) => candidate.id === action.versionId)
      if (!version) return project
      return { ...snapshotProject({ ...version.snapshot, versions: project.versions }), versions: project.versions, ...stamp(project, action.at) }
    }
    case 'REPLACE_PROJECT':
      return action.project
  }
}

export type HistoryAction = ProjectAction | { type: 'UNDO' } | { type: 'REDO' } | { type: 'RESET_HISTORY'; project: Project }

export interface ProjectHistory {
  past: Project[]
  present: Project
  future: Project[]
  limit: number
}

export const createProjectHistory = (project = createDefaultProject(), limit = 50): ProjectHistory => ({
  past: [],
  present: project,
  future: [],
  limit: clamp(Math.floor(limit), 1, 200),
})

export const createHistory = createProjectHistory

const TRANSIENT_ACTIONS = new Set<ProjectAction['type']>(['SELECT', 'SET_PLAYHEAD', 'SYNC_MEDIA'])

export const projectHistoryReducer = (history: ProjectHistory, action: HistoryAction): ProjectHistory => {
  if (action.type === 'UNDO') {
    const previous = history.past.at(-1)
    return previous ? { ...history, past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] } : history
  }
  if (action.type === 'REDO') {
    const next = history.future[0]
    return next ? { ...history, past: [...history.past, history.present].slice(-history.limit), present: next, future: history.future.slice(1) } : history
  }
  if (action.type === 'RESET_HISTORY') return createProjectHistory(action.project, history.limit)

  const present = projectReducer(history.present, action)
  if (present === history.present) return history
  if (TRANSIENT_ACTIONS.has(action.type)) return { ...history, present }
  return { past: [...history.past, history.present].slice(-history.limit), present, future: [], limit: history.limit }
}

export const historyReducer = projectHistoryReducer

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const stringValue = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback
const numberValue = (value: unknown, fallback = 0): number => typeof value === 'number' && Number.isFinite(value) ? value : fallback
const booleanValue = (value: unknown, fallback = false): boolean => typeof value === 'boolean' ? value : fallback
const safeUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || /^(blob|data|javascript):/i.test(value)) return undefined
  return value.startsWith('/') || /^https?:\/\//i.test(value) ? value : undefined
}

const parseColor = (value: unknown, fallback = DEFAULT_COLOR): ColorAdjustments => {
  const record = isRecord(value) ? value : {}
  return normalizeColor(fallback, {
    brightness: numberValue(record.brightness, fallback.brightness),
    contrast: numberValue(record.contrast, fallback.contrast),
    saturation: numberValue(record.saturation, fallback.saturation),
    temperature: numberValue(record.temperature, fallback.temperature),
    vignette: numberValue(record.vignette, fallback.vignette),
  })
}

const parseAsset = (value: unknown): MediaAsset | null => {
  if (!isRecord(value)) return null
  const id = stringValue(value.id).slice(0, 160)
  const name = stringValue(value.name).slice(0, 500)
  if (!id || !name) return null
  const kind: MediaKind = value.kind === 'audio' || value.kind === 'image' ? value.kind : 'video'
  const status: MediaAsset['status'] = value.status === 'uploading' || value.status === 'error' ? value.status : 'ready'
  return {
    id,
    name,
    kind,
    mimeType: stringValue(value.mimeType, kind === 'audio' ? 'audio/*' : 'video/*').slice(0, 160),
    size: Math.max(0, numberValue(value.size)),
    duration: Math.max(0, numberValue(value.duration)),
    width: value.width === undefined ? undefined : Math.max(0, numberValue(value.width)),
    height: value.height === undefined ? undefined : Math.max(0, numberValue(value.height)),
    fps: value.fps === undefined ? undefined : Math.max(0, numberValue(value.fps)),
    codec: value.codec === undefined ? undefined : stringValue(value.codec).slice(0, 80),
    hasAudio: value.hasAudio === undefined ? undefined : booleanValue(value.hasAudio),
    serverUrl: safeUrl(value.serverUrl),
    thumbnailUrl: safeUrl(value.thumbnailUrl),
    builtIn: value.builtIn === undefined ? undefined : booleanValue(value.builtIn),
    collection: value.collection === undefined ? undefined : stringValue(value.collection).slice(0, 160),
    role: value.role === 'source' || value.role === 'result' ? value.role : undefined,
    credit: isRecord(value.credit)
      && stringValue(value.credit.creator)
      && safeUrl(value.credit.sourceUrl)
      && safeUrl(value.credit.licenseUrl)
      ? {
          creator: stringValue(value.credit.creator).slice(0, 300),
          sourceUrl: safeUrl(value.credit.sourceUrl) as string,
          licenseUrl: safeUrl(value.credit.licenseUrl) as string,
        }
      : undefined,
    status,
    createdAt: stringValue(value.createdAt, new Date(0).toISOString()),
    error: value.error === undefined ? undefined : stringValue(value.error).slice(0, 500),
  }
}

const parseClip = (value: unknown, mediaIds: Set<string>): Clip | null => {
  if (!isRecord(value)) return null
  const id = stringValue(value.id).slice(0, 160)
  const mediaId = stringValue(value.mediaId, stringValue(value.assetId)).slice(0, 160)
  if (!id || !mediaId || !mediaIds.has(mediaId)) return null
  const sourceStart = Math.max(0, numberValue(value.sourceStart))
  return {
    id,
    mediaId,
    name: stringValue(value.name, '片段').slice(0, 500),
    start: Math.max(0, numberValue(value.start, numberValue(value.timelineStart))),
    sourceStart,
    sourceEnd: Math.max(sourceStart + 0.01, numberValue(value.sourceEnd, sourceStart + 1)),
    speed: clamp(numberValue(value.speed, 1), 0.25, 4),
    volume: clamp(numberValue(value.volume, 1), 0, 2),
    enabled: booleanValue(value.enabled, true),
    color: parseColor(value.color),
  }
}

const parseSelection = (value: unknown): ProjectSelection => {
  const record = isRecord(value) ? value : {}
  const nullable = (candidate: unknown): string | null => typeof candidate === 'string' ? candidate.slice(0, 160) : null
  return { mediaId: nullable(record.mediaId ?? record.assetId), trackId: nullable(record.trackId), clipId: nullable(record.clipId), captionId: nullable(record.captionId) }
}

const parseSnapshot = (value: unknown): ProjectSnapshot => {
  const source = isRecord(value) ? value : {}
  const fallback = createDefaultProject({ id: stringValue(source.id) || undefined, name: stringValue(source.name) || undefined, now: stringValue(source.createdAt) || undefined })
  const media = (Array.isArray(source.media) ? source.media : []).map(parseAsset).filter((asset): asset is MediaAsset => asset !== null).slice(0, 500)
  const mediaIds = new Set(media.map((asset) => asset.id))
  const tracks: TimelineTrack[] = (Array.isArray(source.tracks) ? source.tracks : []).flatMap((value): TimelineTrack[] => {
    if (!isRecord(value)) return []
    const id = stringValue(value.id).slice(0, 160)
    if (!id) return []
    const kind: TrackKind = value.kind === 'audio' || value.kind === 'caption' ? value.kind : 'video'
    const clips = (Array.isArray(value.clips) ? value.clips : []).map((clip) => parseClip(clip, mediaIds)).filter((clip): clip is Clip => clip !== null).slice(0, 1000)
    return [{ id, kind, name: stringValue(value.name, '轨道').slice(0, 300), locked: booleanValue(value.locked), muted: booleanValue(value.muted), hidden: booleanValue(value.hidden), clips: sortedClips(clips) }]
  }).slice(0, 100)
  const captions: Caption[] = (Array.isArray(source.captions) ? source.captions : []).flatMap((value): Caption[] => {
    if (!isRecord(value)) return []
    const id = stringValue(value.id).slice(0, 160)
    const text = stringValue(value.text).trim().slice(0, 2000)
    if (!id || !text) return []
    const start = Math.max(0, numberValue(value.start))
    return [{ id, text, start, end: Math.max(start + 0.05, numberValue(value.end, start + 2)), speaker: value.speaker === undefined ? undefined : stringValue(value.speaker).slice(0, 200), emphasis: value.emphasis === undefined ? undefined : booleanValue(value.emphasis) }]
  }).slice(0, 5000)
  const settingsSource = isRecord(source.settings) ? source.settings : {}
  const aspectValue = settingsSource.aspect ?? settingsSource.aspectRatio
  const aspectRatio: AspectRatio = aspectValue === '9:16' || aspectValue === '1:1' || aspectValue === '4:5' || aspectValue === '4:3' ? aspectValue : '16:9'
  const defaults = createDefaultSettings(aspectRatio)
  const titleSource = isRecord(settingsSource.title) ? settingsSource.title : {}
  const position: TitleSettings['position'] = titleSource.position === 'top' || titleSource.position === 'center' ? titleSource.position : 'bottom'
  const fps: EditSettings['fps'] = settingsSource.fps === 24 || settingsSource.fps === 25 || settingsSource.fps === 60 ? settingsSource.fps : 30
  const color = parseColor(settingsSource.color, {
    ...defaults.color,
    brightness: numberValue(settingsSource.brightness, defaults.brightness),
    contrast: numberValue(settingsSource.contrast, defaults.contrast),
    saturation: numberValue(settingsSource.saturation, defaults.saturation),
  })
  const normalizedTracks = tracks.length ? tracks : fallback.tracks
  const selection = normalizeSelection(parseSelection(source.selection), media, normalizedTracks, captions)
  return {
    schemaVersion: 1,
    id: stringValue(source.id, fallback.id).slice(0, 160),
    name: stringValue(source.name, fallback.name).slice(0, 500),
    createdAt: stringValue(source.createdAt, fallback.createdAt),
    updatedAt: stringValue(source.updatedAt, fallback.updatedAt),
    media,
    tracks: normalizedTracks,
    captions: sortedCaptions(captions),
    settings: {
      aspect: aspectRatio,
      width: clamp(numberValue(settingsSource.width, defaults.width), 64, 7680),
      height: clamp(numberValue(settingsSource.height, defaults.height), 64, 7680),
      fps,
      backgroundColor: stringValue(settingsSource.backgroundColor, defaults.backgroundColor).slice(0, 80),
      color,
      brightness: color.brightness,
      contrast: color.contrast,
      saturation: color.saturation,
      title: {
        enabled: booleanValue(titleSource.enabled),
        text: stringValue(titleSource.text).slice(0, 1000),
        subtitle: stringValue(titleSource.subtitle).slice(0, 2000),
        position,
        color: stringValue(titleSource.color, defaults.title.color).slice(0, 80),
        accentColor: stringValue(titleSource.accentColor, defaults.title.accentColor).slice(0, 80),
      },
    },
    selection,
    playhead: Math.max(0, numberValue(source.playhead)),
  }
}

const parseProject = (value: unknown): Project => {
  const source = isRecord(value) ? value : {}
  const snapshot = parseSnapshot(source)
  const versions: ProjectVersion[] = (Array.isArray(source.versions) ? source.versions : []).flatMap((value): ProjectVersion[] => {
    if (!isRecord(value) || !isRecord(value.snapshot)) return []
    const id = stringValue(value.id).slice(0, 160)
    if (!id) return []
    return [{ id, name: stringValue(value.name, '历史版本').slice(0, 500), createdAt: stringValue(value.createdAt, snapshot.updatedAt), snapshot: parseSnapshot(value.snapshot) }]
  }).slice(-20)
  return { ...snapshot, versions }
}

export const serializeProject = (project: Project, pretty = false): string => JSON.stringify(parseProject(project), null, pretty ? 2 : undefined)

export const deserializeProject = (json: string): Project => parseProject(JSON.parse(json) as unknown)

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const DEFAULT_PROJECT_STORAGE_KEY = 'axiom-cut.project.v1'

const browserStorage = (): StorageLike | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export const saveProjectToStorage = (project: Project, key = DEFAULT_PROJECT_STORAGE_KEY, storage: StorageLike | null = browserStorage()): boolean => {
  if (!storage) return false
  try {
    storage.setItem(key, serializeProject(project))
    return true
  } catch {
    return false
  }
}

export const loadProjectFromStorage = (key = DEFAULT_PROJECT_STORAGE_KEY, storage: StorageLike | null = browserStorage()): Project | null => {
  if (!storage) return null
  try {
    const value = storage.getItem(key)
    return value ? deserializeProject(value) : null
  } catch {
    return null
  }
}

export const clearProjectFromStorage = (key = DEFAULT_PROJECT_STORAGE_KEY, storage: StorageLike | null = browserStorage()): boolean => {
  if (!storage) return false
  try {
    storage.removeItem(key)
    return true
  } catch {
    return false
  }
}

export const createClip = (asset: MediaAsset, options: Partial<Omit<Clip, 'id' | 'mediaId' | 'name' | 'color'>> & { id?: string; name?: string } = {}): Clip => ({
  id: options.id ?? makeId('clip'),
  mediaId: asset.id,
  name: options.name ?? asset.name,
  start: options.start ?? 0,
  sourceStart: options.sourceStart ?? 0,
  sourceEnd: options.sourceEnd ?? Math.max(asset.duration, 0.01),
  speed: options.speed ?? 1,
  volume: options.volume ?? 1,
  enabled: options.enabled ?? true,
  color: cloneColor(DEFAULT_COLOR),
})

export const createCaption = (start: number, text = '新字幕', id = makeId('caption')): Caption => ({
  id,
  start: Math.max(0, start),
  end: Math.max(0, start) + 2,
  text,
})
