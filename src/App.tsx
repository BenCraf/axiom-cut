import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUp,
  AudioLines,
  Check,
  ChevronDown,
  CircleHelp,
  Code2,
  Download,
  Film,
  FolderOpen,
  Github,
  Image,
  Layers3,
  Maximize2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
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

function MathScene({ playing, progress, equation, accent }: { playing: boolean; progress: number; equation: string; accent: string }) {
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
      <rect className="scene-progress" x="0" y="534" width={960 * progress} height="6" fill={accent} />
    </svg>
  )
}

function App() {
  const [prompt, setPrompt] = useState(samples[0])
  const [plan, setPlan] = useState(initialPlan)
  const [activeStep, setActiveStep] = useState(-1)
  const [isRunning, setIsRunning] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(.38)
  const [error, setError] = useState('')
  const [showSamples, setShowSamples] = useState(false)
  const timerRef = useRef<number | undefined>(undefined)

  const completedCount = activeStep < 0 ? 0 : Math.min(activeStep, plan.steps.length)
  const statusLabel = isRunning ? `正在执行 ${Math.min(activeStep + 1, plan.steps.length)}/${plan.steps.length}` : activeStep >= plan.steps.length ? '计划已完成' : '等待指令'

  useEffect(() => {
    if (!isPlaying) return
    const timer = window.setInterval(() => setProgress((value) => value >= 1 ? 0 : value + .0025), 80)
    return () => window.clearInterval(timer)
  }, [isPlaying])

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const timelinePosition = useMemo(() => `${Math.round(progress * 100)}%`, [progress])

  const runStep = (index: number, total: number) => {
    setActiveStep(index)
    setProgress(Math.min(.92, .12 + index * .15))
    if (index >= total) {
      setIsRunning(false)
      setIsPlaying(true)
      setProgress(1)
      return
    }
    timerRef.current = window.setTimeout(() => runStep(index + 1, total), 1150)
  }

  const generate = async () => {
    if (!prompt.trim() || isRunning) return
    window.clearTimeout(timerRef.current)
    setError('')
    setIsRunning(true)
    setIsPlaying(false)
    setActiveStep(0)
    setProgress(.08)
    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '计划生成失败')
      setPlan(data)
      runStep(0, data.steps.length)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '计划生成失败')
      setIsRunning(false)
      setActiveStep(-1)
    }
  }

  const reset = () => {
    window.clearTimeout(timerRef.current)
    setPlan(initialPlan)
    setActiveStep(-1)
    setIsRunning(false)
    setIsPlaying(true)
    setProgress(.38)
    setError('')
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
          <button className="icon-button" aria-label="帮助"><CircleHelp size={17} /></button>
          <button className="icon-button" aria-label="设置"><Settings2 size={17} /></button>
          <button className="export-button"><Download size={15} /> 导出视频</button>
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
              <MathScene playing={isPlaying} progress={progress} equation={plan.equation} accent={plan.accent} />
              <div className="preview-badge"><span /> 1920 × 1080 · 30 FPS</div>
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
            <div className="agent-avatar"><Sparkles size={17} /></div>
            <div><span className="section-kicker">DIRECTOR AGENT</span><h2>执行计划</h2></div>
            <span className={`agent-state ${isRunning ? 'working' : ''}`}>{statusLabel}</span>
          </div>
          <div className="task-summary">
            <div className="summary-top"><span>当前任务</span><button onClick={reset}>重置</button></div>
            <p>{plan.summary}</p>
            <div className="task-chips"><span>16:9</span><span>18 秒</span><span>数学动画</span></div>
          </div>
          <div className="plan-progress">
            <div className="progress-label"><span>PLAN PROGRESS</span><strong>{completedCount}/{plan.steps.length}</strong></div>
            <div className="progress-bar"><span style={{ width: `${completedCount / plan.steps.length * 100}%` }} /></div>
          </div>
          <div className="step-list">
            {plan.steps.map((step, index) => {
              const done = activeStep > index || activeStep >= plan.steps.length
              const active = isRunning && activeStep === index
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
            <WandSparkles size={15} />
            <span><strong>当前优化模块</strong>：计划可观察性。每一步都有明确输入、工具与完成状态。</span>
          </div>
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
          <button className={`send-button ${isRunning ? 'busy' : ''}`} onClick={generate} disabled={isRunning || !prompt.trim()} aria-label="生成计划">
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
    </div>
  )
}

export default App
