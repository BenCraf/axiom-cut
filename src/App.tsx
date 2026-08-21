import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUp,
  AudioLines,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Code2,
  Cpu,
  Download,
  Eye,
  Film,
  FlaskConical,
  FolderOpen,
  Gauge,
  GitCompareArrows,
  Github,
  History,
  Image,
  LayoutGrid,
  Layers3,
  Maximize2,
  MessageSquareText,
  MoreHorizontal,
  PanelRight,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Rocket,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Video,
  Volume2,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react'

type PlanStep = {
  id: string
  title: string
  detail: string
  tool: string
  duration: string
}

type AgentPlan = {
  projectTitle: string
  summary: string
  accent: string
  equation: string
  steps: PlanStep[]
  demo?: boolean
  model?: string
}

type EvolutionMetric = {
  label: string
  value: number
  previous: number
}

type Mutation = {
  id: string
  title: string
  detail: string
  expectedGain: string
  selected: boolean
}

type EvolutionResult = {
  version: string
  previousVersion: string
  score: number
  previousScore: number
  delta: number
  metrics: EvolutionMetric[]
  mutations: Mutation[]
  rationale: string
  memory: string[]
  evolvedPlan: AgentPlan
  demo?: boolean
}

type PipelineStage = 'idle' | 'planning' | 'executing' | 'evaluating' | 'evolving' | 'ready'

type ApiStatus = {
  configured: boolean
  model: string
}

const initialEvolution: EvolutionResult = {
  version: 'v1.0',
  previousVersion: '—',
  score: 78.6,
  previousScore: 0,
  delta: 0,
  metrics: [
    { label: '叙事清晰度', value: 82, previous: 0 },
    { label: '构图平衡', value: 79, previous: 0 },
    { label: '节奏控制', value: 74, previous: 0 },
    { label: '视觉连续性', value: 80, previous: 0 },
  ],
  mutations: [],
  rationale: '运行完整 Demo 后，Agent 会基于画面指标生成并选择更优版本。',
  memory: ['数学对象优先于装饰', '保持深色背景与高对比标注'],
  evolvedPlan: {} as AgentPlan,
  demo: true,
}

const initialPlan: AgentPlan = {
  projectTitle: '欧拉公式 · 几何直觉',
  summary: '从单位圆出发，把旋转、投影与复指数串成一段 18 秒数学动画。',
  accent: '#58c4dd',
  equation: 'eⁱˣ = cos(x) + i sin(x)',
  steps: [
    { id: '01', title: '理解目标', detail: '识别主题、节奏与视觉语言', tool: 'reason', duration: '0.8s' },
    { id: '02', title: '拆解镜头', detail: '生成 4 段叙事结构', tool: 'plan', duration: '1.2s' },
    { id: '03', title: '构建几何场景', detail: '绘制复平面、单位圆与轨迹', tool: 'compose', duration: '2.4s' },
    { id: '04', title: '编排动画', detail: '匹配缓动、字幕与转场', tool: 'animate', duration: '1.8s' },
    { id: '05', title: '检查画面', detail: '验证遮挡、节奏和安全区', tool: 'inspect', duration: '1.1s' },
    { id: '06', title: '准备渲染', detail: '生成确定性时间线配置', tool: 'render', duration: '0.9s' },
  ],
  demo: true,
  model: 'Local demo',
}

const samples = [
  '用 18 秒解释欧拉公式：从单位圆旋转到 eⁱˣ，蓝黄配色，节奏克制。',
  '把黄金分割做成 15 秒竖屏动画，从矩形递归到螺旋线。',
  '用几何方式解释勾股定理，正方形重排，最后停在 a²+b²=c²。',
]

const assets = [
  { icon: Image, name: 'complex-plane.svg', meta: 'SVG · 42 KB', color: 'cyan' },
  { icon: Code2, name: 'euler-scene.tsx', meta: 'CODE · 3.8 KB', color: 'yellow' },
  { icon: AudioLines, name: 'ambient-pulse.wav', meta: 'AUDIO · 0:18', color: 'green' },
]

