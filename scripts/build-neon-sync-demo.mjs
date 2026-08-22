import { createWriteStream } from 'node:fs'
import { access, mkdir, rename, stat, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = join(root, 'public', 'demo', 'neon-sync')
const libraryDir = join(outputDir, 'library')
const cacheDir = join(tmpdir(), 'axiom-cut-neon-sync')
const duration = 14
const forceRebuild = process.env.AXIOM_DEMO_FORCE === '1'

const sources = {
  outdoorWideA: {
    url: 'https://videos.pexels.com/video-files/13648581/13648581-hd_1920_1080_24fps.mp4',
    path: join(cacheDir, '13648581-outdoor-wide-a.mp4'),
  },
  neonClose: {
    url: 'https://videos.pexels.com/video-files/13648582/13648582-hd_1920_1080_24fps.mp4',
    path: join(cacheDir, '13648582-neon-close.mp4'),
  },
  outdoorClose: {
    url: 'https://videos.pexels.com/video-files/13648583/13648583-hd_1920_1080_24fps.mp4',
    path: join(cacheDir, '13648583-outdoor-close.mp4'),
  },
  wide: {
    url: 'https://videos.pexels.com/video-files/13648588/13648588-hd_1920_1080_24fps.mp4',
    path: join(cacheDir, '13648588-wide.mp4'),
  },
  close: {
    url: 'https://videos.pexels.com/video-files/13648585/13648585-hd_1920_1080_24fps.mp4',
    path: join(cacheDir, '13648585-close.mp4'),
  },
  alternate: {
    url: 'https://videos.pexels.com/video-files/13648584/13648584-hd_1920_1080_24fps.mp4',
    path: join(cacheDir, '13648584-alternate.mp4'),
  },
  outdoorWideB: {
    url: 'https://videos.pexels.com/video-files/13648586/13648586-hd_1920_1080_24fps.mp4',
    path: join(cacheDir, '13648586-outdoor-wide-b.mp4'),
  },
  outdoorDuo: {
    url: 'https://videos.pexels.com/video-files/13648587/13648587-hd_1920_1080_24fps.mp4',
    path: join(cacheDir, '13648587-outdoor-duo.mp4'),
  },
  outdoorWideC: {
    url: 'https://videos.pexels.com/video-files/13648589/13648589-hd_1920_1080_24fps.mp4',
    path: join(cacheDir, '13648589-outdoor-wide-c.mp4'),
  },
}

const firstAvailable = async (paths) => {
  for (const path of paths) {
    if (!path) continue
    try {
      await access(path)
      return path
    } catch {
      // Try the next common macOS/Linux font location.
    }
  }
  throw new Error('A sans-serif font is required. Install Arial, Liberation Sans, or DejaVu Sans.')
}

const fontRegular = await firstAvailable([
  '/System/Library/Fonts/Supplemental/Arial.ttf',
  '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
])
const fontBold = await firstAvailable([
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
])

const exists = async (path) => {
  try {
    return (await stat(path)).size > 0
  } catch {
    return false
  }
}

const download = async ({ url, path }) => {
  if (await exists(path)) return
  const temporaryPath = `${path}.part`
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await unlink(temporaryPath).catch(() => undefined)
    try {
      const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(120_000) })
      if (!response.ok || !response.body) throw new Error(`Download failed (${response.status}): ${url}`)
      await pipeline(Readable.fromWeb(response.body), createWriteStream(temporaryPath, { flags: 'wx' }))
      await rename(temporaryPath, path)
      return
    } catch (error) {
      lastError = error
      await unlink(temporaryPath).catch(() => undefined)
      if (attempt < 3) await new Promise((resolveWait) => setTimeout(resolveWait, attempt * 1_200))
    }
  }
  throw lastError
}

const run = (command, args) => new Promise((resolveRun, rejectRun) => {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit' })
  child.once('error', rejectRun)
  child.once('close', (code, signal) => {
    if (code === 0) resolveRun()
    else rejectRun(new Error(`${command} exited with ${code ?? signal}`))
  })
})

