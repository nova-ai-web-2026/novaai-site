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

## NOVA Local v2.8 — progress-aware startup and task-quality improvements

The previous hard 150-second startup limit could stop an active browser model download even when files were still arriving. The local page now watches the model worker's real status/progress events instead of using a fixed total duration. Users see a discreet recovery choice after 18 seconds of waiting; a load attempt is stopped only after 120 seconds **without any worker activity**. Download percentages and file names remain hidden from the normal chat UI, but a failed or stalled model is never presented as ready. Workers can still fail for network, storage, browser or memory reasons.

A question entered during startup remains one queued draft. If the user explicitly switches to Fast or Lite while it is queued, the question stays queued for the new worker and is sent once when ready. The assistant does not make up a response during model loading. Local arithmetic and user-provided extractive text summaries are still instantaneous and do not require model downloads. Large downloads still need the user's explicit consent, including when selecting an alternative model; no remote paid inference is enabled.

Task routing better recognises polite Arabic and English requests. The local model receives clearer task-specific instructions for tutoring, explaining, writing, code, planning, translation and source-grounded summaries. Generation settings use slightly lower randomness for analytical tasks, and clearly looping answers may receive one bounded local quality retry; normal responses do not pay for a second pass. Partial responses stream beyond the previous 1600-character cap. These changes improve consistency and task handling, not the underlying weights, model intelligence or web access.

**Device reality:** first use still downloads model files (roughly Lite 136 MB, Fast 512 MB on CPU, or more depending on selected profile, GPU and downloaded assets), and slow mobile networks may take considerable time. The app cannot truly preload a new user's browser before consent or make a 0.5B model as capable as a frontier hosted service. The user's existing on-device conversations, welcome consent, background warmup policy, model choices and no-cloud/no-card default remain intact.

Regression checks: Node tests for Arabic/English intent detection and response settings, and Playwright simulated-worker tests for active loads beyond 150 seconds, genuinely stalled downloads and exactly-once queued delivery.

## NOVA Local v2.9 — instant-first writing, coding and source research

The default first-visit screen now offers an **instant entry with no AI model download**. The original explicit local-model consent buttons are still available. Existing AI memory, manual model selection and no-paid-cloud rules remain in place. On mobile data or unknown mobile networks, an already-approved model is not silently downloaded again; the main composer now has a visible, labelled `تشغيل نموذج AI` button that allows the user to opt in manually. A model status strip distinguishes instant features, genuine loading and readiness; no fake generated answers are shown.

Three optional no-download workflows can be selected in the task menu or from starter cards:
- **Research with clickable sources**: only after the user clicks Send with a research query, NOVA sends the search **topic** (not conversation history or documents) from the browser to Wikimedia's public Search API and Crossref's public bibliographic metadata API. It shows actual returned titles, snippets, safe article links and DOI links, never invents results, and reports outages. These are source excerpts/metadata, *not an AI-written literature review, exhaustive research, independent fact-check or proof of a claim*. Results are displayed as plain text and whitelisted clickable source URLs without trusting third-party HTML.
- **Quick writing**: a local email-format template that keeps the provided details and placeholder fields. This is not the same as an AI rewrite or grammar correction.
- **Quick coding**: bounded, editable starter examples for a Python calculator, Python to-do list, basic HTML page and JavaScript JSON request. Unsupported requests receive an accurate limitation message. The app never claims to have compiled, executed or tested generated code.

General AI generation for writing, coding and other tasks still requires a fully loaded local model. The small local model's intrinsic quality and the initial hundred-megabyte download have **not** been magically eliminated. Users can still choose Fast/Smart/Lite after explicit download permission. The download occurs only while the page is open, using the device's browser caching where supported. No third-party inference key or paid provider has been automatically added.

Security and QA: source URLs are constructed only for `wikipedia.org` and `doi.org`, network calls have timeouts, results are plain-text escaped, and source searches remain separate from private browser-local conversations. New unit and browser checks validate no-download entry, correct optional model consent, real-source URL generation, template limitations and no executable markup from external snippets.

## NOVA Local v2.9.1 — CPU answer latency recovery

The real Chromium Fast Qwen2.5 CPU check revealed a significant unresolved issue: the model loaded, but a small Arabic generation did not finish within its 110-second observation window. This is a genuine inference-performance limitation and not a hidden download or fake readiness state.

The local assistant now defaults to **Quick response length**. Its worker caps CPU/WASM token budgets significantly for everyday requests (Fast/CPU Quick generally <=52 tokens, coding/study/writing <=88). Normal and Detailed output lengths remain user-selectable from settings for requests where completeness matters more than latency. These are upper token limits, not guarantees of response time, quality or exact word counts. On-device Fast and Smart are still small AI models and may be inaccurate.

If a model-generated answer takes over 25 seconds, the chat shows a nonblocking explanation with cancellation and instant-tool options. If a generation remains unanswered for 115 seconds, the browser terminates its worker, preserves the unsent prompt, and offers clear recovery instead of leaving an endless typing indicator. This timeout is for **answer generation**, not for an actively progressing model download. It does not interrupt instant source research, offline arithmetic or the writing/code template tools.

