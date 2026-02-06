# Copilot / AI Agent Instructions for this repo ✅

Summary
- This is a small static website (vanilla HTML/CSS/JS) focused on a portfolio, a markdown-based setup guide, and a travel gallery.
- No build step or bundler is required — pages are served as static files. Use an HTTP server for local development (fetch requires HTTP). See `README.md` for deployment notes (Docker / GitHub Pages).

Quick orientation (big picture)
- Pages: `index.html`, `setup-guide.html`, `projects.html`, `travel.html` are the primary surfaces.
- Shared logic: `js/scripts.js` contains common helpers (markdown rendering, TOC generation, code highlighting).
- Feature-specific modules:
  - Theme: `js/theme-toggle.js` + `css/dark.css` (theme toggles by enabling/disabling the `#dark-css` stylesheet and storing preference in `localStorage`).
  - Markdown guide: `content/setup-guide.md` is fetched by `loadMarkdown()` (see `js/scripts.js`). Custom syntaxes: `[!TIP]`, `[!WARNING]`, `[STEP]` are converted into `.callout` and `.step` blocks.
  - Gallery: `js/gallery-loader.js` builds the travel gallery. Currently uses `sampleImages` and placeholder Unsplash URLs; real images are expected in `images/travel/` and getImageList() should be adapted to fetch a server-side list if needed.
  - Portfolio filtering: implemented inline in `projects.html` using `.filter-btn` and `data-filter`/`data-category` attributes.

Important conventions & patterns (project-specific)
- Markdown → HTML: `loadMarkdown()` reads `content/*.md` and `renderMarkdown()` performs light-weight regex-based parsing. If extending, keep the same header/id generation and update `generateTOC()` to keep TOC behavior consistent with `setup-guide.html` (TOC is injected into `#toc`).
- Custom markdown callouts: Use `[!TIP]` and `[!WARNING]` blocks to trigger `.callout.tip` and `.callout.warning` styles.
- Steps: Use `[STEP]` blocks to create numbered `.step` sections that rely on CSS counters.
- Theme handling: Toggle via `.theme-toggle` button. Respect `localStorage.theme` and only auto-switch by system preference if `localStorage.theme` is unset.
- Images & lazy-loading: Gallery images use `loading="lazy"` and `data-src` for local paths. If adding images, put them in `images/travel/` and ensure `gallery-loader.js` can find them or update `getImageList()`.
- Small utility JS is global and intentionally minimal (no modules). Page-specific scripts are sometimes inline (e.g., mobile menu toggles). Keep changes small and avoid introducing heavy frameworks without a clear reason.

Developer workflows & debugging tips
- Local dev: Run a simple HTTP server at project root. Examples:
  - `cd /path/to/my_website && python3 -m http.server 8000`
  - `cd /path/to/my_website && npx serve` (or `live-server` if preferred)
  Fetch-based features (markdown, images) require serving over HTTP — opening the file with `file://` will fail for `fetch()`.
- Debugging:
  - Use browser DevTools Console & Network tabs to check `fetch` failures (common issue: wrong path or CORS when fetching remote resources).
  - If markdown fails to render, check `loadMarkdown()` in `js/scripts.js` and confirm `content/setup-guide.md` is accessible.
  - Theme issues: inspect `#dark-css` (disabled attribute) and `localStorage.theme`.
- Tests: There are no unit tests or CI. Validate changes manually by running the local server and checking each page (guide rendering, portfolio filters, gallery loading, theme toggle, accessibility attributes).

Safety & accessibility notes
- The project aims for semantic HTML and ARIA attributes (e.g., mobile menu buttons and modal have `aria-label` or obvious keyboard interactions). Preserve or improve these when changing UI code.
- Modal uses Escape key handling and click-outside-to-close; keep or extend that behavior when modifying gallery or modals.

Examples & TODOs for contributors (good first tasks) ✅
- Replace `sampleImages` with a server-generated JSON list and update `getImageList()` to fetch it (see example below).
- Improve markdown parsing if you need richer syntax — update `renderMarkdown()`, `highlightCodeBlocks()`, and corresponding CSS in `css/styles.css`.
- Add simple E2E checks (Playwright) that verify the guide loads and the TOC links work (example below).
- Add convenience scripts for running E2E tests locally and in CI (we provide `scripts/run-e2e.sh` and `npm` scripts in `package.json`).

E2E helper notes (what to look for) 🧪
- `scripts/run-e2e.sh` starts a local server (default port 8001), waits for readiness, installs dependencies (JS or Python), installs Playwright browsers, runs tests, and cleans up the server.
- npm scripts:
  - `npm run test:e2e` → runs `./scripts/run-e2e.sh js`
  - `npm run test:e2e:js` → runs `./scripts/run-e2e.sh js`
  - `npm run test:e2e:py` → runs `./scripts/run-e2e.sh py`
