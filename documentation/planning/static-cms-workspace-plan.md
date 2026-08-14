# Static CMS Workspace Integration Plan

This plan outlines the architecture and implementation steps to construct a highly performant, client-side, GitHub-integrated Markdown/MDX CMS Workspace for drafting and publishing digital garden notes.

---

## 🏗️ Architectural Overview

Since the portfolio operates on a static host (GitHub Pages / SSG), we cannot run database server-sides. Instead, we construct a **Client-Side Git CMS** leveraging the GitHub REST API.

```text
                  +-----------------------------------+
                  |        Client Browser             |
                  |  - Local Storage (cached PAT)     |
                  |  - Symmetrical Split Editor       |
                  |  - Native HTML5 Compression       |
                  |  - Auto-Sync & Gemini API Commit  |
                  +-----------------┬-----------------+
                                    │
                        GitHub API (HTTPS CORS)
                                    │
                                    ▼
                  +-----------------------------------+
                  |          GitHub Repo              |
                  |  - Branch: `notes-drafts`         |
                  |  - Folder: `src/content/drafts/`  |
                  +-----------------------------------+
```

### Components & State Coordination
1. **GitHub Access Gatekeeping:** The workspace editing suite is strictly locked behind authentication. If no valid Fine-Grained Personal Access Token (PAT) is found in `localStorage`, a clean cryptographic login card is displayed with instructions to generate a PAT.
2. **Double-Engine WYSIWYG Parser:**
   - **Math Engine (KaTeX):** Standard math expressions delimited by `$$` or `$` are compiled in real-time.
   - **Diagram Engine (Mermaid & PlantUML):**
     - Mermaid code is rendered using a dynamically loaded client-side library.
     - PlantUML code is encoded using native browser `CompressionStream` (Deflate) and rendered via the public PlantUML SVG compiler.
   - **Interactivity Engine (Rich Portfolio Widgets):** Standard MDX tags like `<ComplexPlotter />`, `<NodeGraftViewer />`, and `<SudokuMiniWidget />` are detected and loaded live inside the editor's preview pane!
3. **Background Auto-Sync Engine (1-Minute Intervals):** When the editor detects unsaved modifications, it initiates a silent background commit to the `src/content/drafts/` folder on the `notes-drafts` branch.
4. **AI-Powered Commit Message Summarizer:**
   - If the user configures a **Google Gemini API Key** (which offers a generous free tier of 1500 requests/day at `aistudio.google.com`), the client calls the Gemini API to analyze the current draft and summarize it into a semantic commit message (e.g., `draft: explain boundary bisections in section V`).
   - If no API key is provided, or the API call fails/times out, the engine gracefully falls back to a precise timestamp-based commit message: `draft: auto-sync at YYYY-MM-DD HH:MM:SS`.

---

## 🛠️ Detailed Implementation Blueprint

### Step 1: Create the Workspace Page (`src/app/[lang]/workspace/page.tsx`)
This page serves as the workspace command-deck. It provides:
- **Auth Gatekeeper Card:** Restricts page visibility to authenticated owners.
- **Sidebar List:** Active drafts fetched dynamically from the `notes-drafts` branch.
- **Editing Viewport:** A split screen with a code editor on the left and a live rendering panel on the right.
- **Auto-Sync Interval Loop:** Tracks changes and initiates background pushes every 60 seconds with subtle cloud sync feedback.
- **Settings Panel:** Inputs for the Gemini API Key with copy-paste instructions for the free tier.

### Step 2: Implement Native PlantUML Compressor
We will construct a zero-dependency PlantUML encoder leveraging the HTML5 `CompressionStream` API to deflate the UML string and encode it to the custom 64-bit alphabet requested by `plantuml.com`.

### Step 3: Implement the Live MDX & KaTeX Renderer
We will write a robust client-side parser inside the workspace preview. It will split content into:
- Markdown and text nodes.
- KaTeX mathematical displays.
- Code blocks (detecting `mermaid` and `plantuml` blocks to render diagrams).
- Rich portfolio React components (dynamically mapped to existing widgets).

---

## 🛡️ Risk & Mitigation Analysis

- **Risk 1: Token Security:** Leaving a GitHub PAT in browser variables could expose it to cross-site scripting (XSS) if untrusted CDN packages are loaded.
  - *Mitigation:* We use *zero* untrusted external scripts. All CDNs are locked to specific SHA hashes (subresource integrity). We encourage users to create *Fine-Grained PATs* with read/write scopes restricted strictly to the single portfolio repository.
- **Risk 2: Hydration Failures (SSR):** Next.js Server Components cannot pre-render the active editor state or the local storage tokens on the server.
  - *Mitigation:* Wrap the workspace viewport in a `mounted` check to defer all token loads and canvas setups to client-side mounting, keeping SSR fully happy.
- **Risk 3: Uncreated Branch:** The `notes-drafts` branch may not exist in the user's repository.
  - *Mitigation:* The CMS will check for the branch on the first fetch. If it returns 404, it will automatically query the `main` branch SHA and create the `notes-drafts` branch dynamically on behalf of the user.

---

## ⚙️ Test & Verification Strategy

- **Static Build compilation:** Run `npm run build` to verify Next.js/Turbopack handles all dynamic component references and MDX imports inside the workspace route cleanly.
- **Crawl Check:** Ensure `scripts/check_links.ts` accepts the new `/workspace` URL and marks all static paths as valid.
