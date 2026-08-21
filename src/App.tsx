import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUp, BrainCircuit, Check, ChevronDown, CirclePlay, Code2, Download,
  FileCode2, Film, Gauge, Github, Layers3, MonitorPlay, MoreHorizontal,
  Pause, Play, Plus, RefreshCw, Scissors, ShieldCheck, SplitSquareHorizontal,
  Upload, Video, WandSparkles, X, Zap,
} from 'lucide-react'

type DemoId = 'product' | 'math'
type CompareMode = 'before' | 'split' | 'after'
type PipelineStage = 'idle' | 'planning' | 'building' | 'checking' | 'ready'
type PlanStep = { id: string; title: string; detail: string; tool: string; duration: string }
type AgentPlan = {
  projectTitle: string; summary: string; accent: string; equation: string
  category?: string; renderEngine?: string; steps: PlanStep[]; demo?: boolean; model?: string
}
type ApiStatus = { configured: boolean; model: string }
type UploadedMedia = { name: string; url: string; size: string }
type EditOps = { captions: boolean; smartCrop: boolean; color: boolean; motion: boolean }

const DEMOS = {
  product: {
    id: 'product' as const, title: '产品发布 · Flux Note', label: '通用剪辑 Demo',
    description: '代码生成动态排版、产品镜头、字幕和节奏切点。', accent: '#ff6b55',
    prompt: '把一段普通产品素材剪成 12 秒发布短片，强调速度、层级和品牌感。', duration: 12,
  },
  math: {
    id: 'math' as const, title: '导数 · 局部线性', label: '数学动画 Demo',
    description: '曲线、切线、标注与公式全部由 SVG 参数生成。', accent: '#64d8ef',
    prompt: '用 18 秒解释导数是局部线性：沿曲线移动切点并显示斜率变化。', duration: 18,
  },
}

const baseSteps: PlanStep[] = [
  { id: '01', title: '理解素材', detail: '识别主体、语义和可用镜头', tool: 'analyze()', duration: '0.4s' },
  { id: '02', title: '建立节奏', detail: '把叙事拆成确定性时间段', tool: 'sequence()', duration: '0.7s' },
  { id: '03', title: '生成图层', detail: '用 SVG / CSS 构建标题与图形', tool: 'compose()', duration: '1.1s' },
  { id: '04', title: '编排运动', detail: '写入关键帧、缓动和转场', tool: 'animate()', duration: '0.9s' },
  { id: '05', title: '静态检查', detail: '检查遮挡、越界和阅读时长', tool: 'inspect()', duration: '0.5s' },
  { id: '06', title: '锁定工程', detail: '输出可复现的场景配置', tool: 'serialize()', duration: '0.3s' },
]

const initialPlan: AgentPlan = {
  projectTitle: DEMOS.product.title, summary: DEMOS.product.prompt, accent: DEMOS.product.accent,
  equation: 'speed × clarity', category: '产品短片', renderEngine: 'SVG + CSS Timeline',
  steps: baseSteps, demo: true, model: 'Local deterministic demo',
}

