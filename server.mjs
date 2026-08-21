import express from 'express'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const app = express()
const port = Number(process.env.PORT || 4173)

app.use(express.json({ limit: '64kb' }))

const fallbackPlan = (prompt) => {
  const isGolden = /黄金|golden/i.test(prompt)
  const isPythagoras = /勾股|pythag/i.test(prompt)
  return {
    projectTitle: isGolden ? '黄金分割 · 生长秩序' : isPythagoras ? '勾股定理 · 面积证明' : '欧拉公式 · 几何直觉',
    summary: prompt.slice(0, 88),
    accent: isGolden ? '#f4d35e' : isPythagoras ? '#83c78f' : '#58c4dd',
    equation: isGolden ? 'φ = (1 + √5) / 2' : isPythagoras ? 'a² + b² = c²' : 'eⁱˣ = cos(x) + i sin(x)',
    steps: [
      { id: '01', title: '理解目标', detail: '提取主题、时长、画幅与风格', tool: 'reason', duration: '0.8s' },
      { id: '02', title: '拆解镜头', detail: '建立引入、推演、结论的节奏', tool: 'plan', duration: '1.2s' },
      { id: '03', title: '构建几何场景', detail: '生成坐标、图形、公式与标注', tool: 'compose', duration: '2.4s' },
      { id: '04', title: '编排动画', detail: '应用轨迹动画、缓动与转场', tool: 'animate', duration: '1.8s' },
      { id: '05', title: '检查画面', detail: '验证可读性、遮挡与安全区域', tool: 'inspect', duration: '1.1s' },
      { id: '06', title: '准备渲染', detail: '输出确定性的时间线配置', tool: 'render', duration: '0.9s' },
    ],
    demo: true,
    model: 'Local demo',
  }
}

const systemPrompt = `你是一个代码驱动数学动画的导演 Agent。根据用户需求生成执行计划，只输出 JSON。
JSON 格式必须是：
{
  "projectTitle": "不超过16字的中文标题",
  "summary": "不超过80字的中文方案摘要",
  "accent": "#58c4dd 形式的十六进制颜色",
  "equation": "核心公式，使用可显示的 Unicode 字符",
  "steps": [{"id":"01","title":"步骤名","detail":"一句具体动作","tool":"单个英文工具名","duration":"0.8s"}]
}
steps 必须恰好 6 项，依次覆盖：理解目标、拆解镜头、构建场景、编排动画、检查画面、准备渲染。不要输出 markdown。`

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

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(resolve(root, 'dist')))
  app.get('*splat', (_request, response) => response.sendFile(resolve(root, 'dist/index.html')))
} else {
  const { createServer } = await import('vite')
  const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'spa' })
  app.use(vite.middlewares)
}

app.listen(port, '127.0.0.1', () => {
  console.log(`Axiom Cut is running at http://127.0.0.1:${port}`)
})