- CI: Two GitHub Actions are included: `.github/workflows/e2e.yml` (Node/JS Playwright) and `.github/workflows/e2e-python.yml` (Python Playwright). Both start a simple HTTP server and upload JUnit results.

Quick local run examples:

```bash
# JS Playwright (default)
./scripts/run-e2e.sh js tests/index-quicklink.spec.js

# Python Playwright
./scripts/run-e2e.sh py tests/test_setup_guide.py

# Use npm shorthand
npm run test:e2e
npm run test:e2e:py
```

E2E Tests (Playwright) — quick example 🔍

- Install (local):
  - `npm ci` (requires `package.json` with `@playwright/test` as devDependency)
  - `npx playwright install --with-deps`
- Local run:
  - Start server: `npm run start` (serves at `http://localhost:8000`)
  - Run tests: `npm run test:e2e` or `npx playwright test`

Example test file (put in `tests/setup-guide.spec.js`):

```javascript
const { test, expect } = require('@playwright/test');

test('setup guide loads and TOC links work', async ({ page }) => {
  await page.goto('/setup-guide.html');
  await expect(page.locator('#markdown-content')).toBeVisible();

  const firstToc = page.locator('#toc a').first();
  await expect(firstToc).toBeVisible();

  const href = await firstToc.getAttribute('href');
  const targetId = href.replace('#', '');

  await firstToc.click();
  await expect(page.locator(`#${targetId}`)).toBeVisible();
});
```

GitHub Actions workflow (put in `.github/workflows/e2e.yml`):

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: python3 -m http.server 8000 &
      - run: npx playwright test --reporter=list
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-junit
          path: test-results/results.xml
```

Playwright (Python) — quick example 🐍

- Install (local):
  - `python -m pip install -r requirements.txt` (includes `playwright`, `pytest`, `pytest-playwright`)
  - `python -m playwright install --with-deps`
- Local run:
  - Start server: `npm run start` or `python3 -m http.server 8000`
  - Run tests: `pytest -q` (JUnit output: `pytest -q --junitxml=test-results/results.xml`)

Example test file (put in `tests/test_setup_guide.py`):

```python
def test_setup_guide_loads_and_toc(page):
    page.goto("http://localhost:8000/setup-guide.html")
    assert page.locator('#markdown-content').is_visible()

    first_toc = page.locator('#toc a').first
    assert first_toc.is_visible()

    href = first_toc.get_attribute('href')
    target_id = href.replace('#', '')

    first_toc.click()
    assert page.locator(f"#{target_id}").is_visible()
```

GitHub Actions workflow (put in `.github/workflows/e2e-python.yml`):

```yaml
name: E2E Tests (Python)
on: [push, pull_request]
jobs:
  e2e-python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
      - name: Install Playwright browsers
        run: python -m playwright install --with-deps
      - name: Start simple HTTP server
        run: python3 -m http.server 8000 &
      - name: Run pytest
        run: pytest -q --junitxml=test-results/results.xml
      - name: Upload JUnit result
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: pytest-junit
          path: test-results/results.xml
```

Code example — fetch an images JSON with fallback (put this in `js/gallery-loader.js`):

```javascript
async function getImageList() {
  try {
    const res = await fetch('/api/images.json'); // or '/images/list.json'
    if (!res.ok) throw new Error('Network response was not ok');
    const images = await res.json();
    // Expecting an array of { filename, title, description, url? }
    return images.map(img => ({
      ...img,
      url: img.url || `images/travel/${img.filename}`
    }));
  } catch (err) {
    console.warn('Fetching images failed; falling back to sampleImages', err);
    return sampleImages.map(img => ({ ...img, url: img.url || `images/travel/${img.filename}` }));
  }
}
```

Deployment (quick examples)
- Docker (quick serve using nginx):
  - Run without a Dockerfile: `docker run --rm -p 8000:80 -v "$(pwd)":/usr/share/nginx/html:ro -w /usr/share/nginx/html nginx:alpine`
  - Or build a small image:

```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
```

  - Then: `docker build -t my-website . && docker run --rm -p 8080:80 my-website`
- GitHub Pages:
  - Serve from the repository's `gh-pages` branch or from `main` (project settings → Pages). For automated deploys use actions like `peaceiris/actions-gh-pages` or `JamesIves/github-pages-deploy-action`.
  - Ensure static assets (images, `content/*.md`) are included in the published branch.

Questions? Tell me which areas to expand (examples, debug steps, or more file references) and I’ll iterate. 🙌