const rawOutput = join(outputDir, 'raw-take.mp4')
const cutOutput = join(outputDir, 'agent-cut.mp4')
const librarySpecs = [
  { source: sources.outdoorWideA.path, output: join(libraryDir, 'source-13648581.mp4'), role: 'rooftop wide source A', pexelsId: '13648581' },
  { source: sources.neonClose.path, output: join(libraryDir, 'source-13648582.mp4'), role: 'neon close source', pexelsId: '13648582' },
  { source: sources.outdoorClose.path, output: join(libraryDir, 'source-13648583.mp4'), role: 'rooftop close source', pexelsId: '13648583' },
  { source: sources.wide.path, output: join(libraryDir, 'wide-source.mp4'), role: 'continuous wide source', pexelsId: '13648588' },
  { source: sources.close.path, output: join(libraryDir, 'close-source.mp4'), role: 'continuous close source', pexelsId: '13648585' },
  { source: sources.alternate.path, output: join(libraryDir, 'alternate-source.mp4'), role: 'alternate performance source', pexelsId: '13648584' },
  { source: sources.outdoorWideB.path, output: join(libraryDir, 'source-13648586.mp4'), role: 'rooftop wide source B', pexelsId: '13648586' },
  { source: sources.outdoorDuo.path, output: join(libraryDir, 'source-13648587.mp4'), role: 'rooftop duo source', pexelsId: '13648587' },
  { source: sources.outdoorWideC.path, output: join(libraryDir, 'source-13648589.mp4'), role: 'rooftop wide source C', pexelsId: '13648589' },
]

const rawVideoFilters = [
  'scale=1280:720:flags=lanczos',
  'fps=24',
  'format=yuv420p',
  'drawbox=x=22:y=22:w=318:h=54:color=black@0.62:t=fill',
  `drawtext=fontfile='${fontBold}':text='RAW TAKE / CONTINUOUS':x=40:y=39:fontsize=20:fontcolor=white`,
  'drawbox=x=22:y=h-48:w=430:h=26:color=black@0.52:t=fill',
  `drawtext=fontfile='${fontRegular}':text='NO CUTS  /  NO GRADE  /  SILENT SOURCE':x=36:y=h-43:fontsize=13:fontcolor=white@0.82`,
  'drawbox=x=22:y=22:w=iw-44:h=ih-44:color=white@0.16:t=1',
].join(',')

const segmentSpecs = [
  { input: 0, start: 2.0, speed: 1, zoom: 1 },
  { input: 1, start: 5.0, speed: 1.15, zoom: 1.08 },
  { input: 0, start: 9.0, speed: 0.9, zoom: 1.05 },
  { input: 1, start: 13.0, speed: 1.2, zoom: 1.1 },
  { input: 0, start: 18.0, speed: 1, zoom: 1.03 },
  { input: 1, start: 22.0, speed: 1.15, zoom: 1.1 },
  { input: 0, start: 27.0, speed: 1, zoom: 1.06 },
]

const segmentFilters = segmentSpecs.map((segment, index) => {
  const sourceDuration = 2 * segment.speed
  const width = Math.round(1280 * segment.zoom / 2) * 2
  const height = Math.round(720 * segment.zoom / 2) * 2
  return `[${segment.input}:v]trim=start=${segment.start}:end=${(segment.start + sourceDuration).toFixed(3)},` +
    `setpts=(PTS-STARTPTS)/${segment.speed},scale=${width}:${height}:flags=lanczos,` +
    `crop=1280:720:(iw-ow)/2:(ih-oh)/2,fps=24,format=yuv420p[v${index}]`
})

const cutLabels = [
  { start: 2, end: 3.25, text: '02 / CLOSE CUT' },
  { start: 4, end: 5.25, text: '03 / TEMPO SHIFT' },
  { start: 6, end: 7.25, text: '04 / HERO FOCUS' },
  { start: 8, end: 9.25, text: '05 / FORMATION' },
]