const createLocalPlan = (brief: string): AgentPlan => {
  const isGolden = /黄金|golden/i.test(brief)
  const isPythagoras = /勾股|pythag/i.test(brief)
  return {
    ...initialPlan,
    projectTitle: isGolden ? '黄金分割 · 生长秩序' : isPythagoras ? '勾股定理 · 面积证明' : '欧拉公式 · 几何直觉',
    summary: brief.slice(0, 88),
    accent: isGolden ? '#f4d35e' : isPythagoras ? '#83c78f' : '#58c4dd',
    equation: isGolden ? 'φ = (1 + √5) / 2' : isPythagoras ? 'a² + b² = c²' : 'eⁱˣ = cos(x) + i sin(x)',
  }
}

const createLocalEvolution = (brief: string, sourcePlan: AgentPlan, previous: EvolutionResult): EvolutionResult => {
  const minor = Number(previous.version.match(/\.(\d+)/)?.[1] || 0) + 1
  const previousScore = previous.score || 78.6
  const score = Math.min(96.8, Number((previousScore + Math.max(3.2, 12.1 - minor * 1.4)).toFixed(1)))
  const previousValues = previous.metrics.map((metric) => metric.value)
  const gains = [10, 13, 12, 11]
  const labels = ['叙事清晰度', '构图平衡', '节奏控制', '视觉连续性']
  return {
    version: `v1.${minor}`,
    previousVersion: previous.version,
    score,
    previousScore,
    delta: Number((score - previousScore).toFixed(1)),
    metrics: labels.map((label, index) => ({ label, previous: previousValues[index], value: Math.min(98, previousValues[index] + gains[index]) })),
    mutations: [
      { id: 'μ-01', title: '强化视觉锚点', detail: '核心几何对象先于公式出现，降低首屏认知负担。', expectedGain: '+8.4', selected: true },
      { id: 'μ-02', title: '提高运动密度', detail: '缩短停顿并增加轨迹残影，画面更有冲击力。', expectedGain: '+5.1', selected: false },
      { id: 'μ-03', title: '公式分步显影', detail: '按推导顺序拆分公式，但会增加整体时长。', expectedGain: '+4.6', selected: false },
    ],
    rationale: 'μ-01 同时提高叙事清晰度和构图平衡，且不改变原有 18 秒节奏，因此被选为本轮最优变体。',
    memory: ['核心对象先出现，再给出符号解释', '深色背景 + 蓝黄高对比标注', '每个结论至少保留 1.2 秒阅读时间'],
    evolvedPlan: { ...sourcePlan, summary: `${sourcePlan.summary.replace(/[。.]$/, '')}；核心对象提前 12 帧，公式按视觉锚点同步显影。`, accent: /黄金|golden/i.test(brief) ? '#ffd86a' : '#67d7ed' },
    demo: true,
  }
}

