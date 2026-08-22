import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUp, BrainCircuit, Check, ChevronDown, CirclePlay, Code2, Download,
  Expand, FileCode2, Film, Github, Layers3, Pause, Play, RefreshCw,
  Scissors, ShieldCheck, Sparkles, SplitSquareHorizontal, Upload, Video,
  WandSparkles, X, Zap,
} from 'lucide-react'

type DemoId = 'math' | 'product'
type CompareMode = 'before' | 'split' | 'after'
type PipelineStage = 'idle' | 'planning' | 'building' | 'checking' | 'ready'
type PlanStep = { id: string; title: string; detail: string; tool: string; duration: string }
type AgentPlan = {
  projectTitle: string
  summary: string
  accent: string
  equation: string
  category?: string
  renderEngine?: string
  steps: PlanStep[]
  demo?: boolean
  model?: string
}
type ApiStatus = { configured: boolean; model: string }
type UploadedMedia = { name: string; url: string; size: string }
type EditOps = { captions: boolean; smartCrop: boolean; color: boolean; motion: boolean }

const MATH_FILM_SPEC = {
  fps: 30,
  durationInFrames: 540,
  rasterAssets: 0,
  curve: { type: 'quadratic-bezier', points: [[100, 440], [360, 440], [650, 100]] },
  chapters: [
    { frames: [0, 120], layer: 'RoadStory', question: '这一刻，到底有多快？' },
    { frames: [120, 270], layer: 'FunctionCurve', point: 'B(t)' },
    { frames: [270, 420], layer: 'SecantToTangent', delta: [0.16, 0.03] },
    { frames: [420, 540], layer: 'LimitFormula', formula: 'f′(a)=lim(h→0) Δf/h' },
  ],
  colors: { curve: '#69e2f5', secant: '#ff755f', tangent: '#f0d86f' },
} as const

const PRODUCT_FILM_SPEC = {
  fps: 30,
  durationInFrames: 360,
  rasterAssets: 0,
  palette: 'coral-night',
  copy: { headline: 'Ideas move at your speed.', cta: 'MEET FLUX' },
  layers: [
    { frames: [0, 90], type: 'BrandHook', enter: 'spring(18)' },
    { frames: [90, 210], type: 'ProductDevice', float: 'sin(frame/18) × 6' },
    { frames: [210, 300], type: 'FeatureCards', count: 3 },
    { frames: [300, 360], type: 'BrandCTA', settle: 'easeOutCubic' },
  ],
  colors: { accent: '#ff755f', background: '#07080a' },
} as const

const sceneSpecCode = (name: string, spec: object) => `export const ${name} = ${JSON.stringify(spec, null, 2)} as const;`

const DEMOS = {
  math: {
    id: 'math' as const,
    title: '导数，是局部的一条直线',
    shortTitle: '导数 · 局部线性',
    label: 'CODE MATH FILM',
    description: '四段式数学叙事：曲线、割线、切线、极限。所有画面逐帧计算。',
    prompt: '用 18 秒解释“导数是局部线性”：先画曲线，再让割线收敛到切线，最后出现极限公式。',
    duration: MATH_FILM_SPEC.durationInFrames / MATH_FILM_SPEC.fps,
    accent: '#69e2f5',
    chapters: [
      { time: 0, label: '01 先看曲线', detail: '曲线真的一直是弯的吗？' },
      { time: 4, label: '02 放大一点', detail: '局部只剩一个方向' },
      { time: 9, label: '03 割线收敛', detail: 'Δx 不断趋近于零' },
      { time: 14, label: '04 得到导数', detail: '极限给出瞬时斜率' },
    ],
  },
  product: {
    id: 'product' as const,
    title: 'Flux Note — Ideas move fast',
    shortTitle: '产品发布 · Flux Note',
    label: 'CODE BRAND FILM',
    description: '真实产品结构、动态排版与镜头节奏全部由 React/SVG 代码生成。',
    prompt: '把 Flux Note 做成 12 秒产品发布片：先提出痛点，再展示界面，最后落到品牌口号。',
    duration: PRODUCT_FILM_SPEC.durationInFrames / PRODUCT_FILM_SPEC.fps,
    accent: '#ff755f',
    chapters: [
      { time: 0, label: '01 Hook', detail: 'Ideas should move' },
      { time: 3, label: '02 Product', detail: '界面进入画面' },
      { time: 7, label: '03 Feature', detail: '三个核心能力' },
      { time: 10, label: '04 Brand', detail: '品牌与行动按钮' },
    ],
  },
}