const cutLabelFilters = cutLabels.map((label) =>
  `drawtext=fontfile='${fontBold}':text='${label.text}':x=72:y=h-98:fontsize=22:` +
  `fontcolor=white:box=1:boxcolor=black@0.52:boxborderw=12:enable='between(t,${label.start},${label.end})'`,
)

const editedVideoFilters = [
  'eq=contrast=1.12:brightness=-0.018:saturation=1.25:gamma=0.96',
  'colorbalance=rs=0.028:bs=0.052',
  'vignette=angle=0.34:eval=init',
  'unsharp=5:5:0.55:5:5:0',
  `drawtext=fontfile='${fontRegular}':text='AXIOM CUT / REAL VIDEO AGENT':x=42:y=34:fontsize=15:fontcolor=white@0.72`,
  `drawtext=fontfile='${fontRegular}':text='REAL H.264  /  24 FPS':x=w-tw-42:y=34:fontsize=15:fontcolor=white@0.72`,
  "drawbox=x=0:y=0:w=iw:h=ih:color=black@0.18:t=fill:enable='between(t,0,1.85)'",
  "drawbox=x=70:y=72:w=5:h=156:color=0x71E5F6@0.96:t=fill:enable='between(t,0,1.85)'",
  `drawtext=fontfile='${fontBold}':text='NEON SYNC':x=94:y=70:fontsize=72:fontcolor=white:enable='between(t,0,1.85)'`,
  `drawtext=fontfile='${fontBold}':text='PERFORMANCE CUT':x=98:y=151:fontsize=22:fontcolor=0x71E5F6:enable='between(t,0,1.85)'`,
  `drawtext=fontfile='${fontRegular}':text='SAME SHOOT / TWO ANGLES / CODE DIRECTED':x=98:y=188:fontsize=14:fontcolor=white@0.78:enable='between(t,0,1.85)'`,
  ...cutLabelFilters,
  "drawbox=x=64:y=h-190:w=560:h=118:color=black@0.54:t=fill:enable='between(t,10.4,13.7)'",
  `drawtext=fontfile='${fontBold}':text='MOVE AS ONE':x=86:y=h-176:fontsize=54:fontcolor=white:enable='between(t,10.4,13.7)'`,
  `drawtext=fontfile='${fontRegular}':text='RHYTHM / FORMATION / FOCUS':x=90:y=h-112:fontsize=16:fontcolor=0x71E5F6:enable='between(t,10.4,13.7)'`,
  "drawbox=x=0:y=0:w=iw:h=ih:color=white@0.18:t=fill:enable='lt(mod(t,2),0.055)'",
  'drawbox=x=22:y=22:w=iw-44:h=ih-44:color=white@0.13:t=1',
  `drawbox=x=0:y=h-6:w=iw*t/${duration}:h=6:color=0x71E5F6@0.95:t=fill`,
  'fade=t=out:st=13.6:d=0.4',
].join(',')

await Promise.all([
  mkdir(outputDir, { recursive: true }),
  mkdir(libraryDir, { recursive: true }),
  mkdir(cacheDir, { recursive: true }),
])
const rawNeedsBuild = forceRebuild || !(await exists(rawOutput))
const cutNeedsBuild = forceRebuild || !(await exists(cutOutput))
const libraryBuildState = await Promise.all(librarySpecs.map(async (spec) => ({
  spec,
  needsBuild: forceRebuild || !(await exists(spec.output)),
})))
const requiredSources = [
  ...(rawNeedsBuild || cutNeedsBuild ? [sources.wide] : []),
  ...(cutNeedsBuild ? [sources.close] : []),
  ...libraryBuildState
    .filter(({ needsBuild }) => needsBuild)
    .map(({ spec }) => Object.values(sources).find((source) => source.path === spec.source)),
].filter(Boolean)
await Promise.all([...new Map(requiredSources.map((source) => [source.path, source])).values()].map(download))

