# Observable self-evolution

Axiom Cut evolves the **editing plan and scene parameters**, not the underlying model weights. Every iteration is inspectable and reversible.

## Loop

1. **Observe** — collect the current brief, plan, version, and previous scores.
2. **Critique** — score narrative clarity, composition balance, rhythm, and visual continuity.
3. **Mutate** — generate exactly three concrete editing variants.
4. **Select** — choose one candidate and record the expected gain and rationale.
5. **Apply** — update the scene plan and visual parameters.
6. **Remember** — persist reusable project-level preferences for the next round and save the pre-evolution project snapshot.

The UI exposes each phase instead of presenting an unexplained “AI improved it” result.

## API contract

`POST /api/evolve`

```json
{
  "prompt": "用 18 秒解释欧拉公式",
  "plan": { "projectTitle": "欧拉公式 · 几何直觉", "steps": [] },
  "previousEvolution": { "version": "v1.0", "score": 78.6 }
}
```

The response contains:

- previous and next version;
- aggregate score and four metric scores;
- exactly three mutations with one selected winner;
- selection rationale;
- accumulated project memory;
- the evolved plan.

## Safety boundaries

- Evolution is project-scoped and does not modify model weights.
- The API key remains server-side.
- Every applied mutation is represented in the response.
- Scores are directional heuristics for the demo, not objective artistic truth.
- The local fallback uses deterministic gains with diminishing returns.
- Applying an evolved winner updates only reversible project parameters. Real FFmpeg rendering remains a separate, explicit user action with progress and cancellation.