const formatBytes = (bytes: number) => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / 1024 / 1024).toFixed(1)} MB`

const buildLocalPlan = (brief: string, source: DemoId | 'upload'): AgentPlan => {
  const isMath = source === 'math' || /数学|公式|导数|几何|math|equation/i.test(brief)
  return {
    ...initialPlan,
    projectTitle: source === 'upload' ? '上传素材 · 代码增强' : isMath ? DEMOS.math.title : DEMOS.product.title,
    summary: brief.slice(0, 110), accent: isMath ? DEMOS.math.accent : DEMOS.product.accent,
    equation: isMath ? "f'(x) = lim Δy / Δx" : 'speed × clarity',
    category: source === 'upload' ? '上传视频' : isMath ? '数学动画' : '产品短片',
    renderEngine: isMath ? 'React SVG + frame()' : 'Video + SVG Overlay', steps: baseSteps, demo: true,
  }
}

function MathScene({ variant, progress }: { variant: 'before' | 'after'; progress: number }) {
  const x = 205 + progress * 380
  const curveY = 410 - Math.pow((x - 205) / 380, 2) * 255
  const slope = -0.55 - progress * 1.2
  const tangentLength = 150
  const x1 = x - tangentLength
  const x2 = x + tangentLength
  const y1 = curveY - slope * tangentLength
  const y2 = curveY + slope * tangentLength
  return <svg className={`scene-svg math-demo ${variant}`} viewBox="0 0 960 540" role="img" aria-label={`${variant === 'after' ? '代码增强后' : '原始'}导数动画`}>
    <defs>
      <linearGradient id={`mathBg-${variant}`} x1="0" x2="1" y1="0" y2="1"><stop stopColor={variant === 'after' ? '#071015' : '#11151a'} /><stop offset="1" stopColor="#050709" /></linearGradient>
      <radialGradient id={`mathGlow-${variant}`} cx="45%" cy="50%" r="55%"><stop stopColor="#52d7ee" stopOpacity={variant === 'after' ? '.16' : '.04'} /><stop offset="1" stopColor="#52d7ee" stopOpacity="0" /></radialGradient>
      <pattern id={`grid-${variant}`} width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#26323a" strokeWidth=".7" opacity={variant === 'after' ? '.55' : '.26'} /></pattern>
      <filter id={`glow-${variant}`}><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    <rect width="960" height="540" fill={`url(#mathBg-${variant})`} /><rect width="960" height="540" fill={`url(#grid-${variant})`} /><rect width="960" height="540" fill={`url(#mathGlow-${variant})`} />
    <g className="coordinate-system"><path d="M90 430H645M145 474V84" /><path d="M638 424L646 430L638 436M139 92L145 84L151 92" /><text x="628" y="460">x</text><text x="163" y="101">f(x)</text></g>
    <path className="function-shadow" d="M90 470 C185 454 247 421 305 365 C382 290 450 210 646 110" /><path className="function-line" d="M90 470 C185 454 247 421 305 365 C382 290 450 210 646 110" />
    {variant === 'after' ? <>
      <g className="math-tangent"><line x1={x1} y1={y1} x2={x2} y2={y2} /><circle cx={x} cy={curveY} r="8" /><circle className="point-halo" cx={x} cy={curveY} r="18" /></g>
      <g className="delta-guide"><path d={`M${x} ${curveY + 66}H${x + 88}V${curveY - 28}`} /><text x={x + 31} y={curveY + 86}>Δx</text><text x={x + 100} y={curveY + 22}>Δy</text></g>
      <g className="math-copy"><text className="micro" x="702" y="105">LOCAL LINEARITY / 02</text><text className="headline" x="702" y="160">放大曲线</text><text className="headline accent" x="702" y="207">直到它成为直线</text><line x1="702" y1="238" x2="889" y2="238" /><text className="formula" x="702" y="290">f′(x) = lim</text><text className="fraction" x="839" y="274">Δy</text><line x1="837" y1="282" x2="878" y2="282" /><text className="fraction" x="839" y="307">Δx</text><text className="caption" x="702" y="359">切线斜率，就是瞬时变化率</text></g>
      <g className="frame-code"><text x="38" y="44">SCENE.DERIVATIVE()</text><text x="804" y="508">FRAME {String(Math.round(progress * 540)).padStart(3, '0')}</text></g>
    </> : <><circle className="basic-point" cx={x} cy={curveY} r="7" /><text className="basic-title" x="690" y="190">导数</text><text className="basic-formula" x="690" y="245">f′(x)</text><text className="basic-note" x="690" y="292">曲线在一点的斜率</text></>}
  </svg>
}

