# NOVA OMNI v1.0

A complete deployable multi-model web application. It is a model-powered product, not a newly trained foundation model, and it does NOT claim to beat Grok 4.7.

Features: real AI Gateway chat with 5 modes; independent model review if enabled; real safe arithmetic parser; GitHub repository inspection and optional issue creation; Slack channel discovery and optional message sending; browser-local conversations; transparent backend checks.

Deployment: Vercel project root directory is nova-omni in the existing GitHub repository, framework Other/none. Uses static HTML and Node.js serverless API.

Environment variables (set privately in the Vercel dashboard):
- NOVA_ACCESS_KEY: REQUIRED high-entropy private password. Enter in site Settings to enable chat and write actions.
- AI_GATEWAY_API_KEY: optional when Vercel OIDC and Gateway access are enabled. AI Gateway model calls require billing/credits.
- GITHUB_TOKEN: optional for issue creation; public repository inspection works without it.
- SLACK_BOT_TOKEN: optional for Slack channel read/post (bot needs appropriate permissions).

The ChatGPT Slack and GitHub connectors do not automatically authorize this standalone website. The website uses separately configured API tokens, with confirmation prompts before mutations.

Endpoints:
- GET /api/omni?action=health
- GET /api/omni?action=checks
- GET /api/omni?action=calc&expression=sqrt(144)%2B2%5E3
- GET /api/omni?action=repo&repo=octocat/Hello-World
- GET /api/omni?action=channels (access key and Slack token required)
- POST /api/omni?action=chat
- POST /api/omni?action=issue
- POST /api/omni?action=post

Testing: app checks cover math parser, malicious expression rejection and repository validation. Independent blinded comparison with Grok 4.7 requires equivalent tools, test prompts, scoring, prompts and cost budgets. No comparative model score has been measured.

Security: personal-project MVP; for public multi-user launch, add per-user authorization, distributed throttling, audit logs, usage quotas, and user-scoped OAuth rather than a shared password. Default in-memory throttling is only best-effort. No fake responses are returned on API failures. Text-file attachments up to 16KB only.
## Real-site browser tests and deployment notes
GitHub Actions runs Playwright against the public GitHub Pages URL on desktop and mobile. It also runs Node API tests, including preflight CORS responses. Passing these application checks does NOT mean the AI model or third-party write integrations have been live tested.

GitHub Pages is static; it cannot run `api/omni.js`. To enable AI/Slack/GitHub issue actions, deploy `nova-omni` to a serverless Node provider. In GitHub Pages Settings > API server connection, enter its trusted HTTPS endpoint (e.g. `https://your-app.vercel.app/api/omni`). This public URL is saved to localStorage; the private `NOVA_ACCESS_KEY` remains in sessionStorage. The backend explicitly permits browser CORS requests only from `NOVA_ALLOWED_ORIGIN` (default `https://nova-ai-web-2026.github.io`). Configure access keys and provider API tokens in the backend environment, never in public HTML or the GitHub repo.

When the backend is missing, chat does not send or claim that an AI answered: the interface shows an explicit offline notice while keeping the user's unsent draft. GitHub public reads, calculator and static test lab continue working.

## Secure live app (v1.3)
Vercel project `nova-omni-ai-2026` hosts both the frontend and Node serverless API at `https://nova-omni-ai-2026.vercel.app/`. It is protected using Vercel Authentication on all environments. The owner signs in using their Vercel account. Server-side `NOVA_TRUST_VERCEL_AUTH=true` trusts Vercel Authentication ONLY on Vercel deployments; never set it on an unprotected host. Vercel OIDC is enabled for AI Gateway and tokens are never sent to the browser. An authenticated live model turn is required to verify provider credits/access. GitHub Pages redirects by default to the protected live site, while `?preview=1` remains available for static testing. Slack/GitHub write actions require separate backend tokens.

## Multilingual AI and Gateway diagnostics (v1.4)

The UI can automatically follow the language of the user or select from 23 explicit languages including Egyptian Arabic, Arabic, English, French, Spanish, Portuguese, German, Italian, Russian, Turkish, Hindi, Urdu, Chinese, Japanese, Korean, Persian, Bengali, Indonesian, Vietnamese, Thai, Swahili, Dutch and Polish.