function MathScene({ playing, progress, equation, accent, version, score, evolved }: { playing: boolean; progress: number; equation: string; accent: string; version: string; score: number; evolved: boolean }) {
  return (
    <svg className={`math-scene ${playing ? 'is-playing' : ''}`} viewBox="0 0 960 540" role="img" aria-label="欧拉公式数学动画预览">
      <defs>
        <radialGradient id="sceneGlow" cx="45%" cy="45%" r="58%">
          <stop offset="0" stopColor={accent} stopOpacity=".12" />
          <stop offset="1" stopColor="#070a0f" stopOpacity="0" />
        </radialGradient>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <pattern id="tinyGrid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#26303a" strokeWidth=".6" opacity=".42" />
        </pattern>
      </defs>

      <rect width="960" height="540" fill="#080b10" />
      <rect width="960" height="540" fill="url(#tinyGrid)" />
      <rect width="960" height="540" fill="url(#sceneGlow)" />

      <g className="axes" opacity=".72">
        <line x1="78" y1="290" x2="628" y2="290" />
        <line x1="340" y1="62" x2="340" y2="500" />
        <path d="M 618 284 L 628 290 L 618 296" />
        <path d="M 334 72 L 340 62 L 346 72" />
        <text x="608" y="316">Re</text>
        <text x="356" y="78">Im</text>
      </g>

      <g className="math-construct" style={{ '--accent': accent } as React.CSSProperties}>
        <circle className="unit-circle ghost" cx="340" cy="290" r="155" />
        <circle className="unit-circle draw" cx="340" cy="290" r="155" />
        <path className="angle-arc" d="M 395 290 A 55 55 0 0 0 376 246" />
        <text className="theta" x="398" y="265">θ</text>

        <g className="radius-arm">
          <line x1="340" y1="290" x2="450" y2="180" />
          <line className="projection" x1="450" y1="180" x2="450" y2="290" />
          <line className="projection projection-x" x1="340" y1="180" x2="450" y2="180" />
          <circle className="orbit-dot" cx="450" cy="180" r="7" />
        </g>

        <text className="label label-cos" x="382" y="315">cos θ</text>
        <text className="label label-sin" x="466" y="238">sin θ</text>
        <text className="point-label" x="466" y="171">(cos θ, sin θ)</text>
      </g>

      <g className="equation-card">
        <text className="eyebrow" x="650" y="126">THE COMPLEX PLANE</text>
        <text className="main-equation" x="650" y="195">{equation}</text>
        <line x1="650" y1="226" x2="878" y2="226" />
        <text className="explain" x="650" y="270">旋转，是复数乘法</text>
        <text className="explain muted" x="650" y="304">半径 1 · 角度 θ · 连续运动</text>
      </g>

      <g className="frame-meta">
        <text x="36" y="42">AXIOM / SCENE 03</text>
        <text x="865" y="508">{String(Math.round(progress * 18)).padStart(2, '0')}:18</text>
      </g>
      <g className={`quality-stamp ${evolved ? 'visible' : ''}`}>
        <rect x="36" y="452" width="136" height="44" rx="3" />
        <text x="49" y="470">EVOLVED {version}</text>
        <text className="quality-score" x="49" y="488">Q SCORE {score.toFixed(1)}</text>
      </g>
      <rect className="scene-progress" x="0" y="534" width={960 * progress} height="6" fill={accent} />
    </svg>
  )
}