if (rawNeedsBuild) {
  await run('ffmpeg', [
    '-y',
    '-ss', '2', '-t', String(duration), '-i', sources.wide.path,
    '-f', 'lavfi', '-t', String(duration), '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-filter_complex', `[0:v]${rawVideoFilters}[v];[1:a]atrim=duration=${duration},asetpts=PTS-STARTPTS[a]`,
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '26', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '96k', '-ar', '48000', '-shortest', '-movflags', '+faststart',
    '-metadata', 'artist=khanhhoangminh / Pexels',
    '-metadata', 'comment=Continuous source presentation for the Axiom Cut before/after demo. Not an endorsement.',
    rawOutput,
  ])
}

const concatInputs = segmentSpecs.map((_, index) => `[v${index}]`).join('')
const synthAudio = `aevalsrc=0.34*sin(2*PI*58*t)*exp(-18*mod(t\\,0.5))+` +
  `0.075*sin(2*PI*880*t)*exp(-55*mod(t+0.25\\,0.5)):s=48000:d=${duration},` +
  'pan=stereo|c0=c0|c1=c0,lowpass=f=5200,volume=0.72,' +
  'afade=t=in:st=0:d=0.12,afade=t=out:st=13.35:d=0.65[aout]'

if (cutNeedsBuild) {
  await run('ffmpeg', [
    '-y',
    '-i', sources.wide.path,
    '-i', sources.close.path,
    '-filter_complex', [
      ...segmentFilters,
      `${concatInputs}concat=n=${segmentSpecs.length}:v=1:a=0[sequence]`,
      `[sequence]${editedVideoFilters}[vout]`,
      synthAudio,
    ].join(';'),
    '-map', '[vout]', '-map', '[aout]',
    '-t', String(duration),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-movflags', '+faststart',
    '-metadata', 'artist=khanhhoangminh / Pexels; edit by Axiom Cut',
    '-metadata', 'comment=Code-directed multi-angle performance edit. The depicted people do not endorse Axiom Cut.',
    cutOutput,
  ])
}

await Promise.all(libraryBuildState.map(async ({ spec, needsBuild }) => {
  if (!needsBuild) return
  await run('ffmpeg', [
    '-y', '-i', spec.source,
    '-map', '0:v:0',
    '-vf', 'scale=1280:720:flags=lanczos,fps=24,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '28', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-an', '-movflags', '+faststart',
    '-metadata', 'artist=khanhhoangminh / Pexels',
    '-metadata', `comment=Full-duration 720p demo proxy (${spec.role}, Pexels ${spec.pexelsId}). Not an endorsement.`,
    spec.output,
  ])
}))

await Promise.all([
  run('ffmpeg', ['-y', '-ss', '1', '-i', rawOutput, '-frames:v', '1', '-vf', 'scale=960:-1', '-c:v', 'libwebp', '-quality', '82', join(outputDir, 'raw-poster.webp')]),
  run('ffmpeg', ['-y', '-ss', '1', '-i', cutOutput, '-frames:v', '1', '-vf', 'scale=960:-1', '-c:v', 'libwebp', '-quality', '84', join(outputDir, 'cut-poster.webp')]),
  ...librarySpecs.map((spec) => run('ffmpeg', [
    '-y', '-ss', '1', '-i', spec.output, '-frames:v', '1', '-vf', 'scale=480:-1',
    '-c:v', 'libwebp', '-quality', '80', spec.output.replace(/\.mp4$/, '-poster.webp'),
  ])),
])

const [rawStat, cutStat] = await Promise.all([stat(rawOutput), stat(cutOutput)])
const libraryStats = await Promise.all(librarySpecs.map(async (spec) => ({
  file: spec.output.slice(libraryDir.length + 1),
  bytes: (await stat(spec.output)).size,
})))
console.log(JSON.stringify({
  ok: true,
  duration,
  rawBytes: rawStat.size,
  cutBytes: cutStat.size,
  library: libraryStats,
  outputDir,
}, null, 2))
