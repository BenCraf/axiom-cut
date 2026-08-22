import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.NODE_ENV = 'production'

const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (chunk) => { stdout += chunk })
  child.stderr.on('data', (chunk) => { stderr += chunk })
  child.once('error', reject)
  child.once('close', (code) => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(stderr || `${command} exited ${code}`)))
})

const expect = (condition, message) => {
  if (!condition) throw new Error(message)
}

const builtInIds = [
  'd7a5e3b1-4c20-4f8a-9b01-6e1010000081',
  'd7a5e3b1-4c20-4f8a-9b01-6e1010000082',
  'd7a5e3b1-4c20-4f8a-9b01-6e1010000083',
  'd7a5e3b1-4c20-4f8a-9b01-6e1010000004',
  'd7a5e3b1-4c20-4f8a-9b01-6e1010000002',
  'd7a5e3b1-4c20-4f8a-9b01-6e1010000086',
  'd7a5e3b1-4c20-4f8a-9b01-6e1010000087',
  'd7a5e3b1-4c20-4f8a-9b01-6e1010000001',
  'd7a5e3b1-4c20-4f8a-9b01-6e1010000089',
  'd7a5e3b1-4c20-4f8a-9b01-6e1010000003',
]

const requestJson = async (url, options) => {
  const response = await fetch(url, options)
  const payload = await response.json()
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(payload)}`)
  return payload
}

const workDir = await mkdtemp(join(tmpdir(), 'axiom-cut-smoke-'))
const firstPath = join(workDir, 'first.mp4')
const secondPath = join(workDir, 'second.mp4')
const outputPath = join(workDir, 'output.mp4')
let server

try {
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', 'testsrc2=size=480x270:rate=30:duration=1.5',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=1.5',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', firstPath,
  ])
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', 'color=c=0x285f7a:size=270x480:rate=30:duration=1.2',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', secondPath,
  ])

  const { app } = await import('../server.mjs')
  server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const address = server.address()
  const base = `http://127.0.0.1:${address.port}`
  const status = await requestJson(`${base}/api/status`)
  expect(status.renderer.formats.includes('4:3') && status.renderer.formats.includes('4:5'), 'Renderer status omits supported social formats')

  const mediaLibrary = (await requestJson(`${base}/api/media`)).media
  const builtInMedia = mediaLibrary.filter((media) => media.collection === 'neon-sync')
  expect(builtInMedia.length === 10, `Expected 10 NEON SYNC assets, received ${builtInMedia.length}`)
  expect(builtInIds.every((id) => builtInMedia.some((media) => media.id === id)), 'NEON SYNC fixed IDs are incomplete')
  expect(builtInMedia.every((media) => media.builtIn === true && ['source', 'result'].includes(media.role)), 'Built-in media flags are incomplete')
  expect(builtInMedia.filter((media) => media.role === 'source').length === 9, 'NEON SYNC source/result roles are wrong')
  expect(builtInMedia.every((media) => media.thumbnailUrl && media.credit?.creator && media.credit?.sourceUrl && media.credit?.licenseUrl), 'Built-in media attribution is incomplete')
  expect(builtInMedia.every((media) => media.analysis === null), 'Built-in media was analyzed automatically')

  const protectedDelete = await fetch(`${base}/api/media/${builtInIds[0]}`, { method: 'DELETE' })
  const protectedDeletePayload = await protectedDelete.json()
  expect(protectedDelete.status === 403 && protectedDeletePayload.code === 'BUILT_IN_MEDIA', 'Built-in media deletion was not protected')

  const upload = async (path, name) => requestJson(`${base}/api/media`, {
    method: 'POST',
    headers: { 'content-type': 'video/mp4', 'x-file-type': 'video/mp4', 'x-file-name': encodeURIComponent(name) },
    body: await readFile(path),
  })
  const first = (await upload(firstPath, 'first.mp4')).media
  const second = (await upload(secondPath, 'second.mp4')).media
  expect(first.hasAudio && !second.hasAudio, 'Audio probing did not match fixtures')
  expect(!('builtIn' in first) && !('collection' in first), 'Uploaded media unexpectedly received built-in fields')

  const analysis = (await requestJson(`${base}/api/media/${first.id}/analyze`, { method: 'POST' })).analysis
  expect(Array.isArray(analysis.shots) && Array.isArray(analysis.silences), 'Analysis response is incomplete')

  const render = await requestJson(`${base}/api/render`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      clips: [
        { mediaId: second.id, start: 2, trimStart: 0, trimEnd: 1, speed: 0.8, volume: 1 },
        { mediaId: first.id, start: 0.4, trimStart: 0.1, trimEnd: 1.3, speed: 1.2, volume: 0.8 },
      ],
      aspect: '9:16',
      title: 'Axiom Cut 成片',
      titlePosition: 'top',
      titleColor: '#F8D66D',
      accentColor: '#45D5E8',
      subtitles: [],
      subtitle: '空数组后的字幕回退',
      brightness: 0.03,
      contrast: 1.08,
      saturation: 1.12,
      temperature: 0.45,
      vignette: 0.55,
    }),
  })

  let job = render.job
  const deadline = Date.now() + 60_000
  while (job.status === 'queued' || job.status === 'rendering') {
    if (Date.now() > deadline) throw new Error('Render timed out')
    await new Promise((resolve) => setTimeout(resolve, 250))
    job = (await requestJson(`${base}/api/render/${job.id}`)).job
  }
  expect(job.status === 'complete' && job.progress === 100, `Render ended as ${job.status}`)
  expect(Math.abs(job.summary.duration - 3.25) < 0.01, `Timeline gaps were not included: ${job.summary.duration}`)
  expect(Math.abs(job.summary.gapDuration - 1) < 0.01, `Gap summary is wrong: ${job.summary.gapDuration}`)
  expect(job.summary.temperature === 0.45 && job.summary.vignette === 0.55, 'Color controls were not normalized')
  expect(job.summary.titlePosition === 'top' && job.summary.titleColor === '#F8D66D' && job.summary.accentColor === '#45D5E8', 'Title styling was not normalized')

  const download = await fetch(`${base}${job.downloadUrl}`)
  expect(download.ok, `Download failed with ${download.status}`)
  await writeFile(outputPath, Buffer.from(await download.arrayBuffer()))
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-show_entries', 'stream=codec_name,codec_type,width,height:format=duration,size', '-of', 'json', outputPath,
  ])
  const probe = JSON.parse(stdout)
  const video = probe.streams.find((stream) => stream.codec_type === 'video')
  const audio = probe.streams.find((stream) => stream.codec_type === 'audio')
  expect(video?.codec_name === 'h264' && video.width === 720 && video.height === 1280, 'Rendered video format is wrong')
  expect(audio?.codec_name === 'aac', 'Rendered audio is not AAC')
  expect(Math.abs(Number(probe.format.duration) - 3.25) < 0.08, `Rendered timeline duration is wrong: ${probe.format.duration}`)

  const silenceCheck = await run('ffmpeg', [
    '-hide_banner', '-nostats', '-loglevel', 'info', '-i', outputPath,
    '-vn', '-af', 'silencedetect=n=-45dB:d=0.2', '-f', 'null', '-',
  ])
  const silenceLog = `${silenceCheck.stdout}\n${silenceCheck.stderr}`
  const initialSilence = silenceLog.match(/silence_start:\s*0(?:\.0+)?[\s\S]*?silence_end:\s*([0-9.]+)/)
  expect(initialSilence && Math.abs(Number(initialSilence[1]) - 0.4) < 0.08, 'Initial timeline gap did not render as silence')

  const signalValue = async (crop, key, time = '2.6') => {
    const result = await run('ffmpeg', [
      '-hide_banner', '-nostats', '-loglevel', 'info', '-ss', time, '-i', outputPath,
      '-frames:v', '1', '-vf', `crop=${crop},signalstats,metadata=print`, '-f', 'null', '-',
    ])
    const match = `${result.stdout}\n${result.stderr}`.match(new RegExp(`lavfi\\.signalstats\\.${key}=([0-9.]+)`))
    return match ? Number(match[1]) : NaN
  }
  const cornerLuma = await signalValue('80:80:0:0', 'YAVG')
  const centerLuma = await signalValue('80:80:(iw-80)/2:(ih-80)/2', 'YAVG')
  const subtitlePeak = await signalValue('500:180:(iw-500)/2:ih-220', 'YMAX')
  const titleTopPeak = await signalValue('500:180:(iw-500)/2:20', 'YMAX', '0.2')
  const emptyCenterPeak = await signalValue('500:180:(iw-500)/2:(ih-180)/2', 'YMAX', '0.2')
  expect(Number.isFinite(cornerLuma) && cornerLuma < centerLuma * 0.9, `Vignette was not visible (${cornerLuma} vs ${centerLuma})`)
  expect(subtitlePeak > 190, `Subtitle fallback was not burned into the output (${subtitlePeak})`)
  expect(titleTopPeak > 150 && emptyCenterPeak < 40, `Top title placement was not burned correctly (${titleTopPeak} vs ${emptyCenterPeak})`)

  await Promise.all([first.id, second.id].map((id) => requestJson(`${base}/api/media/${id}`, { method: 'DELETE' })))
  await unlink(join(tmpdir(), 'axiom-cut-studio', 'renders', `${job.id}.mp4`))
  console.log(JSON.stringify({
    ok: true,
    job: job.id,
    duration: probe.format.duration,
    gapDuration: job.summary.gapDuration,
    color: { temperature: job.summary.temperature, vignette: job.summary.vignette, cornerLuma, centerLuma },
    title: { position: job.summary.titlePosition, color: job.summary.titleColor, accent: job.summary.accentColor, topPeak: titleTopPeak, emptyCenterPeak },
    subtitleFallbackPeak: subtitlePeak,
    codecs: ['h264', 'aac'],
    size: probe.format.size,
  }))
} finally {
  if (server) await new Promise((resolve) => server.close(resolve))
  await rm(workDir, { recursive: true, force: true })
}