const STEPS: PlanStep[] = [
  { id: '01', title: '理解内容', detail: '提取主体、目标和叙事重点', tool: 'analyze()', duration: '0.4s' },
  { id: '02', title: '拆分章节', detail: '建立四段式时间结构', tool: 'sequence()', duration: '0.7s' },
  { id: '03', title: '生成图形', detail: '创建 SVG、排版和数据对象', tool: 'compose()', duration: '1.1s' },
  { id: '04', title: '编排运动', detail: '按 frame 写入缓动与转场', tool: 'animate()', duration: '0.9s' },
  { id: '05', title: '画面检查', detail: '检查遮挡、越界和阅读时间', tool: 'inspect()', duration: '0.5s' },
  { id: '06', title: '锁定工程', detail: '输出可复现的代码时间线', tool: 'serialize()', duration: '0.3s' },
]

const UPLOAD_CHAPTERS = [
  { time: 0, label: '01 原始素材', detail: '保留真实视频内容' },
  { time: 6, label: '02 智能构图', detail: '主体跟踪与安全区' },
  { time: 12, label: '03 动态字幕', detail: '按时间码逐句出现' },
  { time: 18, label: '04 视觉收束', detail: '调色、标题与节奏' },
]

const initialPlan: AgentPlan = {
  projectTitle: DEMOS.math.shortTitle,
  summary: DEMOS.math.prompt,
  accent: DEMOS.math.accent,
  equation: "f'(x) = lim Δy / Δx",
  category: '数学动画',
  renderEngine: 'React SVG + frame()',
  steps: STEPS,
  demo: true,
  model: 'Local deterministic demo',
}

