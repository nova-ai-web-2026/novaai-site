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

## NOVA Local v2.1: separate saved conversations

**Conversation sidebar:** New conversation opens an empty chat without deleting previous sessions. Existing sessions remain in browser localStorage under `nova_omni_local_sessions_v1`, searchable by their first user prompt. You can return to previous conversations and delete one session with confirmation. The old single-session storage key is migrated to the new format when the app starts. The app retains up to 24 separate conversations with up to 60 message entries each. This is browser-local storage, not a server-side or cross-device memory service.

**Export and copy:** Export the current conversation as a plain UTF-8 `.txt` file or copy individual assistant responses with clipboard permission. Failed model generations preserve the draft and never become saved history. Switching conversations while generating is blocked to prevent replies being added to the wrong chat. A visible typing indicator distinguishes in-progress answers.

**Privacy and limitations:** Browser localStorage may be cleared by browsing data removal, private-mode expiry or quota limits; exported files give you an extra copy. No server or account synchronization was added. The neural model continues to use Balanced context (up to 14 messages / 9000 characters) even when many sessions are stored; deleting a session only removes its locally stored history.

Visual changes: searching conversations in sidebar, compact chat list, user-facing progress, reply-copy affordances and cleaner mobile drawer navigation. Regression tests run against the deployed GitHub Pages page.

## NOVA Local v2.2 — welcome-first background model warmup

The free local page now displays a short Arabic welcome card with an enter button instead of forcing visitors to watch model-file progress. On supported desktop browsers and networks explicitly reported as Wi-Fi/Ethernet, it starts warming the selected local Qwen3/SmolLM2 model after the welcome view first paints. Warmup runs in a browser Web Worker and uses no server-side AI API or paid inference. Visitor conversations are stored locally exactly as before.

**Data safety:** Large models may transfer hundreds of megabytes (and use significant device RAM). The welcome view states this clearly, and the visitor can cancel the warmup. Network Information API Save-Data, 2G/3G, known cellular, offline, low RAM and mobile browsers with unknown network type suppress automatic model downloads. These visitors are asked for explicit confirmation upon pressing Enter. The visitor can choose Enter Without Download or manually start/stop the model from Settings. Desktop browsers can still be tethered; download impact is disclosed in the welcome view. The application does not and cannot silently bypass device/network settings.

**First response:** A visitor can type a question while the local model is preparing. One question is kept as a draft and sent exactly once after a successful model-ready event. If the model fails, is stopped, or the draft changes, the queued request is cancelled and no fake AI response is stored. Safe arithmetic calculations remain available immediately without model downloads.

**Limits:** A first visit cannot guarantee instant model responses; browser model weights must download and compile on that device before inference can begin. Browser caching can speed subsequent visits, depending on browser storage policy. Background warmup applies to /local.html while that page is open; it is not a server-side always-on model or a download that continues after the tab closes. The main workspace still links to Local.

UI tests in tests/local-autowarm.spec.js cover automatic Wi-Fi startup, mobile-data consent, Save-Data, cancellation, and waiting-first-question behavior. Existing manual download tests opt out of startup warming explicitly for deterministic coverage. The real Qwen3 browser test also verifies the background warmup path.

## NOVA Local v2.3 — one-click welcome consent and quiet model initialization

The model no longer starts a large download on a first visit before the user agrees. The welcome card clearly states that clicking **"مرحبًا، ابدأ NOVA"** authorizes the local Qwen3 model download (hundreds of MB possible; carrier data charges may apply). It does not grant camera, microphone, location, files, third-party app, or other device permissions. The click itself initiates the download in a Web Worker with **no second confirmation popup**. The visitor sees the normal chat interface immediately. The welcome text, layout, colours and typography have been redesigned.

The model's file names, download percentages and progress bar are visually hidden. A neutral NOVA status is displayed until the model is actually ready; a user who sends a question early receives an accurate short delay message and their single queued prompt is submitted after readiness. The UI never pretends a model reply was generated while weights were loading. Detailed loading errors remain available in the application.

Consent is saved in this browser as `nova_local_download_consent_v1`: previously approved visitors on a suitable unmetered connection can have the worker warm quietly on later visits; on known mobile data, Save-Data, offline or low-memory devices, automatic redownloading is suppressed. Clicking the Stop button revokes remembered automatic-start consent. Visitors selecting "الدخول بدون تشغيل النموذج" do not download anything. Upgrades from the old `nova_intro_seen` session flag do not bypass the new consent requirement.

**Limitations:** A brand-new local browser device still needs to transfer/cache the model once; hiding progress does not remove the time, bandwidth, RAM or actual workload. Browser caching may improve subsequent visits but is not guaranteed. No paid cloud model is used.

## NOVA Local v2.5: faster, task-aware browser AI

