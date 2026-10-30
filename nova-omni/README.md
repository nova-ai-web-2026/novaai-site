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