Unit checks verify device-aware generation caps; browser checks simulate stalled model inference and preserve draft safety, and verify answer-length persistence and worker messages. Real model responsiveness still requires separate, explicit real-device verification and is not inferred from mocked workers.

## NOVA Local v3.0 — improved visual hierarchy and expanded template library

This release refines the existing free on-device workspace rather than changing its underlying AI model or introducing a paid inference provider.

### Visual and mobile improvements
- Consistent readable Arabic/English typography with clearer differences between major headings, explanatory copy, message content, metadata and controls.
- A more legible dark navy/indigo interface, compact but appropriately sized chat composer, polished responsive starter cards, and an accessible template dialog.
- Preserves usability at viewport widths of 320, 390, 768 and 1440 pixels, with no horizontal overflow in browser tests.
- A− / A+ controls in the header and a Small/Normal/Large setting adjust the main application text scale. The setting is persisted in `nova_local_text_size` without modifying saved chats or download consent.

### Template library (29)
Accessible from the header, sidebar, composer and initial welcome screen. Search and category filters let visitors choose among **12 writing**, **12 programming**, **3 public-source research**, and **2 study** templates. Each template populates an editable prompt in the existing conversation and is usable without downloading local model weights.

- Writing: formal email, follow-up, complaint, leave request, job application, cover letter, professional summary, social post, meeting notes, project outline, essay outline and report structure.
- Programming: Python calculator, tasks, quiz, CSV and JSON; JavaScript fetch, counter, filtering and timer; HTML page, contact form and responsive CSS cards.
- Research: user-initiated Wikimedia/Crossref query templates; results contain actual source links and excerpts, not a fabricated AI synthesis or independently verified research findings.
- Study: revision checklist and weekly study-plan structure.

**Integrity:** Writing items are fill-in starter structures with placeholders rather than AI-generated prose. Coding items are editable examples; they have not been executed as part of each user's task. Unsupported legacy coding prompts retain their honest limitations. Source searches transmit only the explicit search topic, never private conversation histories. The local model remains optional, potentially slow and significantly weaker than a cloud-scale model.

### Verification
Node tests check catalog size, unique identifiers, filters, safe writing structures and code starters. Browser tests exercise the picker and filters, real rendering in the existing chat, persistence of font preferences, keyboard close behavior, mobile navigation and display overflow at the viewport sizes above. Existing arithmetic, model consent, local history and local worker tests remain in the test suite.

## NOVA Local v3.1 — compact hosted template shelf (34 templates)

The templates now open in a narrow right-side drawer (up to ~420px wide on desktop, ~94vw on compact phones) rather than a nearly full-screen gallery. Existing entry points remain: header, sidebar, message composer and the welcome prompt. The shelf remains searchable, category-filtered and keyboard accessible; selecting a template fills the existing composer without interrupting stored conversations.

### Small hosted catalog, no new paid backend
All 34 template descriptions and prompts are mirrored in a small, versioned static JSON file: `nova-omni/templates/catalog.json`, served from the same **GitHub Pages** host as NOVA. The browser shows the bundled list immediately and checks this hosted JSON **only after the template drawer is opened**; loading the catalog never blocks the interface. If the request fails, takes too long, or the JSON is malformed, the full bundled set remains usable offline. The drawer clearly labels the hosted/fallback state.

This is a lightweight **static hosted resource, not a dynamic application server**. It adds no database, password, paid service, remote model inference, or user-data uploads. The JSON contains only curated public template metadata. For safety, hosted entries must match existing approved identifiers, categories and execution modes; arbitrary remote scripts or new execution modes cannot be injected. Prompt/body rendering remains in the reviewed application code.

### Exactly five added templates
The existing 29 remain and five new ones are added:
- **تأكيد دفع** — payment confirmation email with amount, date and reference placeholders.
- **شكر بعد مقابلة** — short post-interview follow-up message.
- **التحقق من نموذج** — editable browser-based HTML/JavaScript form validation starter, without sending submitted data.
- **مقارنة مصادر** — research-source discovery for comparing subjects; returns citations, not a fabricated synthesis.
- **بطاقات مراجعة** — structured self-study flashcards with placeholders to verify against class notes.

Counts: 14 writing, 13 coding, 4 source research, 3 study = **34 templates**. Existing local AI consent and on-device chat history are unchanged. Browser and unit tests verify loading the small hosted catalog, offline fallback, no model download on template selection, filters, mobile drawer dimensions and every new template.

## NOVA Local v3.2 — ten more internal templates (44 total)

This release adds **ten actual bundled, editable template bodies**, not merely ten labels or ten prompt shortcuts. The compact template shelf now shows the ten new options first while preserving the 34 existing templates and their search/category filters. All are usable without downloading a language model. Nothing in this release changes the user's saved chats, model consent or paid cloud backend configuration.