Three local profiles: **Smart** Qwen3 0.6B, **Fast** Qwen2.5 0.5B Instruct, **Lite** SmolLM2 135M. Mobile starts with Fast by default; devices that report less than 4 GB RAM start with Lite. Existing saved model preferences remain unchanged. Balanced conversation **memory** independently stays at 14 messages and 9000 characters.

Transformers.js v4 streaming sends partial text to the chat as it is generated. Users can select a task type (automatic, explanations, study, writing, coding, planning, summarisation or translation). Prompts are task-specific, but small models still make mistakes and cannot execute external apps or browse the internet. Users may attach explicitly selected local text files up to 60 KB; up to 4700 characters are inserted into the current prompt for review and summarisation. No file or question is sent to a remote inference endpoint.

For the ONNX models used by this app, **CPU q8 files are smaller than CPU q4**: Qwen3 ~618 MB instead of 919 MB, Qwen2.5 ~512 MB instead of 786 MB, SmolLM2 ~136 MB instead of 181 MB. On WebGPU adapters with shader-f16, q4f16 remains preferred (~570 MB, 483 MB, 117 MB respectively). We do not download multiple different quantizations automatically. The browser may use additional bytes for tokenizer/runtime files and memory for inference; this is not an instant chat on uncached devices.

If a model is still preparing after 24 seconds or fails, a discreet choice appears to retry, switch to Fast, or use Lite. Changing models requires a fresh user confirmation because it can incur another large download. Browser and WASM caching are enabled. The app does not hide failures or claim readiness until the model actually loads.

A versioned worker URL ensures users receive new inference code after deploying. The user's first explicit model-download consent and data-saving policies remain in place. Unit tests cover runtime quantization selection and task prompts. Browser tests cover streaming, local file import and recovery without remote model/API requests.

## NOVA Local v2.5.1 — Arabic task guidance and transparent attachments

Arabic user requests now receive shorter, Arabic-first system instructions. Explain, study, writing, coding, planning, summarisation and translation each have focused guidance; the small model remains limited and can hallucinate, so never represent it as a cloud-scale reasoning model. Unverified external actions and claims remain explicitly forbidden in model prompts. For file summaries, only the first 3700 text characters are placed into the visible draft, and the UI tells the visitor when the input was truncated, so the worker's last-message context window does not silently omit a larger portion.

A versioned worker URL forces the browser to load the updated prompt logic instead of a stale cached script. CPU/q8 and GPU/q4f16 selection and the same explicit data-download consent continue to apply.

## NOVA Local v2.6 — Fast first, proven Smart CPU settings

Real Chromium testing found that the smaller Qwen3 q8 CPU weights were very slow to generate (the answer did not finish within a 120-second test window). Smart now uses the previously verified q4 CPU weights (~919MB) or q4f16 on compatible WebGPU (~570MB). Fast and Lite keep smaller q8 CPU weights (~512MB and ~136MB respectively). Small files do not automatically mean fast inference.

New visitors start with Fast instead of automatically downloading Smart's largest CPU file; explicit past profile choices are preserved. The independent conversation memory remains Balanced by default (14 messages / 9000 characters). These on-device models remain much weaker than large hosted AI services, with no paid cloud fallback.

## NOVA Local v2.7 — instant offline tools while the model loads

A lightweight `local-tasks.js` script provides **extractive summaries** of user-provided English or Arabic texts without downloading a model, contacting AI Gateway or sending any text to a server. When there are at least two usable sentences and enough source text, NOVA ranks and selects up to four original sentences, keeps their order, and clearly marks the result as *source extraction, not generative AI or fact-checking*. It never fabricates a summary of an unseen document. Visitors may opt into "AI-rewritten summary (slower)" separately, which requires a fully loaded local language model.

`local-math.js` now handles safe and deterministic expressions with arithmetic, brackets, right-associative powers, Pi/e, roots, trig functions in **radians**, absolute value, logs and exponentials. It uses a restricted parser, not `eval`. Non-finite values, unsupported functions, divide by zero, and undefined tan at Pi/2 are rejected. English and Arabic question prefixes with Arabic-Indic numerals are supported. The verified math tool operates even while an AI model is loading.

One of the first-screen example cards now demonstrates quick summarization without waiting. The chat interface explicitly distinguishes locally extracted summaries from model-rewritten summaries; both operate without paid cloud services. Uploaded text files are inserted into the visible draft for the visitor to inspect. Files are never uploaded to a remote model.

**Practical limits:** Extractive summarization selects source sentences but does not paraphrase, verify their truth or deeply understand their meaning. Small on-device models still have limited reasoning and response quality; Qwen2.5 0.5B and Qwen3 0.6B may generate irrelevant answers. Fast/Lite loading shortcuts and in-browser weight caches improve the first-try experience but cannot eliminate large first-download size. This release does not claim human-level reasoning or cloud-model quality.