const clamp = (value: number) => Math.max(0, Math.min(1, value))
const ramp = (value: number, start: number, end: number) => clamp((value - start) / (end - start))
const formatBytes = (bytes: number) => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / 1024 / 1024).toFixed(1)} MB`

const buildLocalPlan = (brief: string, source: DemoId | 'upload'): AgentPlan => {
  const isMath = source === 'math' || /数学|公式|导数|几何|math|equation/i.test(brief)
  return {
    ...initialPlan,
    projectTitle: source === 'upload' ? '上传视频 · 代码增强' : isMath ? DEMOS.math.shortTitle : DEMOS.product.shortTitle,
    summary: brief.slice(0, 120),
    accent: isMath ? DEMOS.math.accent : DEMOS.product.accent,
    equation: isMath ? "f'(x) = lim Δy / Δx" : 'story × rhythm',
    category: source === 'upload' ? '上传视频' : isMath ? '数学动画' : '品牌短片',
    renderEngine: isMath ? 'React SVG + frame()' : 'Video + SVG Overlay',
    steps: STEPS,
    demo: true,
  }
}

function MathScene({ variant, progress }: { variant: 'before' | 'after'; progress: number }) {
  const [[p0x, p0y], [p1x, p1y], [p2x, p2y]] = MATH_FILM_SPEC.curve.points
  const t = .08 + progress * .82
  const x = (1 - t) ** 2 * p0x + 2 * (1 - t) * t * p1x + t ** 2 * p2x
  const y = (1 - t) ** 2 * p0y + 2 * (1 - t) * t * p1y + t ** 2 * p2y
  const dxdt = 2 * (1 - t) * (p1x - p0x) + 2 * t * (p2x - p1x)
  const dydt = 2 * (1 - t) * (p1y - p0y) + 2 * t * (p2y - p1y)
  const slope = dydt / dxdt
  const tangentLength = 145
  const tangent = { x1: x - tangentLength, y1: y - slope * tangentLength, x2: x + tangentLength, y2: y + slope * tangentLength }
  const deltaT = .16 - ramp(progress, .43, .68) * .13
  const nextT = Math.min(.98, t + deltaT)
  const nextX = (1 - nextT) ** 2 * p0x + 2 * (1 - nextT) * nextT * p1x + nextT ** 2 * p2x
  const nextY = (1 - nextT) ** 2 * p0y + 2 * (1 - nextT) * nextT * p1y + nextT ** 2 * p2y
  const draw = variant === 'before' ? 1 : ramp(progress, .02, .18)
  const plotIn = variant === 'before' ? 1 : ramp(progress, .13, .29)
  const roadOut = variant === 'before' ? 0 : 1 - ramp(progress, .19, .29)
  const carX = 128 + ramp(progress, 0, .22) * 410
  const tangentIn = variant === 'before' ? 0 : ramp(progress, .22, .38)
  const deltaIn = variant === 'before' ? 0 : ramp(progress, .42, .55) * (1 - ramp(progress, .73, .82))
  const formulaIn = variant === 'before' ? 0 : ramp(progress, .72, .86)
  const chapter = Math.min(3, Math.floor(progress * 4))
  const chapterCopy = [
    ['一条曲线', '真的一直是弯的吗？'],
    ['把镜头', '推近到一个点'],
    ['让两点', '无限地靠近'],
    ['弯曲消失', '只剩一条直线'],
  ][chapter]

  return <svg className={`scene-svg math-film ${variant}`} viewBox="0 0 960 540" role="img" aria-label={`${variant === 'after' ? '代码成片' : '基础版本'}导数动画`}>
    <defs>
      <linearGradient id={`math-bg-${variant}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#071116" /><stop offset=".55" stopColor="#081015" /><stop offset="1" stopColor="#040608" /></linearGradient>
      <radialGradient id={`math-glow-${variant}`} cx="43%" cy="48%" r="52%"><stop stopColor="#59dff4" stopOpacity={variant === 'after' ? '.16' : '.05'} /><stop offset="1" stopColor="#59dff4" stopOpacity="0" /></radialGradient>
      <pattern id={`math-grid-${variant}`} width="34" height="34" patternUnits="userSpaceOnUse"><path d="M34 0H0V34" fill="none" stroke="#26343b" strokeWidth=".75" opacity={variant === 'after' ? '.48' : '.2'} /></pattern>
      <filter id={`math-soft-${variant}`}><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    <rect width="960" height="540" fill={`url(#math-bg-${variant})`} /><rect width="960" height="540" fill={`url(#math-grid-${variant})`} /><rect width="960" height="540" fill={`url(#math-glow-${variant})`} />

    {variant === 'after' && <g className="road-story" opacity={roadOut}>
      <text className="road-kicker" x="108" y="117">POSITION → VELOCITY</text>
      <text className="road-question" x="108" y="178">这一刻，</text><text className="road-question cyan" x="108" y="231">到底有多快？</text>
      <line className="road-line" x1="105" y1="380" x2="650" y2="380" />
      {[0, 1, 2, 3, 4, 5].map((item) => <line key={item} className="road-mark" x1={134 + item * 95} y1="380" x2={159 + item * 95} y2="380" />)}
      <g className="code-car" transform={`translate(${carX} 0)`}>
        <path d="M0 348H72L61 329H25L14 339H0Z" /><rect x="-8" y="349" width="92" height="19" rx="7" />
        <circle cx="14" cy="370" r="10" /><circle cx="65" cy="370" r="10" /><circle className="wheel-core" cx="14" cy="370" r="4" /><circle className="wheel-core" cx="65" cy="370" r="4" />
        <line x1="-26" y1="342" x2="-7" y2="342" /><line x1="-42" y1="354" x2="-12" y2="354" />
      </g>
      <g className="speed-readout"><text x="108" y="319">t = {(progress * 18).toFixed(1)}s</text><text x="244" y="319">v(t) = ?</text></g>
      <text className="road-note" x="108" y="426">平均速度很容易；但一个瞬间没有宽度。</text>
    </g>}

    <g className="math-plot" opacity={(variant === 'before' ? .72 : plotIn) * (1 - formulaIn * .12)}>
      <path className="math-axis" d="M74 440H682M100 486V64" />
      <path className="math-arrows" d="M672 434L682 440L672 446M94 75L100 64L106 75" />
      <text className="axis-label" x="662" y="472">x</text><text className="axis-label" x="119" y="82">f(x)</text>
      <path className="curve-aura" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - draw} d="M100 440 Q360 440 650 100" opacity={draw} />
      <path className="curve-main" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - draw} d="M100 440 Q360 440 650 100" />

      {variant === 'after' && <>
        <g className="tangent-group" opacity={tangentIn}>
          <line className="tangent-line" {...tangent} />
          <circle className="point-halo" cx={x} cy={y} r="21" /><circle className="point-core" cx={x} cy={y} r="8" />
        </g>
        <g className="secant-group" opacity={deltaIn}>
          <line x1={x} y1={y} x2={nextX} y2={nextY} />
          <circle cx={nextX} cy={nextY} r="6" />
          <path d={`M${x} ${nextY}H${nextX}V${y}`} />
          <text x={(x + nextX) / 2 - 12} y={nextY - 12}>Δx</text><text x={nextX + 13} y={(y + nextY) / 2}>Δy</text>
        </g>
      </>}
      {variant === 'before' && <circle className="before-dot" cx={x} cy={y} r="7" />}
    </g>

    {variant === 'after' ? <>
      <g className="chapter-copy" key={chapter}>
        <text className="scene-kicker" x="672" y="104">CHAPTER {String(chapter + 1).padStart(2, '0')} / 04</text>
        <text className="scene-headline" x="672" y="162">{chapterCopy[0]}</text>
        <text className="scene-headline cyan" x="672" y="207">{chapterCopy[1]}</text>
        <line x1="672" y1="239" x2="896" y2="239" />
        <text className="scene-body" x="672" y="280">局部尺度不断缩小</text>
        <text className="scene-body" x="672" y="308">曲线逐渐接近它的切线</text>
      </g>
      <g className="formula-reveal" opacity={formulaIn}>
        <rect x="620" y="337" width="291" height="112" rx="8" />
        <text className="formula-label" x="642" y="367">INSTANTANEOUS SLOPE</text>
        <text className="formula-main" x="642" y="412">f′(a) = lim</text>
        <text className="formula-limit" x="752" y="433">h→0</text>
        <text className="formula-numerator" x="803" y="393">f(a+h)−f(a)</text><line x1="798" y1="402" x2="895" y2="402" /><text className="formula-fraction" x="842" y="430">h</text>
      </g>
      <g className="scene-meta"><text x="34" y="39">AXIOM / DERIVATIVE.SCENE()</text><text x="785" y="507">FRAME {String(Math.round(progress * 540)).padStart(3, '0')} / 540</text></g>
      <g className="scene-chapter-bars">{[0, 1, 2, 3].map((item) => <rect key={item} x={34 + item * 94} y="497" width="78" height="3" rx="2" className={item <= chapter ? 'filled' : ''} />)}</g>
    </> : <g className="before-copy"><text x="715" y="180">导数</text><text x="715" y="236">f′(x)</text><text x="715" y="284">曲线上某一点的斜率</text></g>}
  </svg>
}