**New templates:**
- Writing (4): **طلب تحديد موعد** (appointment request), **رسالة للدعم الفني** (technical support report with steps to reproduce), **مقترح مشروع** (project proposal with deliverables, risks and budget placeholders), and **منظم أسبوعي** (weekly priorities and tasks).
- Code (3): **متوسط الدرجات Python** (input validation and arithmetic mean), **زر الوضع الليلي** (HTML/CSS/JavaScript theme toggle with local preference), and **أسئلة شائعة تفاعلية** (HTML `details`/ `summary` FAQ layout). Code examples are editable starters, not automatically executed or guaranteed to meet a user's unspecified requirements.
- Study (2): **دفتر تصحيح الأخطاء** (track mistakes and corrections) and **خطة استعداد للامتحان** (review, practice and balanced rest).
- Research (1): **مصادر للتحقق من معلومة**, which finds relevant sources for a claim. Source discovery is **not a claim that NOVA verified or refuted the claim**.

Category totals: **18 writing, 16 coding, 5 research and 5 study = 44 templates**.

The mirrored public static metadata at `nova-omni/templates/catalog.json` now also lists all 44 IDs, with schema validation ensuring that remote metadata cannot introduce executable template bodies or alter task modes. The live panel uses the bundled versions immediately; opening it optionally refreshes descriptions/prompts from the small same-origin GitHub Pages JSON file. If that request fails, the internal templates remain usable. This architecture requires **no new paid dynamic server**.

Regression tests cover all ten IDs, bilingual writing structures, editable coding examples, the manifest/library parity, template rendering on a simulated offline browser, and new-first ordering.

## NOVA Local v3.3 — calmer visual design and honest quiet startup

The responsive workspace gets a more coherent deep-blue/indigo visual system. The header, cards, composer, conversation bubbles, sidebar and compact 44-template shelf now use consistent spacing, typography, borders, accents and focus states. The design adapts to 320px–1440px viewports and retains readable controls, keyboard access and reduced-motion support. The updates live in `nova-omni/local-polish.css`, loaded after the existing CSS to preserve a functional fallback.

**Less repetitive loading messaging, no concealed downloads:** The main composer shows only a small, factual state cue (e.g. "الأدوات متاحة", "نوفا بيستعد", or "المساعد جاهز") with a restrained pulsing dot while a model is actually initializing. Repeated progress events no longer rewrite identical aria-live text. Technical details and large-download explanations remain in the model Settings area. Status warnings surface in the main UI only when user intervention or a genuine failure is necessary.

No model is downloaded before the visitor's explicit initial approval. The welcome screen still states that model downloads can involve **hundreds of megabytes** and may consume mobile data. Existing opt-in model downloads can continue in the browser while other available local tasks remain usable. Revisit behavior preserves the previous consent policy: a recognized Wi-Fi connection may auto-start a previously approved model; mobile/metered/Save-Data connections never silently start another model download. Instead of a long intrusive mobile-data banner, users see a compact manual "تشغيل المساعد" action and clear Settings details, and still get a confirmation dialog before any manually requested metered download.

The changes do **not** make the large local model download instant, grant new device permissions, provide hidden paid inference or imply that a model is ready before its worker confirms readiness. Existing 44 templates, optional research source fetches, math tools, saved conversation data, load failure recovery and stop controls are preserved.

Verification includes dedicated browser checks for no-download onboarding, Wi-Fi startup state, mobile-network safeguards and consent, quiet live-region updates, reduced-motion animation, responsive layout and unchanged template access.

## NOVA Local v3.4 — expressive Studio redesign and functional workflow navigation

The user requested a **better** interface, not merely a quieter palette. This release changes the interface architecture and actual navigation:

- **Bold two-column Studio hero** with high-contrast typography, vibrant lilac/cyan gradients, branded CSS-drawn orbital artwork and prominent working shortcuts. Mobile hides the decorative visualization and keeps the useful actions, without downloading image or model assets.
- **Interactive workflow navigation** with All, Writing, Coding, Research and Study categories. The six starter cards actually change based on category (six writing, six coding, five source-research, five study, or the original six initial actions). These curated cards use the existing approved `NovaTemplateLibrary` definitions; picking one fills the real composer and sends the correct task/template to the existing local runner. No fake AI answers or hidden cloud inference.
- **Functional calls to action**: open all 44 templates in the existing compact drawer, jump to writing tools, or use Ctrl/Cmd+K to open the template search while not actively editing text.
- Improved starter-card information density, readability, hover/focus styles, restrained responsive typography and contrast at 320/390/768/1440px. The interface remains keyboard accessible, mobile-friendly and reduced-motion aware.
- The new CSS/JS lives in `nova-omni/local-studio.css` and `nova-omni/local-studio.js` loaded after the previous stable skin; previous local chats, model consent, AI loading behavior, privacy protections, 44 templates, existing arithmetic and source retrieval remain unchanged.
- **Clear limits:** Research requires a user-triggered source lookup to Wikimedia/Crossref. Writing and code quick modes use transparent editable starters, not a large text-generation model. Heavy on-device model downloads still require explicit consent.

QA includes browser tests for actual task-category switching, writing/code/study template output, research source links, hero actions, keyboard search, responsive no-overflow checks, preservation of chats/font preferences and zero unauthorized AI downloads.
