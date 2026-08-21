import express from 'express'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
try {
  process.loadEnvFile?.(resolve(root, '.env'))
} catch (error) {
  if (error?.code !== 'ENOENT') console.warn('Could not load .env:', error?.message)
}
const app = express()
const port = Number(process.env.PORT || 4173)

app.use(express.json({ limit: '64kb' }))

app.get('/api/status', (_request, response) => {
  response.json({
    provider: 'DeepSeek',
    configured: Boolean(process.env.DEEPSEEK_API_KEY),
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
  })
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