function ProductScene({ variant, progress }: { variant: 'before' | 'after'; progress: number }) {
  const offset = Math.sin(progress * Math.PI * 2) * 7
  return <svg className={`scene-svg product-demo ${variant}`} viewBox="0 0 960 540" role="img" aria-label={`${variant === 'after' ? '代码增强后' : '原始'}产品动画`}>
    <defs><linearGradient id={`productBg-${variant}`} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#16171b" /><stop offset="1" stopColor="#07080a" /></linearGradient><linearGradient id={`coral-${variant}`} x1="0" x2="1"><stop stopColor="#ff846d" /><stop offset="1" stopColor="#ff4f6d" /></linearGradient><filter id={`productShadow-${variant}`}><feDropShadow dx="0" dy="20" stdDeviation="18" floodOpacity=".35" /></filter></defs>
    <rect width="960" height="540" fill={`url(#productBg-${variant})`} />
    {variant === 'after' && <><circle cx="160" cy="70" r="260" fill="#ff635a" opacity=".06" /><circle cx="850" cy="470" r="250" fill="#695bff" opacity=".08" /><path className="product-grid" d="M0 108H960M0 216H960M0 324H960M0 432H960M192 0V540M384 0V540M576 0V540M768 0V540" /></>}
    <g className="product-device" transform={`translate(0 ${variant === 'after' ? offset : 0})`} filter={`url(#productShadow-${variant})`}><rect x="565" y="70" width="245" height="400" rx="34" fill="#090b0f" stroke={variant === 'after' ? '#343944' : '#24272d'} strokeWidth="5" /><rect x="584" y="91" width="207" height="358" rx="22" fill={variant === 'after' ? '#f4f0e9' : '#23262b'} /><rect x="655" y="104" width="66" height="7" rx="4" fill="#11151a" /><circle cx="616" cy="151" r="18" fill={variant === 'after' ? '#ff6b55' : '#555b63'} /><rect x="647" y="140" width="105" height="10" rx="5" fill={variant === 'after' ? '#15181c' : '#4b5057'} /><rect x="647" y="158" width="72" height="7" rx="4" fill="#777d84" />{[0, 1, 2].map((item) => <g key={item} transform={`translate(0 ${item * 74})`}><rect x="606" y="201" width="163" height="58" rx="12" fill={variant === 'after' ? (item === 0 ? '#181b21' : '#dedad3') : '#34383e'} /><circle cx="625" cy="220" r="7" fill={variant === 'after' ? '#ff6b55' : '#5a6068'} /><rect x="641" y="213" width="90" height="8" rx="4" fill={variant === 'after' && item === 0 ? '#fff' : '#666c74'} /><rect x="641" y="230" width="58" height="6" rx="3" fill="#81868d" /></g>)}</g>
    {variant === 'after' ? <g className="product-copy"><text className="product-kicker" x="80" y="112">NEW / PRODUCTIVITY</text><text className="product-title" x="80" y="194">Ideas move</text><text className="product-title outline" x="80" y="266">at your speed.</text><text className="product-sub" x="84" y="319">捕捉灵感。组织思考。保持流动。</text><rect x="82" y="363" width="174" height="48" rx="24" fill={`url(#coral-${variant})`} /><text className="product-cta" x="123" y="394">MEET FLUX</text><g className="product-meta"><text x="81" y="473">00:07 / 00:12</text><text x="386" y="473">CODE EDIT</text></g></g> : <g className="raw-copy"><text x="86" y="174">Flux Note</text><text x="86" y="222">全新的效率工具</text><rect x="86" y="258" width="160" height="42" rx="5" /><text x="125" y="285">了解更多</text></g>}
  </svg>
}

function UploadedScene({ media, variant, playing, ops }: { media: UploadedMedia; variant: 'before' | 'after'; playing: boolean; ops: EditOps }) {
  return <div className={`uploaded-scene ${variant} ${ops.color && variant === 'after' ? 'graded' : ''}`}><video src={media.url} muted loop autoPlay={playing} playsInline />{variant === 'after' && <div className="video-code-overlay">{ops.motion && <div className="motion-frame"><i /><i /><i /><i /></div>}{ops.captions && <div className="auto-caption"><span>AUTO CAPTION · 00:03</span><strong>让素材跟随故事，而不是模板。</strong></div>}<div className="video-title"><span>CODE DIRECTED</span><strong>{media.name.replace(/\.[^.]+$/, '').slice(0, 24)}</strong></div>{ops.smartCrop && <div className="subject-lock"><span /> SUBJECT LOCK</div>}</div>}</div>
}