function App() {
  const [prompt, setPrompt] = useState(samples[0])
  const [plan, setPlan] = useState(initialPlan)
  const [evolution, setEvolution] = useState<EvolutionResult>({ ...initialEvolution, evolvedPlan: initialPlan })
  const [stage, setStage] = useState<PipelineStage>('idle')
  const [activeStep, setActiveStep] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(.38)
  const [error, setError] = useState('')
  const [showSamples, setShowSamples] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [agentTab, setAgentTab] = useState<'plan' | 'evolution'>('plan')
  const [autoEvolve, setAutoEvolve] = useState(true)
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ configured: false, model: 'deepseek-v4-flash' })
  const timerRef = useRef<number | undefined>(undefined)
  const runTokenRef = useRef(0)
  const lastRunLocalRef = useRef(true)

  const isRunning = ['planning', 'executing', 'evaluating', 'evolving'].includes(stage)
  const completedCount = activeStep < 0 ? 0 : Math.min(activeStep, plan.steps.length)
  const statusLabel = {
    idle: '等待指令',
    planning: '正在规划',
    executing: `正在执行 ${Math.min(activeStep + 1, plan.steps.length)}/${plan.steps.length}`,
    evaluating: '正在自评',
    evolving: '选择最优变体',
    ready: '渲染就绪',
  }[stage]

  useEffect(() => {
    if (!isPlaying) return
    const timer = window.setInterval(() => setProgress((value) => value >= 1 ? 0 : value + .0025), 80)
    return () => window.clearInterval(timer)
  }, [isPlaying])

  useEffect(() => {
    fetch('/api/status')
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setApiStatus({ configured: Boolean(data.configured), model: data.model || 'deepseek-v4-flash' }))
      .catch(() => setApiStatus({ configured: false, model: 'deepseek-v4-flash' }))
  }, [])

  useEffect(() => () => {
    window.clearTimeout(timerRef.current)
    runTokenRef.current += 1
  }, [])

  const timelinePosition = useMemo(() => `${Math.round(progress * 100)}%`, [progress])

  const delay = (milliseconds: number, token: number) => new Promise<boolean>((resolve) => {
    timerRef.current = window.setTimeout(() => resolve(runTokenRef.current === token), milliseconds)
  })

  const runEvolution = async (sourcePlan: AgentPlan, brief: string, token: number, localOnly = false) => {
    setStage('evaluating')
    setAgentTab('evolution')
    setEvolution((previous) => ({
      ...previous,
      mutations: [],
      evolvedPlan: sourcePlan,
      rationale: '正在检查画面层级、节奏、构图与连续性…',
    }))
    if (!await delay(750, token)) return
    let data: EvolutionResult
    if (localOnly) {
      data = createLocalEvolution(brief, sourcePlan, evolution)
    } else try {
      const response = await fetch('/api/evolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: brief, plan: sourcePlan, previousEvolution: evolution }),
      })
      const apiData = await response.json()
      if (!response.ok) throw new Error(apiData.error || '自进化失败')
      data = apiData
    } catch {
      data = createLocalEvolution(brief, sourcePlan, evolution)
    }
    if (runTokenRef.current !== token) return
    setStage('evolving')
    setEvolution(data)
    if (!await delay(1350, token)) return
    setPlan(data.evolvedPlan)
    setStage('ready')
    setIsPlaying(true)
    setProgress(1)
  }

  const runSteps = async (nextPlan: AgentPlan, brief: string, token: number, shouldEvolve: boolean, localOnly: boolean) => {
    setStage('executing')
    for (let index = 0; index < nextPlan.steps.length; index += 1) {
      if (runTokenRef.current !== token) return
      setActiveStep(index)
      setProgress(Math.min(.9, .1 + index * .145))
      if (!await delay(720, token)) return
    }
    setActiveStep(nextPlan.steps.length)
    if (shouldEvolve) await runEvolution(nextPlan, brief, token, localOnly)
    else {
      setStage('ready')
      setProgress(1)
      setIsPlaying(true)
    }
  }

  const generate = async (briefOverride?: string, forceEvolve = false, localOnly = false) => {
    const brief = (briefOverride || prompt).trim()
    if (!brief || isRunning) return
    const token = runTokenRef.current + 1
    runTokenRef.current = token
    lastRunLocalRef.current = localOnly
    window.clearTimeout(timerRef.current)
    setError('')
    setStage('planning')
    setAgentTab('plan')
    setIsPlaying(false)
    setActiveStep(0)
    setProgress(.08)
    setEvolution({ ...initialEvolution, evolvedPlan: initialPlan })
    let data: AgentPlan
    if (localOnly) {
      data = createLocalPlan(brief)
    } else try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: brief }),
      })
      const apiData = await response.json()
      if (!response.ok) throw new Error(apiData.error || '计划生成失败')
      data = apiData
    } catch {
      data = createLocalPlan(brief)
    }
    if (runTokenRef.current !== token) return
    setPlan(data)
    if (!await delay(420, token)) return
    await runSteps(data, brief, token, forceEvolve || autoEvolve, localOnly)
  }

  const startFullDemo = () => {
    const demoPrompt = samples[0]
    setPrompt(demoPrompt)
    setAutoEvolve(true)
    generate(demoPrompt, true, true)
  }

  const evolveAgain = () => {
    if (isRunning) return
    const token = runTokenRef.current + 1
    runTokenRef.current = token
    setIsPlaying(false)
    runEvolution(plan, prompt, token, lastRunLocalRef.current)
  }

  const reset = () => {
    runTokenRef.current += 1
    window.clearTimeout(timerRef.current)
    setPlan(initialPlan)
    setEvolution({ ...initialEvolution, evolvedPlan: initialPlan })
    setStage('idle')
    setActiveStep(-1)
    setIsPlaying(true)
    setProgress(.38)
    setAgentTab('plan')
    setError('')
  }

  const downloadManifest = () => {
    const manifest = { project: plan.projectTitle, prompt, version: evolution.version, qualityScore: evolution.score, plan, evolution, exportedAt: new Date().toISOString() }
    const url = URL.createObjectURL(new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'axiom-cut-project.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const stageMessage = {
    idle: { eyebrow: 'READY TO CREATE', title: '从一句话开始创作', detail: '输入主题，Agent 会完成规划、动画与自进化。' },
    planning: { eyebrow: 'UNDERSTANDING', title: '正在理解你的创作意图', detail: '提取主题、画幅、节奏与视觉语言。' },
    executing: { eyebrow: `CREATING · ${Math.min(activeStep + 1, plan.steps.length)}/${plan.steps.length}`, title: plan.steps[Math.min(activeStep, plan.steps.length - 1)]?.title || '正在创作', detail: plan.steps[Math.min(activeStep, plan.steps.length - 1)]?.detail || '' },
    evaluating: { eyebrow: 'VISUAL CRITIC', title: '正在观看并评价成片', detail: '从叙事、构图、节奏和连续性四个维度检查。' },
    evolving: { eyebrow: 'EVOLUTION', title: '正在选择最优变体', detail: '比较三个候选版本，并记录选择理由。' },
    ready: { eyebrow: `COMPLETE · ${evolution.version}`, title: '成片已完成并通过自评', detail: `综合质量 ${evolution.score.toFixed(1)}，可继续进化或导出工程。` },
  }[stage]

  const stageProgress = { idle: 0, planning: 8, executing: 12 + completedCount / plan.steps.length * 58, evaluating: 76, evolving: 88, ready: 100 }[stage]

  return (
    <div className="studio-shell">
      <header className="studio-topbar">
        <div className="studio-brand"><div className="brand-symbol">∑</div><div><strong>AXIOM CUT</strong><span>MATHEMATICAL FILM STUDIO</span></div></div>
        <div className="project-context"><span className="live-dot" /><strong>{plan.projectTitle}</strong><span>·</span><span>18 秒横版</span><ChevronDown size={15} /></div>
        <div className="studio-actions">
          <div className={`provider-status ${apiStatus.configured ? 'connected' : ''}`}><Zap size={14} /><span>{apiStatus.configured ? 'DeepSeek 已配置' : '本地演示'}</span><i>{apiStatus.configured ? 'READY' : 'DEMO'}</i></div>
          <button className={`evolve-switch ${autoEvolve ? 'on' : ''}`} onClick={() => setAutoEvolve((value) => !value)}><BrainCircuit size={15} /> 自进化 <span>{autoEvolve ? '开启' : '关闭'}</span></button>
          <button className="run-demo" onClick={startFullDemo} disabled={isRunning}><Rocket size={16} /> 完整演示</button>
          <button className="export-primary" onClick={() => setShowExport(true)} disabled={stage !== 'ready'}><Download size={16} /> 导出</button>
        </div>
      </header>

      <main className="studio-main">
        <nav className="tool-rail" aria-label="工作区导航">
          <button className="rail-button active" aria-label="画布"><LayoutGrid size={21} /><span>画布</span></button>
          <button className="rail-button" aria-label="场景"><Video size={21} /><span>场景</span></button>
          <button className="rail-button" aria-label="素材"><Image size={21} /><span>素材</span></button>
          <button className="rail-button" aria-label="声音"><Volume2 size={21} /><span>声音</span></button>
          <div className="rail-divider" />
          <button className="rail-button" aria-label="对话"><MessageSquareText size={21} /><span>对话</span></button>
          <button className="rail-button" aria-label="检查"><PanelRight size={21} /><span>检查</span></button>
          <div className="rail-spacer" />
          <button className="rail-button" aria-label="上传素材"><UploadCloud size={21} /><span>上传</span></button>
          <button className="rail-avatar" aria-label="个人设置">A</button>
        </nav>

        <section className="canvas-column">
          <div className="canvas-head">
            <div><span>SCENE 03 / 04</span><h1>复指数的几何意义</h1></div>
            <div className="canvas-tools"><button><Layers3 size={16} /> 图层</button><button><Code2 size={16} /> 代码</button><button aria-label="全屏"><Maximize2 size={17} /></button></div>
          </div>

          <div className="creative-stage">
            <div className="film-frame">
              <MathScene playing={isPlaying} progress={progress} equation={plan.equation} accent={plan.accent} version={evolution.version} score={evolution.score} evolved={stage === 'ready' && evolution.delta > 0} />
              <div className="format-pill"><span /> 1920 × 1080 · 30 FPS</div>
              <div className={`creation-status ${stage}`}>
                <div className="status-orb">{isRunning ? <span className="spinner" /> : stage === 'ready' ? <Check size={16} /> : <Sparkles size={16} />}</div>
                <div><span>{stageMessage.eyebrow}</span><strong>{stageMessage.title}</strong><p>{stageMessage.detail}</p></div>
                <b>{Math.round(stageProgress)}%</b>
                <div className="creation-progress"><span style={{ width: `${stageProgress}%` }} /></div>
              </div>
            </div>

            <div className="creation-composer">
              <div className="composer-spark"><WandSparkles size={20} /></div>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); generate() }
              }} aria-label="描述想要的动画" placeholder="描述你想制作的数学动画…" />
              <div className="composer-meta">
                <button onClick={() => setShowSamples((value) => !value)}><Sparkles size={14} /> 灵感示例 <ChevronDown size={13} /></button>
                <span>{apiStatus.configured ? `将使用 ${apiStatus.model}` : '使用本地演示 Agent'}</span>
              </div>
              <button className="create-button" onClick={() => generate()} disabled={isRunning || !prompt.trim()} aria-label="开始创作">{isRunning ? <span className="spinner light" /> : <ArrowUp size={20} />}</button>
              {showSamples && <div className="idea-menu"><div><strong>选择一个创作方向</strong><button onClick={() => setShowSamples(false)}><X size={16} /></button></div>{samples.map((sample) => <button key={sample} onClick={() => { setPrompt(sample); setShowSamples(false) }}>{sample}</button>)}</div>}
            </div>
            {error && <div className="error-banner">{error}</div>}
          </div>

          <div className="timeline-panel">
            <div className="timeline-controls">
              <button onClick={() => setProgress(0)} aria-label="回到开始"><RotateCcw size={17} /></button>
              <button className="timeline-play" onClick={() => setIsPlaying((value) => !value)} aria-label={isPlaying ? '暂停' : '播放'}>{isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button>
              <strong>00:{String(Math.round(progress * 18)).padStart(2, '0')}:12</strong><span>/ 00:18:00</span>
              <div className="scene-tabs">{['引入', '单位圆', '复指数', '结论'].map((item, index) => <button className={index === 2 ? 'active' : ''} key={item}>{String(index + 1).padStart(2, '0')} {item}</button>)}</div>
            </div>
            <div className="timeline-tracks">
              <div className="timeline-label"><Film size={15} /> 画面</div>
              <div className="timeline-clips"><div className="timeline-clip cyan" style={{ width: '18%' }}>引入</div><div className="timeline-clip yellow" style={{ width: '24%' }}>单位圆</div><div className="timeline-clip green" style={{ width: '37%' }}>复指数</div><div className="timeline-clip purple" style={{ flex: 1 }}>结论</div><div className="timeline-cursor" style={{ left: timelinePosition }} /></div>
              <div className="timeline-label"><AudioLines size={15} /> 声音</div>
              <div className="audio-line"><span className="waveform" /></div>
            </div>
          </div>
        </section>

        <aside className="director-panel">
          <div className="director-head"><div className="director-icon"><BrainCircuit size={21} /></div><div><span>EVOLUTION DIRECTOR</span><h2>创作过程</h2></div><button onClick={reset}>重置</button></div>
          <div className="director-tabs"><button className={agentTab === 'plan' ? 'active' : ''} onClick={() => setAgentTab('plan')}><Cpu size={16} /> 执行计划 <span>{completedCount}/{plan.steps.length}</span></button><button className={agentTab === 'evolution' ? 'active' : ''} onClick={() => setAgentTab('evolution')}><FlaskConical size={16} /> 自进化 <span>{evolution.version}</span></button></div>

          <div className="director-scroll">
            <div className={`stage-card ${stage}`}><div className="stage-card-top"><span>{stageMessage.eyebrow}</span><b>{statusLabel}</b></div><h3>{stageMessage.title}</h3><p>{stageMessage.detail}</p><div className="stage-card-progress"><span style={{ width: `${stageProgress}%` }} /></div></div>

            {agentTab === 'plan' ? <>
              <div className="brief-card"><span>创作任务</span><p>{plan.summary}</p><div><i>16:9</i><i>18 秒</i><i>数学动画</i>{autoEvolve && <i className="auto-tag">自动进化</i>}</div></div>
              <div className="large-step-list">{plan.steps.map((step, index) => {
                const done = activeStep > index || activeStep >= plan.steps.length
                const active = stage === 'executing' && activeStep === index
                return <div className={`large-step ${done ? 'done' : ''} ${active ? 'active' : ''}`} key={step.id}><div className="large-marker">{done ? <Check size={15} /> : active ? <span className="spinner" /> : String(index + 1).padStart(2, '0')}</div><div><strong>{step.title}</strong><p>{step.detail}</p></div><span>{step.tool}<small>{step.duration}</small></span></div>
              })}</div>
              <div className="safe-note"><ShieldCheck size={18} /><p><strong>全过程可解释</strong>每一步、评分和进化选择都会保留记录。</p></div>
            </> : <div className="evolution-view">
              <div className="score-hero"><div className="big-score"><strong>{evolution.score.toFixed(1)}</strong><span>综合质量</span></div><div><span>当前版本</span><strong>{evolution.version}</strong><p>{evolution.delta > 0 ? `比 ${evolution.previousVersion} 提升 ${evolution.delta.toFixed(1)} 分` : '运行演示后生成新版本'}</p></div></div>
              <div className="section-title"><span>画面自评</span><small>4 个维度</small></div>
              <div className="metric-list">{evolution.metrics.map((metric) => <div className="metric-row" key={metric.label}><div><span>{metric.label}</span><strong>{metric.value}</strong></div><div><span style={{ width: `${metric.value}%` }} /></div></div>)}</div>
              <div className="section-title"><span>候选变体</span><small>{evolution.mutations.length ? '已选择 1 个' : '等待分析'}</small></div>
              <div className="candidate-list">{evolution.mutations.length ? evolution.mutations.map((mutation) => <div className={`candidate ${mutation.selected ? 'selected' : ''}`} key={mutation.id}><span>{mutation.id}</span><div><strong>{mutation.title}</strong><p>{mutation.detail}</p></div><b>{mutation.expectedGain}</b>{mutation.selected && <CheckCircle2 size={17} />}</div>) : <div className="empty-evolution"><FlaskConical size={26} /><strong>还没有进化记录</strong><p>点击顶部“完整演示”，观看 Agent 评价并优化自己的作品。</p></div>}</div>
              {evolution.mutations.length > 0 && <><div className="decision-card"><Eye size={18} /><p><strong>为什么选择它</strong>{evolution.rationale}</p></div><div className="memory-card"><div><History size={17} /><strong>已学到的项目偏好</strong></div>{evolution.memory.map((item) => <span key={item}>{item}</span>)}</div></>}
              <button className="evolve-next" onClick={evolveAgain} disabled={isRunning || stage === 'idle'}><BrainCircuit size={17} /> 再进化一轮</button>
            </div>}
          </div>
        </aside>
      </main>

      {showExport && <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowExport(false)}><div className="export-modal" role="dialog" aria-modal="true" aria-label="导出成片" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowExport(false)} aria-label="关闭"><X size={18} /></button><div className="render-orbit"><span /><span /><CheckCircle2 size={28} /></div><span className="modal-kicker">RENDER COMPLETE</span><h3>{plan.projectTitle}</h3><p>最佳版本 {evolution.version} 已通过视觉检查，时间线与自进化记录已锁定。</p><div className="render-stats"><div><span>QUALITY</span><strong>{evolution.score.toFixed(1)}</strong></div><div><span>FORMAT</span><strong>1080P</strong></div><div><span>DURATION</span><strong>00:18</strong></div><div><span>VERSION</span><strong>{evolution.version}</strong></div></div><div className="render-file"><Film size={19} /><div><strong>axiom-euler-{evolution.version}.mp4</strong><span>H.264 · 12.8 MB · 演示渲染</span></div><Check size={17} /></div><button className="download-manifest" onClick={downloadManifest}><Download size={17} /> 下载可复现工程 JSON</button><small>当前导出工程数据；接入 Remotion 后可用同一时间线渲染真实 MP4。</small></div></div>}
    </div>
  )
}

export default App
