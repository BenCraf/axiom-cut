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
const cacheDir = join(tmpdir(), 'axiom-cut-neon-sync')
const duration = 14

const sources = {
  wide: {
    url: 'https://videos.pexels.com/video-files/13648588/13648588-hd_1920_1080_24fps.mp4',
    path: join(cacheDir, '13648588-wide.mp4'),
  },
  close: {
    url: 'https://videos.pexels.com/video-files/13648585/13648585-hd_1920_1080_24fps.mp4',
    path: join(cacheDir, '13648585-close.mp4'),
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
  await unlink(temporaryPath).catch(() => undefined)
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok || !response.body) throw new Error(`Download failed (${response.status}): ${url}`)
  await pipeline(Readable.fromWeb(response.body), createWriteStream(temporaryPath, { flags: 'wx' }))
  await rename(temporaryPath, path)
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

await Promise.all([mkdir(outputDir, { recursive: true }), mkdir(cacheDir, { recursive: true })])
await Promise.all(Object.values(sources).map(download))

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

const concatInputs = segmentSpecs.map((_, index) => `[v${index}]`).join('')
const synthAudio = `aevalsrc=0.34*sin(2*PI*58*t)*exp(-18*mod(t\\,0.5))+` +
  `0.075*sin(2*PI*880*t)*exp(-55*mod(t+0.25\\,0.5)):s=48000:d=${duration},` +
  'pan=stereo|c0=c0|c1=c0,lowpass=f=5200,volume=0.72,' +
  'afade=t=in:st=0:d=0.12,afade=t=out:st=13.35:d=0.65[aout]'

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

await Promise.all([
  run('ffmpeg', ['-y', '-ss', '1', '-i', rawOutput, '-frames:v', '1', '-vf', 'scale=960:-1', '-c:v', 'libwebp', '-quality', '82', join(outputDir, 'raw-poster.webp')]),
  run('ffmpeg', ['-y', '-ss', '1', '-i', cutOutput, '-frames:v', '1', '-vf', 'scale=960:-1', '-c:v', 'libwebp', '-quality', '84', join(outputDir, 'cut-poster.webp')]),
])

const [rawStat, cutStat] = await Promise.all([stat(rawOutput), stat(cutOutput)])
console.log(JSON.stringify({
  ok: true,
  duration,
  rawBytes: rawStat.size,
  cutBytes: cutStat.size,
  outputDir,
}, null, 2))