The authenticated endpoint GET /api/omni?action=diagnose makes a short, real Arabic test request and reports a sanitized error or a successful result. The static health response only indicates credential presence and is not proof that model inference works.

AI Gateway HTTP 403 means access was denied. Do NOT repeatedly retry another model through the same denied gateway. Vercel Gateway team permissions, project access or available credits may need changes in the official Vercel dashboard.

Optional direct provider fallback: an authorized project administrator can set OPENAI_API_KEY in Vercel project nova-omni-ai-2026 → Settings → Environment Variables, then redeploy. Do not put secrets in chat, frontend forms or source code. If AI Gateway denies access, the backend can use the OpenAI key directly. NOVA_AI_PROVIDER=openai chooses direct provider; NOVA_DIRECT_OPENAI_MODEL can override the default gpt-5.4-mini. Independent provider usage may be billed.

Automated tests verify requests, language routing, authorization error handling and deterministic application behavior, not real AI language quality. Head-to-head superiority over Grok 4.7 has not been demonstrated.

## v1.5 Free-only default
The server defaults to `NOVA_FREE_ONLY=true`, restricting all chat, diagnostics, fallback and second-model review to the exact free AI Gateway IDs `nvidia/nemotron-3.5-lightning-free`, `reflection/beam-free`, and `poolside/laguna-s-2.1-free`. No paid OpenAI direct fallback is allowed in this mode, even if a direct provider credential exists. Model prices and promotions change over time; check Vercel's live catalog before ongoing use. Free models may be rate-limited or unavailable, and provider privacy terms apply. An authorized AI Gateway key / Vercel account is still required. `NOVA_FREE_ONLY=false` would restore paid-mode behavior only after a deliberate server-side setting change; do not change it for a free-only deployment.

## v1.6 No-card local AI fallback
If AI Gateway returns HTTP 403 `customer_verification_required`, a Vercel account needs payment-method verification even to unlock free Gateway credits. The server handles this accurately; it never silently switches to paid models. NOVA OMNI Local, linked directly on the main chat page at `/local.html`, runs the small multilingual `onnx-community/Qwen3-0.6B-ONNX` model inside the visitor's browser. It uses Hugging Face Transformers.js and a dedicated Web Worker, not a cloud AI API or payment method. Visitors explicitly approve the **large initial model download** (hundreds of megabytes, may incur mobile-data charges); GPU/WASM performance and browser device memory can limit support. The first download requires connectivity, and subsequent use may benefit from browser caching. Local AI has significantly lower reasoning performance than hosted frontier models and is not a Grok benchmark.

## Local AI v1.3: Balanced device and context memory

Balanced (default): Qwen3 0.6B with Q4 ONNX quantization, not a hard RAM limit. Actual peak memory depends on browser, WebGPU availability, CPU/GPU and device RAM. An optional 135M Lite model is lighter but is less suitable for Egyptian Arabic.

The chat keeps up to 60 user/assistant messages in this browser's localStorage. Only up to 14 recent messages and at most 9000 characters go into a balanced reply; Short is up to 8/4800, Extended up to 18/12000. Stored conversations are not automatically uploaded. Users must approve model downloads explicitly; the model is kept in device memory only while its worker is running.

Qwen3 short-reply sampling: /no_think, temperature 0.7, top_p 0.8, top_k 20 and repetition_penalty 1.12; repetitive generations can be retried once. Qwen recommends sampling rather than greedy decoding. The model remains relatively weak; actual testing showed that it can answer basic arithmetic incorrectly. Therefore the browser also contains a safe deterministic arithmetic parser (local-math.js) that answers simple expression requests rather than asking the model to guess.

Node unit tests cover context memory and secure arithmetic. Browser tests cover profile selection, local conversation history, explicit download consent and local arithmetic using simulated model workers. A separate real ONNX inference workflow checks that Qwen3 loads and generates language in a real CPU runtime, but cannot prove operation on every mobile browser.

Local AI: https://nova-ai-web-2026.github.io/novaai-site/nova-omni/local.html