function App() {
  const [activeDemo, setActiveDemo] = useState<DemoId>('product')
  const [compareMode, setCompareMode] = useState<CompareMode>('split')
  const [stage, setStage] = useState<PipelineStage>('idle')
  const [activeStep, setActiveStep] = useState(-1)
  const [plan, setPlan] = useState(initialPlan)
  const [prompt, setPrompt] = useState(DEMOS.product.prompt)
  const [playing, setPlaying] = useState(true)
  const [progress, setProgress] = useState(.38)
  const [panelTab, setPanelTab] = useState<'timeline' | 'code'>('timeline')
  const [uploaded, setUploaded] = useState<UploadedMedia | null>(null)
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ configured: false, model: 'deepseek-v4-flash' })
  const [editOps, setEditOps] = useState<EditOps>({ captions: true, smartCrop: true, color: true, motion: true })
  const [showExport, setShowExport] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const runToken = useRef(0)

  const sourceType: DemoId | 'upload' = uploaded ? 'upload' : activeDemo
  const demo = DEMOS[activeDemo]
  const duration = uploaded ? 24 : demo.duration
  const projectTitle = uploaded ? plan.projectTitle : demo.title
  const isRunning = ['planning', 'building', 'checking'].includes(stage)

  useEffect(() => { fetch('/api/status').then((response) => response.json()).then((data) => setApiStatus({ configured: Boolean(data.configured), model: data.model || 'deepseek-v4-flash' })).catch(() => undefined) }, [])
  useEffect(() => { if (!playing) return; const timer = window.setInterval(() => setProgress((value) => value >= 1 ? 0 : value + .003), 60); return () => window.clearInterval(timer) }, [playing])
  useEffect(() => () => { runToken.current += 1 }, [])

  const generatedCode = useMemo(() => {
    if (uploaded) return `const edit = defineVideo({\n  source: "${uploaded.name}",\n  fps: 30, duration: 24,\n  operations: [\n${editOps.smartCrop ? '    smartCrop({ subject: "auto", ratio: "16:9" }),\n' : ''}${editOps.color ? '    colorGrade({ contrast: 1.08, warmth: -0.06 }),\n' : ''}${editOps.captions ? '    captions({ source: "speech", style: "bold-center" }),\n' : ''}${editOps.motion ? '    motionFrame({ enter: spring(18), tracking: true }),\n' : ''}  ],\n});`
    if (activeDemo === 'math') return `export const DerivativeScene = ({ frame }) => {\n  const t = interpolate(frame, [0, 540], [0, 1]);\n  const x = 205 + t * 380;\n  const y = curve(x);\n\n  return <Scene background="#071015">\n    <FunctionPlot fn={x => x * x} draw={t} />\n    <Tangent point={[x, y]} glow="#64d8ef" />\n    <DeltaGuide dx={88} progress={t} />\n    <Formula>f′(x) = lim Δy / Δx</Formula>\n  </Scene>;\n};`
    return `export const ProductLaunch = ({ frame }) => {\n  const enter = spring({ frame, fps: 30, damping: 18 });\n  const float = Math.sin(frame / 18) * 7;\n\n  return <Scene palette="coral-night">\n    <Headline reveal={enter}>Ideas move\\nat your speed.</Headline>\n    <DeviceMockup y={float} data={featureCards} />\n    <CTA at={90}>MEET FLUX</CTA>\n  </Scene>;\n};`
  }, [activeDemo, editOps, uploaded])

  const selectDemo = (id: DemoId) => {
    if (uploaded?.url) URL.revokeObjectURL(uploaded.url)
    setUploaded(null); setActiveDemo(id); setPrompt(DEMOS[id].prompt); setPlan(buildLocalPlan(DEMOS[id].prompt, id))
    setStage('idle'); setActiveStep(-1); setProgress(.24); setCompareMode('split')
  }

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return
    if (uploaded?.url) URL.revokeObjectURL(uploaded.url)
    const media = { name: file.name, url: URL.createObjectURL(file), size: formatBytes(file.size) }
    setUploaded(media); setPlan(buildLocalPlan(`对 ${file.name} 进行代码驱动剪辑`, 'upload'))
    setPrompt(`剪辑 ${file.name}：智能裁切、自动字幕、轻量调色，保留原片真实内容。`)
    setStage('idle'); setActiveStep(-1); setProgress(.08); setCompareMode('split'); event.target.value = ''
  }

  const generate = async (localOnly = false) => {
    if (!prompt.trim() || isRunning) return
    const token = ++runToken.current; setStage('planning'); setPlaying(false); setActiveStep(0); setProgress(.06)
    let nextPlan = buildLocalPlan(prompt, sourceType)
    if (!localOnly && apiStatus.configured) try {
      const response = await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      if (response.ok) nextPlan = await response.json()
    } catch { /* deterministic fallback stays active */ }
    if (runToken.current !== token) return
    setPlan(nextPlan); await new Promise((resolve) => window.setTimeout(resolve, 450)); setStage('building')
    for (let index = 0; index < nextPlan.steps.length; index += 1) { if (runToken.current !== token) return; setActiveStep(index); setProgress(.12 + index * .12); await new Promise((resolve) => window.setTimeout(resolve, 420)) }
    setStage('checking'); setActiveStep(nextPlan.steps.length); await new Promise((resolve) => window.setTimeout(resolve, 650))
    if (runToken.current !== token) return
    setStage('ready'); setProgress(1); setPlaying(true); setCompareMode('after'); setPanelTab('code')
  }

  const reset = () => { runToken.current += 1; setStage('idle'); setActiveStep(-1); setProgress(.25); setPlaying(true); setCompareMode('split') }
  const downloadProject = () => {
    const project = { schema: 'axiom-cut/v0.3', source: uploaded ? { name: uploaded.name, size: uploaded.size, localOnly: true } : { demo: activeDemo }, prompt, plan, operations: editOps, code: generatedCode }
    const url = URL.createObjectURL(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'axiom-cut-code-project.json'; anchor.click(); URL.revokeObjectURL(url)
  }
  const renderScene = (variant: 'before' | 'after') => uploaded ? <UploadedScene media={uploaded} variant={variant} playing={playing} ops={editOps} /> : activeDemo === 'math' ? <MathScene variant={variant} progress={progress} /> : <ProductScene variant={variant} progress={progress} />
  const stageText = { idle: ['READY', '等待剪辑指令'], planning: ['PLAN', '分析素材与叙事'], building: ['BUILD', `生成代码图层 ${Math.min(activeStep + 1, 6)}/6`], checking: ['VERIFY', '检查确定性输出'], ready: ['READY', '代码工程已锁定'] }[stage]

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark"><Scissors size={18} /></div><div><strong>AXIOM CUT</strong><span>CODE-DIRECTED VIDEO</span></div></div><div className="project-switcher"><span className="project-dot" /><strong>{projectTitle}</strong><ChevronDown size={14} /></div><div className="top-actions"><div className="engine-badge"><Code2 size={14} /><span>CODE RENDER</span><i>DETERMINISTIC</i></div><div className={`api-badge ${apiStatus.configured ? 'online' : ''}`}><Zap size={13} />{apiStatus.configured ? 'DeepSeek Ready' : 'Local Mode'}</div><a className="icon-link" href="https://github.com/BenCraf/axiom-cut" target="_blank" rel="noreferrer" aria-label="GitHub"><Github size={18} /></a><button className="export-button" onClick={() => setShowExport(true)}><Download size={16} /> 导出工程</button></div></header>
    <main className="workspace">
      <aside className="media-panel"><div className="panel-title"><div><span>MEDIA</span><h2>素材与案例</h2></div><button><Plus size={16} /></button></div><input ref={fileRef} type="file" accept="video/*" onChange={handleUpload} hidden /><button className="upload-zone" onClick={() => fileRef.current?.click()}><div><Upload size={20} /></div><strong>上传本地视频</strong><span>MP4 / MOV / WebM · 不上传云端</span></button>
        {uploaded && <div className="uploaded-file"><div className="file-thumb"><Video size={20} /></div><div><strong>{uploaded.name}</strong><span>{uploaded.size} · 本地素材</span></div><button onClick={() => selectDemo(activeDemo)}><X size={14} /></button></div>}
        <div className="library-label"><span>对比 Demo</span><b>2</b></div>{(Object.values(DEMOS) as (typeof DEMOS)[DemoId][]).map((item) => <button className={`demo-card ${!uploaded && activeDemo === item.id ? 'active' : ''}`} key={item.id} onClick={() => selectDemo(item.id)}><div className={`demo-thumb ${item.id}`}><span>{item.id === 'math' ? 'f′(x)' : 'FLUX'}</span><CirclePlay size={21} /></div><div><span>{item.label}</span><strong>{item.title}</strong><p>{item.description}</p></div></button>)}
        <div className="library-label"><span>代码操作</span><b>4</b></div><div className="operation-list">{([['captions', '自动字幕', '语音 → 时间码'], ['smartCrop', '主体裁切', '跟踪 → 16:9'], ['color', '程序调色', '参数 → LUT'], ['motion', '运动图形', 'SVG → 关键帧']] as [keyof EditOps, string, string][]).map(([key, title, detail]) => <button key={key} className={editOps[key] ? 'enabled' : ''} onClick={() => setEditOps((value) => ({ ...value, [key]: !value[key] }))}><span><Check size={11} /></span><div><strong>{title}</strong><small>{detail}</small></div></button>)}</div><div className="privacy-note"><ShieldCheck size={16} /><p><strong>素材默认留在浏览器</strong>Demo 只读取本地 Object URL，不把视频传给模型。</p></div>
      </aside>
      <section className="editor-column"><div className="editor-head"><div><span>{uploaded ? 'UPLOADED VIDEO' : demo.label.toUpperCase()}</span><h1>{projectTitle}</h1></div><div className="view-switcher"><button className={compareMode === 'before' ? 'active' : ''} onClick={() => setCompareMode('before')}>原片</button><button className={compareMode === 'split' ? 'active' : ''} onClick={() => setCompareMode('split')}><SplitSquareHorizontal size={14} /> 对比</button><button className={compareMode === 'after' ? 'active' : ''} onClick={() => setCompareMode('after')}>代码增强</button></div><button className="more-button" aria-label="更多"><MoreHorizontal size={18} /></button></div>
        <div className="preview-stage"><div className={`preview-frame mode-${compareMode}`}>{(compareMode === 'before' || compareMode === 'split') && <div className="compare-pane before-pane"><span className="compare-label">ORIGINAL</span>{renderScene('before')}</div>}{(compareMode === 'after' || compareMode === 'split') && <div className="compare-pane after-pane"><span className="compare-label code">CODE EDIT</span>{renderScene('after')}</div>}{compareMode === 'split' && <div className="compare-divider"><span><SplitSquareHorizontal size={13} /></span></div>}</div><div className={`render-status ${stage}`}><span className="status-light" /><div><small>{stageText[0]}</small><strong>{stageText[1]}</strong></div><b>{stage === 'ready' ? '100%' : stage === 'idle' ? '—' : `${Math.round((activeStep + 1) / 7 * 100)}%`}</b></div></div>
        <div className="transport"><button onClick={() => setProgress(0)}><RefreshCw size={15} /></button><button className="play-button" onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button><strong>00:{String(Math.round(progress * duration)).padStart(2, '0')}:12</strong><span>/ 00:{String(duration).padStart(2, '0')}:00</span><div className="transport-progress"><i style={{ width: `${progress * 100}%` }} /><b style={{ left: `${progress * 100}%` }} /></div><button><MonitorPlay size={16} /></button><button><Gauge size={16} /></button></div>
        <div className="bottom-panel"><div className="bottom-tabs"><button className={panelTab === 'timeline' ? 'active' : ''} onClick={() => setPanelTab('timeline')}><Layers3 size={15} /> 代码时间线</button><button className={panelTab === 'code' ? 'active' : ''} onClick={() => setPanelTab('code')}><FileCode2 size={15} /> scene.tsx</button><span>{uploaded ? '1 source · 4 operations' : '0 raster assets · 100% vector'}</span></div>{panelTab === 'timeline' ? <div className="code-timeline"><div className="track-label"><Video size={14} /><span>SOURCE</span></div><div className="track"><div className="clip source">{uploaded ? uploaded.name : activeDemo === 'math' ? 'coordinate-system.svg' : 'product-layout.tsx'}</div><i style={{ left: `${progress * 100}%` }} /></div><div className="track-label"><Code2 size={14} /><span>LAYERS</span></div><div className="track"><div className="clip coral">title.reveal()</div><div className="clip cyan">motion.track()</div><div className="clip purple">caption.sync()</div><i style={{ left: `${progress * 100}%` }} /></div><div className="track-label"><Zap size={14} /><span>FX</span></div><div className="track"><div className="clip fx">color.grade()</div><div className="clip fx short">safeArea.check()</div><i style={{ left: `${progress * 100}%` }} /></div></div> : <div className="code-view"><div className="code-gutter">{generatedCode.split('\n').map((_, index) => <span key={index}>{index + 1}</span>)}</div><pre><code>{generatedCode}</code></pre><div className="code-proof"><Check size={13} /> Deterministic · frame-based · no generated pixels</div></div>}</div>
      </section>
      <aside className="agent-panel"><div className="agent-head"><div className="agent-icon"><BrainCircuit size={20} /></div><div><span>DIRECTOR AGENT</span><h2>代码剪辑</h2></div><button onClick={reset}>重置</button></div><div className="prompt-box"><div><WandSparkles size={18} /><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="描述你想怎么剪…" /></div><footer><span>{apiStatus.configured ? apiStatus.model : 'local deterministic'}</span><button onClick={() => generate(false)} disabled={isRunning || !prompt.trim()}>{isRunning ? <RefreshCw className="spin" size={16} /> : <ArrowUp size={17} />}</button></footer></div><div className="agent-scroll"><div className="source-summary"><span>SOURCE</span><div><Film size={17} /><p><strong>{uploaded ? uploaded.name : `${demo.label} · 内置`}</strong><small>{uploaded ? `${uploaded.size} · 本地读取` : 'React / SVG scene spec'}</small></p><i>{uploaded ? 'VIDEO' : 'CODE'}</i></div></div><div className="plan-header"><span>执行计划</span><b>{Math.max(0, Math.min(activeStep + (stage === 'ready' ? 1 : 0), 6))}/6</b></div><div className="plan-steps">{plan.steps.map((step, index) => { const done = stage === 'ready' || activeStep > index; const active = isRunning && activeStep === index; return <div className={`plan-step ${done ? 'done' : ''} ${active ? 'active' : ''}`} key={step.id}><div>{done ? <Check size={12} /> : String(index + 1).padStart(2, '0')}</div><p><strong>{step.title}</strong><span>{step.detail}</span></p><code>{step.tool}</code></div> })}</div><div className="render-contract"><div><ShieldCheck size={17} /><strong>渲染契约</strong><span>可验证</span></div><ul><li><Check size={12} /> 所有图形来自 SVG / CSS</li><li><Check size={12} /> 所有运动按 frame 计算</li><li><Check size={12} /> 模型只生成计划与参数</li><li><Check size={12} /> 上传素材不进入模型上下文</li></ul></div><div className="engine-card"><span>RENDER ENGINE</span><strong>{uploaded ? 'Video + SVG Overlay' : activeDemo === 'math' ? 'React SVG · 30 fps' : 'React Layout · 30 fps'}</strong><p>相同输入会得到相同画面，不依赖生图模型补全。</p><button onClick={() => setPanelTab('code')}><Code2 size={14} /> 查看生成代码</button></div></div></aside>
    </main>
    {showExport && <div className="modal-backdrop" onMouseDown={() => setShowExport(false)}><div className="export-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowExport(false)}><X size={18} /></button><div className="export-icon"><FileCode2 size={27} /></div><span>REPRODUCIBLE PROJECT</span><h2>导出代码剪辑工程</h2><p>包含场景代码、时间线、操作参数和素材引用。上传的视频本体不会写入导出文件。</p><div className="export-grid"><div><span>SCHEMA</span><strong>v0.3</strong></div><div><span>LAYERS</span><strong>{uploaded ? 5 : 7}</strong></div><div><span>FPS</span><strong>30</strong></div></div><button className="download-project" onClick={downloadProject}><Download size={17} /> 下载工程 JSON</button><small>真实 MP4 渲染接口将在 Remotion worker 接入后启用。</small></div></div>}
  </div>
}

export default App