function ProductScene({ variant, progress }: { variant: 'before' | 'after'; progress: number }) {
  const chapter = Math.min(3, Math.floor(progress * 4))
  const frame = progress * PRODUCT_FILM_SPEC.durationInFrames
  const enter = ramp(frame, 0, 65)
  const deviceIn = ramp(frame, 90, 155)
  const featuresIn = ramp(frame, 210, 265)
  const brandIn = ramp(frame, 300, 340)
  const floatY = Math.sin(progress * Math.PI * 4) * 6
  return <svg className={`scene-svg product-film ${variant}`} viewBox="0 0 960 540" role="img" aria-label={`${variant === 'after' ? '代码成片' : '基础版本'}产品动画`}>
    <defs>
      <linearGradient id={`product-bg-${variant}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#19171b" /><stop offset="1" stopColor="#07080a" /></linearGradient>
      <linearGradient id={`brand-fill-${variant}`} x1="0" x2="1"><stop stopColor="#ff8a70" /><stop offset="1" stopColor="#ff4e71" /></linearGradient>
      <filter id={`device-shadow-${variant}`}><feDropShadow dx="0" dy="22" stdDeviation="20" floodOpacity=".4" /></filter>
    </defs>
    <rect width="960" height="540" fill={`url(#product-bg-${variant})`} />
    {variant === 'after' && <><circle cx="120" cy="90" r="285" fill="#ff665e" opacity=".07" /><circle cx="890" cy="500" r="280" fill="#6558ff" opacity=".1" /><path className="brand-grid" d="M0 108H960M0 216H960M0 324H960M0 432H960M192 0V540M384 0V540M576 0V540M768 0V540" /></>}

    <g className="device" transform={`translate(${variant === 'after' ? 70 - deviceIn * 70 : 0} ${variant === 'after' ? floatY : 0})`} opacity={variant === 'after' ? .25 + deviceIn * .75 : 1} filter={`url(#device-shadow-${variant})`}>
      <rect x="574" y="57" width="246" height="424" rx="39" fill="#080a0d" stroke={variant === 'after' ? '#3a3f48' : '#272b31'} strokeWidth="5" />
      <rect x="594" y="79" width="206" height="380" rx="25" fill={variant === 'after' ? '#f3efe8' : '#24272c'} />
      <rect x="660" y="92" width="74" height="8" rx="4" fill="#111419" />
      <text className="app-logo" x="617" y="148">F</text><text className="app-title" x="653" y="143">Good morning</text><text className="app-sub" x="653" y="161">3 ideas need attention</text>
      {[0, 1, 2].map((item) => <g key={item} className="feature-card" opacity={variant === 'after' ? Math.min(1, featuresIn + item * .2) : 1} transform={`translate(0 ${item * 78})`}><rect x="614" y="197" width="166" height="62" rx="13" fill={variant === 'after' ? (item === 0 ? '#171a20' : '#dedad2') : '#35393f'} /><circle cx="634" cy="218" r="8" fill={variant === 'after' ? '#ff6f59' : '#5e646c'} /><rect x="652" y="210" width="96" height="9" rx="4" fill={variant === 'after' && item === 0 ? '#fff' : '#646a71'} /><rect x="652" y="229" width={item === 1 ? 76 : 58} height="6" rx="3" fill="#81868c" /><text x="628" y="250">0{item + 1}</text></g>)}
    </g>

    {variant === 'after' ? <g className="brand-copy" opacity={.3 + enter * .7}>
      <text className="brand-kicker" x="76" y="103">FLUX NOTE / PRODUCT FILM</text>
      <text className="brand-title" x="76" y="184">Ideas move</text><text className="brand-title outline" x="76" y="256">at your speed.</text>
      <text className="brand-sub" x="81" y="308">捕捉灵感。组织思考。保持流动。</text>
      <g opacity={brandIn}><rect x="78" y="354" width="174" height="51" rx="26" fill={`url(#brand-fill-${variant})`} /><text className="brand-cta" x="120" y="386">MEET FLUX</text></g>
      <g className="brand-stats" opacity={featuresIn}><text x="80" y="460">03 FEATURES</text><text x="218" y="460">12 SEC</text><text x="320" y="460">100% CODE</text></g>
      <g className="scene-meta"><text x="34" y="39">AXIOM / PRODUCT.LAUNCH()</text><text x="785" y="507">CHAPTER {chapter + 1} / 04</text></g>
    </g> : <g className="product-before-copy"><text x="79" y="184">Flux Note</text><text x="79" y="232">一款全新的效率工具</text><rect x="79" y="272" width="155" height="44" rx="6" /><text x="118" y="300">了解更多</text></g>}
  </svg>
}

function UploadedScene({ media, variant, playing, ops }: { media: UploadedMedia; variant: 'before' | 'after'; playing: boolean; ops: EditOps }) {
  return <div className={`uploaded-film ${variant} ${ops.color && variant === 'after' ? 'graded' : ''}`}>
    <video src={media.url} muted loop autoPlay={playing} playsInline />
    {variant === 'after' && <div className="video-overlay">
      {ops.motion && <div className="tracking-frame"><i /><i /><i /><i /><span>SUBJECT / TRACKED</span></div>}
      <div className="upload-title"><span>CODE DIRECTED / LOCAL SOURCE</span><strong>{media.name.replace(/\.[^.]+$/, '').slice(0, 28)}</strong></div>
      {ops.captions && <div className="upload-caption"><span>AUTO CAPTION · 00:03</span><strong>让素材跟随故事，而不是模板。</strong></div>}
      {ops.smartCrop && <div className="crop-status"><span /> SMART CROP / 16:9</div>}
    </div>}
  </div>
}

function App() {
  const [activeDemo, setActiveDemo] = useState<DemoId>('math')
  const [compareMode, setCompareMode] = useState<CompareMode>('after')
  const [stage, setStage] = useState<PipelineStage>('idle')
  const [activeStep, setActiveStep] = useState(-1)
  const [plan, setPlan] = useState(initialPlan)
  const [prompt, setPrompt] = useState(DEMOS.math.prompt)
  const [playing, setPlaying] = useState(true)
  const [progress, setProgress] = useState(.08)
  const [uploaded, setUploaded] = useState<UploadedMedia | null>(null)
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ configured: false, model: 'deepseek-v4-flash' })
  const [editOps, setEditOps] = useState<EditOps>({ captions: true, smartCrop: true, color: true, motion: true })
  const [showCode, setShowCode] = useState(false)
  const [showPresentation, setShowPresentation] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const runToken = useRef(0)

  const demo = DEMOS[activeDemo]
  const sourceType: DemoId | 'upload' = uploaded ? 'upload' : activeDemo
  const duration = uploaded ? 24 : demo.duration
  const displayChapters = uploaded ? UPLOAD_CHAPTERS : demo.chapters
  const isRunning = ['planning', 'building', 'checking'].includes(stage)
  const currentChapter = Math.min(3, displayChapters.reduce((last, chapter, index) => progress * duration >= chapter.time ? index : last, 0))

  useEffect(() => {
    fetch('/api/status').then((response) => response.json()).then((data) => setApiStatus({ configured: Boolean(data.configured), model: data.model || 'deepseek-v4-flash' })).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => setProgress((value) => value >= 1 ? 0 : value + 1 / (duration * 20)), 50)
    return () => window.clearInterval(timer)
  }, [duration, playing])

  useEffect(() => () => { runToken.current += 1 }, [])

  const generatedCode = useMemo(() => {
    if (uploaded) return sceneSpecCode('videoEdit', {
      fps: 30,
      durationInFrames: 720,
      source: { type: 'local-object-url', file: uploaded.name, leavesBrowser: false },
      operations: [
        editOps.smartCrop && { type: 'smartCrop', subject: 'auto', ratio: '16:9' },
        editOps.color && { type: 'colorGrade', contrast: 1.08, warmth: -0.06 },
        editOps.captions && { type: 'captions', source: 'speech', style: 'bold-center' },
        editOps.motion && { type: 'motionFrame', enter: 'spring(18)', tracking: true },
      ].filter(Boolean),
    })
    if (activeDemo === 'math') return sceneSpecCode('derivativeFilm', MATH_FILM_SPEC)
    return sceneSpecCode('productFilm', PRODUCT_FILM_SPEC)
  }, [activeDemo, editOps, uploaded])

  const selectDemo = (id: DemoId) => {
    if (uploaded?.url) URL.revokeObjectURL(uploaded.url)
    setUploaded(null)
    setActiveDemo(id)
    setPrompt(DEMOS[id].prompt)
    setPlan(buildLocalPlan(DEMOS[id].prompt, id))
    setStage('idle')
    setActiveStep(-1)
    setProgress(.02)
    setPlaying(true)
    setCompareMode('after')
  }

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (uploaded?.url) URL.revokeObjectURL(uploaded.url)
    const media = { name: file.name, url: URL.createObjectURL(file), size: formatBytes(file.size) }
    setUploaded(media)
    setPlan(buildLocalPlan(`对 ${file.name} 进行代码驱动剪辑`, 'upload'))
    setPrompt(`剪辑 ${file.name}：保留真实画面，通过代码加入字幕、构图跟踪、调色和运动图形。`)
    setStage('idle')
    setActiveStep(-1)
    setProgress(0)
    setCompareMode('after')
    event.target.value = ''
  }

  const generate = async () => {
    if (!prompt.trim() || isRunning) return
    const token = ++runToken.current
    setStage('planning')
    setPlaying(false)
    setActiveStep(0)
    setProgress(.03)
    let nextPlan = buildLocalPlan(prompt, sourceType)
    if (apiStatus.configured) try {
      const response = await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      if (response.ok) nextPlan = await response.json()
    } catch { /* local deterministic plan remains active */ }
    if (runToken.current !== token) return
    setPlan(nextPlan)
    await new Promise((resolve) => window.setTimeout(resolve, 380))
    setStage('building')
    for (let index = 0; index < nextPlan.steps.length; index += 1) {
      if (runToken.current !== token) return
      setActiveStep(index)
      setProgress(.08 + index * .11)
      await new Promise((resolve) => window.setTimeout(resolve, 360))
    }
    setStage('checking')
    setActiveStep(nextPlan.steps.length)
    await new Promise((resolve) => window.setTimeout(resolve, 520))
    if (runToken.current !== token) return
    setStage('ready')
    setProgress(0)
    setPlaying(true)
    setCompareMode('after')
  }

  const openPresentation = () => {
    setProgress(0)
    setPlaying(true)
    setCompareMode('after')
    setShowPresentation(true)
  }

  const downloadProject = () => {
    const project = { schema: 'axiom-cut/v0.4', source: uploaded ? { name: uploaded.name, size: uploaded.size, localOnly: true } : { demo: activeDemo }, prompt, plan, operations: editOps, code: generatedCode }
    const url = URL.createObjectURL(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'axiom-cut-code-project.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const renderScene = (variant: 'before' | 'after') => uploaded
    ? <UploadedScene media={uploaded} variant={variant} playing={playing} ops={editOps} />
    : activeDemo === 'math'
      ? <MathScene variant={variant} progress={progress} />
      : <ProductScene variant={variant} progress={progress} />

  const statusText = {
    idle: ['CODE READY', '画面由代码逐帧生成'],
    planning: ['PLANNING', '正在拆分叙事章节'],
    building: ['BUILDING', `生成场景 ${Math.min(activeStep + 1, 6)}/6`],
    checking: ['VERIFYING', '检查遮挡与数学一致性'],
    ready: ['RENDER READY', '代码工程已通过检查'],
  }[stage]

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Scissors size={20} /></div><div><strong>AXIOM CUT</strong><span>CODE-DIRECTED FILMS</span></div></div>
      <nav className="demo-switch" aria-label="选择演示项目">
        <button className={!uploaded && activeDemo === 'math' ? 'active' : ''} onClick={() => selectDemo('math')}><span>01</span><div><small>数学动画</small><strong>导数 · 局部线性</strong></div></button>
        <button className={!uploaded && activeDemo === 'product' ? 'active' : ''} onClick={() => selectDemo('product')}><span>02</span><div><small>品牌短片</small><strong>Flux Note</strong></div></button>
      </nav>
      <div className="top-actions">
        <div className="code-badge"><Code2 size={16} /><span>0 AI IMAGES</span></div>
        <button className="upload-button" onClick={() => fileRef.current?.click()}><Upload size={17} /> 上传视频</button>
        <button className="present-button" onClick={openPresentation}><Expand size={17} /> 演示播放</button>
        <button className="icon-button" onClick={() => setShowExport(true)} aria-label="导出工程"><Download size={18} /></button>
        <a className="icon-button" href="https://github.com/BenCraf/axiom-cut" target="_blank" rel="noreferrer" aria-label="GitHub"><Github size={18} /></a>
      </div>
    </header>

    <input ref={fileRef} type="file" accept="video/*" hidden onChange={handleUpload} />

    <main className="workspace">
      <section className="showcase-column">
        <div className="showcase-head">
          <div><span>{uploaded ? 'LOCAL VIDEO / CODE OVERLAY' : demo.label}</span><h1>{uploaded ? plan.projectTitle : demo.title}</h1><p>{uploaded ? `${uploaded.name} · ${uploaded.size} · 素材不离开浏览器` : `每一帧都由代码计算，而不是由模型猜测像素。 · ${demo.description}`}</p></div>
          <div className="showcase-proof"><span><Layers3 size={14} /> {uploaded ? 'VIDEO + SVG' : 'REACT SVG'}</span><span><Zap size={14} /> 30 FPS</span><span><ShieldCheck size={14} /> DETERMINISTIC</span></div>
        </div>

        <div className="hero-stage">
          <div className="view-switcher"><button className={compareMode === 'before' ? 'active' : ''} onClick={() => setCompareMode('before')}>基础版</button><button className={compareMode === 'split' ? 'active' : ''} onClick={() => setCompareMode('split')}><SplitSquareHorizontal size={15} /> 前后对比</button><button className={compareMode === 'after' ? 'active' : ''} onClick={() => setCompareMode('after')}>代码成片</button></div>
          <div className={`hero-frame mode-${compareMode}`}>
            {(compareMode === 'before' || compareMode === 'split') && <div className="compare-pane"><span className="pane-label">BEFORE / BASIC</span>{renderScene('before')}</div>}
            {(compareMode === 'after' || compareMode === 'split') && <div className="compare-pane"><span className="pane-label code">AFTER / CODE FILM</span>{renderScene('after')}</div>}
            {compareMode === 'split' && <div className="split-line"><span><SplitSquareHorizontal size={15} /></span></div>}
          </div>
          <div className={`floating-status ${stage}`}><span /><div><small>{statusText[0]}</small><strong>{statusText[1]}</strong></div><code>{String(Math.round(progress * duration)).padStart(2, '0')}s</code></div>
        </div>

        <div className="transport">
          <button className="transport-reset" onClick={() => setProgress(0)}><RefreshCw size={17} /></button>
          <button className="transport-play" onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</button>
          <strong>00:{String(Math.round(progress * duration)).padStart(2, '0')}</strong><span>/ 00:{String(duration).padStart(2, '0')}</span>
          <div className="transport-track"><i style={{ width: `${progress * 100}%` }} /><b style={{ left: `${progress * 100}%` }} /></div>
          <button className="code-open" onClick={() => setShowCode(true)}><FileCode2 size={17} /> 查看场景代码</button>
        </div>

        <div className="chapter-strip">
          {displayChapters.map((chapter, index) => <button className={currentChapter === index ? 'active' : ''} key={chapter.label} onClick={() => { setProgress(chapter.time / duration); setPlaying(false) }}><span>{chapter.label}</span><strong>{chapter.detail}</strong><i /></button>)}
        </div>
      </section>

      <aside className="director-panel">
        <div className="director-head"><div className="director-icon"><BrainCircuit size={22} /></div><div><span>CODE DIRECTOR</span><h2>让模型写计划，让代码画画面</h2></div></div>

        <div className="prompt-box">
          <WandSparkles size={20} />
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="描述你想要的叙事和运动…" />
          <footer><span>{apiStatus.configured ? `DeepSeek · ${apiStatus.model}` : 'Local deterministic mode'}</span><button onClick={generate} disabled={isRunning || !prompt.trim()}>{isRunning ? <RefreshCw className="spin" size={18} /> : <ArrowUp size={19} />}</button></footer>
        </div>

        {uploaded && <div className="source-card"><Video size={20} /><div><span>本地视频</span><strong>{uploaded.name}</strong><small>{uploaded.size} · Object URL</small></div><button onClick={() => selectDemo(activeDemo)}><X size={16} /></button></div>}

        <div className="director-scroll">
          <div className="section-heading"><span>代码操作</span><b>{Object.values(editOps).filter(Boolean).length}/4 开启</b></div>
          <div className="operation-grid">
            {([['captions', '自动字幕', 'speech → timecode'], ['smartCrop', '主体裁切', 'track → 16:9'], ['color', '程序调色', 'params → grade'], ['motion', '运动图形', 'SVG → frames']] as [keyof EditOps, string, string][]).map(([key, title, detail]) => <button key={key} className={editOps[key] ? 'enabled' : ''} onClick={() => setEditOps((value) => ({ ...value, [key]: !value[key] }))}><span><Check size={13} /></span><div><strong>{title}</strong><small>{detail}</small></div></button>)}
          </div>

          <div className="section-heading"><span>生成过程</span><b>{Math.max(0, Math.min(activeStep + (stage === 'ready' ? 1 : 0), 6))}/6</b></div>
          <div className="step-list">
            {plan.steps.map((step, index) => {
              const done = stage === 'ready' || activeStep > index
              const active = isRunning && activeStep === index
              return <div className={`step-item ${done ? 'done' : ''} ${active ? 'active' : ''}`} key={step.id}><div>{done ? <Check size={14} /> : String(index + 1).padStart(2, '0')}</div><p><strong>{step.title}</strong><span>{step.detail}</span></p><code>{step.tool}</code></div>
            })}
          </div>

          <div className="render-contract"><div><ShieldCheck size={19} /><strong>可复现渲染契约</strong><span>PASS</span></div><p>模型只输出章节、参数和操作；SVG、视频图层与每一帧都由代码计算。</p><ul><li><Check size={13} /> 0 张 AI 生图</li><li><Check size={13} /> frame-based</li><li><Check size={13} /> 可查看源码</li><li><Check size={13} /> 同输入同画面</li></ul></div>
        </div>
      </aside>
    </main>

    {showCode && <div className="drawer-backdrop" onMouseDown={() => setShowCode(false)}><div className="code-drawer" onMouseDown={(event) => event.stopPropagation()}><header><div><FileCode2 size={20} /><span>SCENE SOURCE OF TRUTH</span><strong>{uploaded ? 'video-edit.scene.ts' : activeDemo === 'math' ? 'derivative-film.scene.ts' : 'product-film.scene.ts'}</strong></div><div><span><Check size={14} /> Type-safe</span><span><Check size={14} /> No generated pixels</span><button onClick={() => setShowCode(false)}><X size={19} /></button></div></header><div className="code-editor"><div>{generatedCode.split('\n').map((_, index) => <span key={index}>{index + 1}</span>)}</div><pre><code>{generatedCode}</code></pre></div></div></div>}

    {showPresentation && <div className="presentation-mode">
      <header><div className="brand"><div className="brand-mark"><Scissors size={20} /></div><div><strong>AXIOM CUT</strong><span>LIVE CODE FILM</span></div></div><div className="presentation-title"><span>{uploaded ? 'LOCAL VIDEO' : demo.label}</span><strong>{uploaded ? plan.projectTitle : demo.title}</strong></div><button onClick={() => setShowPresentation(false)}><X size={22} /> 退出演示</button></header>
      <div className="presentation-canvas">{renderScene('after')}</div>
      <footer><button onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}</button><strong>00:{String(Math.round(progress * duration)).padStart(2, '0')} / 00:{String(duration).padStart(2, '0')}</strong><div><i style={{ width: `${progress * 100}%` }} /></div><span><Code2 size={16} /> LIVE SVG · NO AI IMAGES</span></footer>
    </div>}

    {showExport && <div className="modal-backdrop" onMouseDown={() => setShowExport(false)}><div className="export-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowExport(false)}><X size={20} /></button><div className="export-icon"><FileCode2 size={30} /></div><span>REPRODUCIBLE PROJECT</span><h2>导出代码动画工程</h2><p>包含场景代码、章节时间、操作参数和素材引用。上传的视频本体不会写入导出文件。</p><div className="export-grid"><div><span>SCHEMA</span><strong>v0.4</strong></div><div><span>SCENES</span><strong>04</strong></div><div><span>FPS</span><strong>30</strong></div></div><button className="download-project" onClick={downloadProject}><Download size={18} /> 下载工程 JSON</button><small>真实 MP4 输出仍需接入 Remotion / FFmpeg Worker。</small></div></div>}
  </div>
}

export default App
