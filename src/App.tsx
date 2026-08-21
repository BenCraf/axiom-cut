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
  Layers3,
  Maximize2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Rocket,
  Settings2,
  ShieldCheck,
  Sparkles,
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
        <text className="eyebrow" x="684" y="126">THE COMPLEX PLANE</text>
        <text className="main-equation" x="684" y="195">{equation}</text>
        <line x1="684" y1="226" x2="874" y2="226" />
        <text className="explain" x="684" y="270">旋转，是复数乘法</text>
        <text className="explain muted" x="684" y="304">半径 1 · 角度 θ · 连续运动</text>
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
  const timerRef = useRef<number | undefined>(undefined)
  const runTokenRef = useRef(0)

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

  useEffect(() => () => {
    window.clearTimeout(timerRef.current)
    runTokenRef.current += 1
  }, [])

  const timelinePosition = useMemo(() => `${Math.round(progress * 100)}%`, [progress])

  const delay = (milliseconds: number, token: number) => new Promise<boolean>((resolve) => {
    timerRef.current = window.setTimeout(() => resolve(runTokenRef.current === token), milliseconds)
  })

  const runEvolution = async (sourcePlan: AgentPlan, brief: string, token: number) => {
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
    try {
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

  const runSteps = async (nextPlan: AgentPlan, brief: string, token: number, shouldEvolve: boolean) => {
    setStage('executing')
    for (let index = 0; index < nextPlan.steps.length; index += 1) {
      if (runTokenRef.current !== token) return
      setActiveStep(index)
      setProgress(Math.min(.9, .1 + index * .145))
      if (!await delay(720, token)) return
    }
    setActiveStep(nextPlan.steps.length)
    if (shouldEvolve) await runEvolution(nextPlan, brief, token)
    else {
      setStage('ready')
      setProgress(1)
      setIsPlaying(true)
    }
  }

  const generate = async (briefOverride?: string, forceEvolve = false) => {
    const brief = (briefOverride || prompt).trim()
    if (!brief || isRunning) return
    const token = runTokenRef.current + 1
    runTokenRef.current = token
    window.clearTimeout(timerRef.current)
    setError('')
    setStage('planning')
    setAgentTab('plan')
    setIsPlaying(false)
    setActiveStep(0)
    setProgress(.08)
    setEvolution({ ...initialEvolution, evolvedPlan: initialPlan })
    let data: AgentPlan
    try {
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
    await runSteps(data, brief, token, forceEvolve || autoEvolve)
  }

  const startFullDemo = () => {
    const demoPrompt = samples[0]
    setPrompt(demoPrompt)
    setAutoEvolve(true)
    generate(demoPrompt, true)
  }

  const evolveAgain = () => {
    if (isRunning) return
    const token = runTokenRef.current + 1
    runTokenRef.current = token
    setIsPlaying(false)
    runEvolution(plan, prompt, token)
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><span>∑</span></div>
          <div><strong>AXIOM</strong><span>CUT</span></div>
        </div>
        <div className="project-title">
          <span className="status-dot" />
          <span>{plan.projectTitle}</span>
          <ChevronDown size={14} />
        </div>
        <div className="top-actions">
          <div className="model-pill"><Zap size={12} /> {plan.model || 'DeepSeek'} <span>{plan.demo ? 'DEMO' : 'LIVE'}</span></div>
          <button className={`evolution-toggle ${autoEvolve ? 'on' : ''}`} onClick={() => setAutoEvolve((value) => !value)} aria-label="切换自动进化">
            <BrainCircuit size={14} /> 自进化 <span>{autoEvolve ? 'ON' : 'OFF'}</span>
          </button>
          <button className="demo-button" onClick={startFullDemo} disabled={isRunning}><Rocket size={14} /> 完整演示</button>
          <button className="icon-button" aria-label="帮助"><CircleHelp size={17} /></button>
          <button className="icon-button" aria-label="设置"><Settings2 size={17} /></button>
          <button className="export-button" onClick={() => setShowExport(true)} disabled={stage !== 'ready'}><Download size={15} /> 导出成片</button>
        </div>
      </header>

      <main className="workspace">
        <aside className="asset-panel panel">
          <div className="panel-heading">
            <div><span className="section-kicker">PROJECT</span><h2>素材与场景</h2></div>
            <button className="icon-button tiny" aria-label="添加素材"><Plus size={15} /></button>
          </div>
          <div className="project-switcher"><FolderOpen size={16} /><span>euler-intuition</span><MoreHorizontal size={16} /></div>
          <div className="asset-list">
            {assets.map(({ icon: Icon, name, meta, color }) => (
              <button className="asset-row" key={name}>
                <span className={`asset-icon ${color}`}><Icon size={16} /></span>
                <span><strong>{name}</strong><small>{meta}</small></span>
              </button>
            ))}
          </div>
          <div className="scene-block">
            <div className="scene-label"><span>SCENES</span><Plus size={13} /></div>
            {['01 / 引入', '02 / 单位圆', '03 / 复指数', '04 / 总结'].map((scene, index) => (
              <button className={`scene-row ${index === 2 ? 'active' : ''}`} key={scene}>
                <span className="scene-thumb"><span className={`mini-shape s${index}`} /></span>
                <span>{scene}</span>
                <small>{['03.2', '04.8', '06.1', '03.9'][index]}s</small>
              </button>
            ))}
          </div>
          <div className="repo-card">
            <Github size={18} />
            <div><strong>Open source ready</strong><span>MIT · README · .env.example</span></div>
          </div>
        </aside>

        <section className="stage-area">
          <div className="stage-toolbar">
            <div className="breadcrumbs"><span>SCENE 03</span><span>/</span><strong>复指数的几何意义</strong></div>
            <div className="canvas-actions">
              <button><Layers3 size={14} /> 图层</button>
              <button><Code2 size={14} /> 代码</button>
              <button aria-label="全屏"><Maximize2 size={15} /></button>
            </div>
          </div>

          <div className="preview-wrap">
            <div className="preview-frame">
              <MathScene playing={isPlaying} progress={progress} equation={plan.equation} accent={plan.accent} version={evolution.version} score={evolution.score} evolved={stage === 'ready' && evolution.delta > 0} />
              <div className="preview-badge"><span /> 1920 × 1080 · 30 FPS</div>
              {isRunning && <div className="stage-status"><span className="spinner" /> {statusLabel}</div>}
              {stage === 'ready' && <div className="render-ready"><CheckCircle2 size={13} /> EVOLVED · RENDER READY</div>}
            </div>
          </div>

          <div className="transport">
            <button className="transport-icon" onClick={() => setProgress(0)} aria-label="回到开始"><RotateCcw size={15} /></button>
            <button className="play-button" onClick={() => setIsPlaying((value) => !value)} aria-label={isPlaying ? '暂停' : '播放'}>
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>
            <span className="timecode">00:{String(Math.round(progress * 18)).padStart(2, '0')}:12</span>
            <div className="transport-rule" />
            <span className="timecode muted">00:18:00</span>
          </div>

          <div className="timeline">
            <div className="timeline-ruler">
              {[0, 3, 6, 9, 12, 15, 18].map((tick) => <span key={tick}>{tick}s</span>)}
            </div>
            <div className="tracks">
              <div className="track-label"><Film size={13} /><span>VISUAL</span></div>
              <div className="track-content visual-track">
                <div className="clip clip-a">引入</div><div className="clip clip-b">单位圆</div><div className="clip clip-c">复指数</div><div className="clip clip-d">结论</div>
              </div>
              <div className="track-label"><AudioLines size={13} /><span>AUDIO</span></div>
              <div className="track-content audio-track"><span className="waveform" /></div>
              <div className="playhead" style={{ left: timelinePosition }}><span /></div>
            </div>
          </div>
        </section>

        <aside className="agent-panel panel">
          <div className="agent-head">
            <div className="agent-avatar"><BrainCircuit size={17} /></div>
            <div><span className="section-kicker">EVOLUTION AGENT</span><h2>导演控制台</h2></div>
            <span className={`agent-state ${isRunning ? 'working' : ''}`}>{statusLabel}</span>
          </div>
          <div className="agent-tabs">
            <button className={agentTab === 'plan' ? 'active' : ''} onClick={() => setAgentTab('plan')}><Cpu size={13} /> 执行计划 <span>{completedCount}/{plan.steps.length}</span></button>
            <button className={agentTab === 'evolution' ? 'active' : ''} onClick={() => setAgentTab('evolution')}><FlaskConical size={13} /> 进化实验室 <span>{evolution.version}</span></button>
          </div>

          {agentTab === 'plan' ? (
            <>
              <div className="task-summary">
                <div className="summary-top"><span>当前任务</span><button onClick={reset}>重置</button></div>
                <p>{plan.summary}</p>
                <div className="task-chips"><span>16:9</span><span>18 秒</span><span>数学动画</span><span className="evo-chip">AUTO-EVOLVE</span></div>
              </div>
              <div className="pipeline-strip">
                {[
                  ['planning', '规划'], ['executing', '执行'], ['evaluating', '评估'], ['evolving', '进化'], ['ready', '完成'],
                ].map(([key, label], index) => {
                  const order = ['idle', 'planning', 'executing', 'evaluating', 'evolving', 'ready']
                  const current = order.indexOf(stage)
                  const item = order.indexOf(key)
                  return <div className={`${stage === key ? 'active' : ''} ${current > item ? 'done' : ''}`} key={key}><span>{current > item ? <Check size={8} /> : index + 1}</span><small>{label}</small></div>
                })}
              </div>
              <div className="plan-progress">
                <div className="progress-label"><span>EXECUTION PROGRESS</span><strong>{completedCount}/{plan.steps.length}</strong></div>
                <div className="progress-bar"><span style={{ width: `${completedCount / plan.steps.length * 100}%` }} /></div>
              </div>
              <div className="step-list">
                {plan.steps.map((step, index) => {
                  const done = activeStep > index || activeStep >= plan.steps.length
                  const active = stage === 'executing' && activeStep === index
                  return (
                    <div className={`plan-step ${done ? 'done' : ''} ${active ? 'active' : ''}`} key={step.id}>
                      <div className="step-marker">
                        {done ? <Check size={13} /> : active ? <span className="spinner" /> : <span>{String(index + 1).padStart(2, '0')}</span>}
                      </div>
                      <div className="step-copy"><strong>{step.title}</strong><span>{step.detail}</span></div>
                      <div className="step-meta"><code>{step.tool}</code><small>{step.duration}</small></div>
                    </div>
                  )
                })}
              </div>
              <div className="agent-note">
                <ShieldCheck size={15} />
                <span><strong>可控进化</strong>：保留每次变更、评分与选择理由，随时可以回到上一版本。</span>
              </div>
            </>
          ) : (
            <div className="evolution-lab">
              <div className="evolution-score-card">
                <div className="score-ring" style={{ background: `conic-gradient(${plan.accent} ${Math.min(evolution.score, 100) * 3.6}deg, #202a34 0deg)` }}>
                  <div><strong>{evolution.score.toFixed(1)}</strong><span>QUALITY</span></div>
                </div>
                <div className="version-copy">
                  <span className="section-kicker">CURRENT GENERATION</span>
                  <div className="version-flow"><span>{evolution.previousVersion}</span><GitCompareArrows size={13} /><strong>{evolution.version}</strong></div>
                  <p>{evolution.delta > 0 ? `综合质量提升 +${evolution.delta.toFixed(1)}` : '等待第一轮进化'}</p>
                </div>
                <Gauge size={17} className="score-icon" />
              </div>

              <div className="lab-section">
                <div className="lab-title"><span>VISUAL CRITIC</span><small>{stage === 'evaluating' ? 'ANALYZING…' : '4 METRICS'}</small></div>
                <div className="metric-grid">
                  {evolution.metrics.map((metric) => (
                    <div className="metric" key={metric.label}>
                      <div><span>{metric.label}</span><strong>{metric.value}</strong></div>
                      <div className="metric-bar"><span style={{ width: `${metric.value}%` }} /></div>
                      <small>{metric.previous ? `↑ ${metric.value - metric.previous}` : 'BASELINE'}</small>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lab-section">
                <div className="lab-title"><span>CANDIDATE MUTATIONS</span><small>{evolution.mutations.length ? '1 SELECTED' : 'SEARCHING'}</small></div>
                <div className="mutation-list">
                  {evolution.mutations.length ? evolution.mutations.map((mutation) => (
                    <div className={`mutation ${mutation.selected ? 'selected' : ''}`} key={mutation.id}>
                      <span className="mutation-id">{mutation.id}</span>
                      <div><strong>{mutation.title}</strong><p>{mutation.detail}</p></div>
                      <span className="gain">{mutation.expectedGain}</span>
                      {mutation.selected && <CheckCircle2 size={14} />}
                    </div>
                  )) : [1, 2, 3].map((item) => <div className="mutation skeleton" key={item}><span /><div><i /><i /></div></div>)}
                </div>
              </div>

              <div className="selection-reason"><Eye size={14} /><p><strong>选择理由</strong>{evolution.rationale}</p></div>
              <div className="memory-block">
                <div className="lab-title"><span>PROJECT MEMORY</span><History size={13} /></div>
                <div className="memory-tags">{evolution.memory.map((item) => <span key={item}>{item}</span>)}</div>
              </div>
              <button className="evolve-again" onClick={evolveAgain} disabled={isRunning || stage === 'idle'}><BrainCircuit size={14} /> 再进化一轮</button>
            </div>
          )}
        </aside>
      </main>

      <footer className="command-dock">
        <div className="prompt-shell">
          <div className="prompt-icon"><WandSparkles size={18} /></div>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); generate() }
          }} aria-label="描述想要的动画" />
          <div className="prompt-bottom">
            <button className="sample-button" onClick={() => setShowSamples((value) => !value)}><Sparkles size={13} /> 灵感示例 <ChevronDown size={12} /></button>
            <span>Enter 生成 · Shift + Enter 换行</span>
          </div>
          <button className={`send-button ${isRunning ? 'busy' : ''}`} onClick={() => generate()} disabled={isRunning || !prompt.trim()} aria-label="生成计划">
            {isRunning ? <span className="spinner light" /> : <ArrowUp size={18} />}
          </button>
          {showSamples && (
            <div className="sample-menu">
              <div className="sample-title"><span>试试这些指令</span><button onClick={() => setShowSamples(false)}><X size={14} /></button></div>
              {samples.map((sample) => <button key={sample} onClick={() => { setPrompt(sample); setShowSamples(false) }}>{sample}</button>)}
            </div>
          )}
        </div>
        {error && <div className="error-toast">{error}</div>}
      </footer>

      {showExport && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowExport(false)}>
          <div className="export-modal" role="dialog" aria-modal="true" aria-label="导出成片" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowExport(false)} aria-label="关闭"><X size={16} /></button>
            <div className="render-orbit"><span /><span /><CheckCircle2 size={26} /></div>
            <span className="section-kicker">RENDER COMPLETE</span>
            <h3>{plan.projectTitle}</h3>
            <p>最佳版本 {evolution.version} 已通过视觉检查，时间线与自进化记录已锁定。</p>
            <div className="render-stats">
              <div><span>QUALITY</span><strong>{evolution.score.toFixed(1)}</strong></div>
              <div><span>FORMAT</span><strong>1080P</strong></div>
              <div><span>DURATION</span><strong>00:18</strong></div>
              <div><span>VERSION</span><strong>{evolution.version}</strong></div>
            </div>
            <div className="render-file"><Film size={17} /><div><strong>axiom-euler-{evolution.version}.mp4</strong><span>H.264 · 12.8 MB · 演示渲染</span></div><Check size={15} /></div>
            <button className="download-manifest" onClick={downloadManifest}><Download size={15} /> 下载可复现工程 JSON</button>
            <small>完整 Demo 导出工程数据；接入 Remotion 后同一时间线可渲染真实 MP4。</small>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
