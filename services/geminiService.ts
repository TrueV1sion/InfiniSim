import { GoogleGenAI } from "@google/genai";
import { ModelTier } from "../types";
import { resolveApiKey } from "./apiKeyService";
import { pruneVirtualState } from "../utils/statePruner";
import { resolveStyle, getStylePromptSection } from "../utils/styleResolver";

const INJECTED_SCRIPT = `
<script>
  (function() {
    if (window.__infiniteWebBridge) return;
    window.__infiniteWebBridge = true;

    var _vls = {};
    var _vss = {};

    try {
      var lsProxy = new Proxy({}, {
        getPrototypeOf: function() { return Storage.prototype; },
        get: function(t, k) {
          if (k === 'getItem') return function(key) { return _vls[key] !== undefined ? _vls[key] : null; };
          if (k === 'setItem') return function(key, val) { _vls[key] = String(val); syncState(); };
          if (k === 'removeItem') return function(key) { delete _vls[key]; syncState(); };
          if (k === 'clear') return function() { _vls = {}; syncState(); };
          if (k === 'key') return function(i) { return Object.keys(_vls)[i] || null; };
          if (k === 'length') return Object.keys(_vls).length;
          return _vls[k] !== undefined ? _vls[k] : null;
        },
        set: function(t, k, v) { _vls[k] = String(v); syncState(); return true; }
      });

      var ssProxy = new Proxy({}, {
        getPrototypeOf: function() { return Storage.prototype; },
        get: function(t, k) {
          if (k === 'getItem') return function(key) { return _vss[key] !== undefined ? _vss[key] : null; };
          if (k === 'setItem') return function(key, val) { _vss[key] = String(val); syncState(); };
          if (k === 'removeItem') return function(key) { delete _vss[key]; syncState(); };
          if (k === 'clear') return function() { _vss = {}; syncState(); };
          if (k === 'key') return function(i) { return Object.keys(_vss)[i] || null; };
          if (k === 'length') return Object.keys(_vss).length;
          return _vss[k] !== undefined ? _vss[k] : null;
        },
        set: function(t, k, v) { _vss[k] = String(v); syncState(); return true; }
      });

      Object.defineProperty(window, 'localStorage', { get: function() { return lsProxy; }, configurable: true });
      Object.defineProperty(window, 'sessionStorage', { get: function() { return ssProxy; }, configurable: true });
    } catch(e) {}

    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'INFINITE_WEB_RESTORE_STATE') {
        var s = e.data.state || {};
        if (s.localStorage) { for (var k in s.localStorage) _vls[k] = s.localStorage[k]; }
        if (s.sessionStorage) { for (var k in s.sessionStorage) _vss[k] = s.sessionStorage[k]; }
      }
    });

    function getBrowserState() {
      return { localStorage: Object.assign({}, _vls), sessionStorage: Object.assign({}, _vss) };
    }

    function syncState() {
      window.parent.postMessage({ type: 'INFINITE_WEB_STATE_UPDATE', state: getBrowserState() }, '*');
    }

    document.addEventListener('change', syncState);

    if (window.Swal) {
      window.alert = function(message) {
        Swal.fire({ text: message, confirmButtonColor: '#3b82f6' });
      };
      window.confirm = function(message) {
        console.warn('window.confirm is deprecated in InfiniteWeb. Use Swal.fire() instead.');
        return true;
      };
      window.prompt = function(message, defaultText) {
        console.warn('window.prompt is deprecated in InfiniteWeb. Use Swal.fire() instead.');
        return defaultText || null;
      };
    }

    function doNavigate(url) {
      window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: url, state: getBrowserState() }, '*');
    }

    window.navigateTo = doNavigate;
    window.navigate = doNavigate;
    window.goTo = doNavigate;
    window.router = window.router || {};
    window.router.push = doNavigate;
    window.router.replace = doNavigate;
    window.paginateTo = function(basePath, page) {
      doNavigate(basePath + (basePath.includes('?') ? '&' : '?') + 'page=' + page);
    };

    var originalPushState = history.pushState;
    history.pushState = function(state, unused, url) {
      if (url) {
        doNavigate(url.toString());
      }
      return originalPushState.apply(this, arguments);
    };

    var originalReplaceState = history.replaceState;
    history.replaceState = function(state, unused, url) {
      if (url) {
        doNavigate(url.toString());
      }
      return originalReplaceState.apply(this, arguments);
    };

    document.addEventListener('click', function(e) {
      if (e.defaultPrevented) return;

      var link = e.target.closest('a');
      if (link) {
        var href = link.getAttribute('href');
        if (!href || href === '#' || href.startsWith('javascript:')) return;
        if (href.startsWith('#') && href.length > 1) {
          e.preventDefault();
          var target = document.querySelector(href) || document.getElementById(href.substring(1));
          if (target) target.scrollIntoView({ behavior: 'smooth' });
          return;
        }
        e.preventDefault();
        doNavigate(href);
        return;
      }

      var cardLink = e.target.closest('[data-card-link]');
      if (cardLink && !e.target.closest('a, button, input, select, textarea, [role="button"]')) {
        e.preventDefault();
        doNavigate(cardLink.getAttribute('data-card-link'));
        return;
      }

      var btn = e.target.closest('button, [role="button"], [role="link"]');
      if (btn) {
        var dataHref = btn.getAttribute('data-href') || btn.getAttribute('data-navigate');
        if (dataHref) {
          e.preventDefault();
          doNavigate(dataHref);
          return;
        }

        if (!btn.getAttribute('onclick') &&
            !btn.getAttribute('@click') &&
            !btn.getAttribute('x-on:click') &&
            !btn.hasAttribute('data-action') &&
            !btn.closest('form') &&
            !btn.closest('[x-data]') &&
            btn.getAttribute('type') !== 'submit') {

          var text = (btn.textContent || '').trim();
          var navKeywords = /^(view|read|see|open|explore|visit|go to|learn|more|details|show|browse|discover|continue|next|previous|prev|back|get started|sign up|log in|join|subscribe|buy|shop|order|try|start)/i;
          if (text && navKeywords.test(text)) {
            var slug = text.toLowerCase().replace(/[^a-z0-9\\s-]/g, '').replace(/\\s+/g, '-').substring(0, 40);
            var currentPath = window.location.pathname || '/';
            e.preventDefault();
            doNavigate(currentPath.replace(/\\/$/, '') + '/' + slug);
          }
        }
      }
    });

    document.addEventListener('submit', function(e) {
      if (e.defaultPrevented) return;
      e.preventDefault();
      var form = e.target;
      var action = form.getAttribute('action') || window.location.pathname;
      if (action.startsWith('javascript:')) return;
      var formData = new FormData(form);
      var params = new URLSearchParams();
      for (var pair of formData.entries()) {
        params.append(pair[0], pair[1].toString());
      }
      var queryStr = params.toString();
      var target = action + (action.includes('?') ? '&' : '?') + queryStr;
      doNavigate(target);
    });

    var originalLog = console.log;
    var originalError = console.error;
    console.log = function() {
      originalLog.apply(console, arguments);
      var args = Array.prototype.slice.call(arguments);
      window.parent.postMessage({ type: 'DEVTOOLS_CONSOLE_LOG', level: 'log', payload: args.map(function(a) { return String(a); }) }, '*');
    };
    console.error = function() {
      originalError.apply(console, arguments);
      var args = Array.prototype.slice.call(arguments);
      window.parent.postMessage({ type: 'DEVTOOLS_CONSOLE_LOG', level: 'error', payload: args.map(function(a) { return String(a); }) }, '*');
    };
  })();
</script>
`;

export const MINIMAL_BRIDGE_SCRIPT = `
<script>
  (function() {
    if (window.__infiniteWebBridge) return;
    function doNavigate(url) {
      window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: url }, '*');
    }
    window.navigateTo = doNavigate;
    window.navigate = doNavigate;
    window.goTo = doNavigate;
    window.router = window.router || {};
    window.router.push = doNavigate;
    window.router.replace = doNavigate;
    document.addEventListener('click', function(e) {
      if (e.defaultPrevented) return;
      var link = e.target.closest('a');
      if (link) {
        var href = link.getAttribute('href');
        if (!href || href === '#' || href.startsWith('javascript:')) return;
        if (href.startsWith('#') && href.length > 1) {
          e.preventDefault();
          var target = document.querySelector(href) || document.getElementById(href.substring(1));
          if (target) target.scrollIntoView({ behavior: 'smooth' });
          return;
        }
        e.preventDefault();
        doNavigate(href);
      }
    });
  })();
</script>
`;

const SYSTEM_INSTRUCTION = `You are InfiniteWeb 4.0, the world's most advanced generative web engine. You simulate a fully interactive, hyper-realistic internet.

### ABSOLUTE OUTPUT RULES (READ FIRST):
- Return ONLY raw HTML5 starting with \`<!DOCTYPE html>\`.
- NO markdown wrappers (\`\`\`html). NO explanations. NO commentary. JUST the HTML document.
- ALWAYS include proper \`<html>\`, \`<head>\`, and \`<body>\` tags.
- Place ALL \`<script>\` tags at the END of \`<body>\`, right before \`</body>\`.

### LIBRARY ECOSYSTEM (CRITICAL):
The following libraries are AUTOMATICALLY INJECTED by the runtime. You MUST NOT include their \`<script>\` or \`<link>\` tags — they are already loaded. Just use them directly in your code:
- **Tailwind CSS** + **DaisyUI** (classes like \`btn\`, \`card\`, \`modal\`, \`badge\`, \`drawer\`, etc.)
- **Alpine.js** (\`x-data\`, \`x-show\`, \`x-bind\`, \`@click\`, etc.)
- **Lucide Icons** (call \`lucide.createIcons()\` after DOM ready)
- **GSAP** (\`gsap.to()\`, \`gsap.from()\`, \`gsap.timeline()\`)
- **Chart.js** (\`new Chart(ctx, config)\`)
- **Faker.js** (\`window.faker.person.fullName()\`, \`faker.lorem.paragraph()\`, etc.)
- **SortableJS** (\`new Sortable(el, options)\`)
- **Howler.js** (\`new Howl({src: [...]})\`)
- **Tone.js** (\`new Tone.Synth()\`)
- **Marked.js** (\`marked.parse(md)\`)
- **Canvas Confetti** (\`confetti()\`)
- **SweetAlert2** (\`Swal.fire()\` — native \`alert\`/\`confirm\`/\`prompt\` are overridden to use Swal)

You may use Tailwind utilities, DaisyUI components, AND/OR custom CSS in a \`<style>\` block — whichever best serves the design mood. You are NOT limited to Tailwind.

You MUST include \`<script>\`/\`<link>\` tags ONLY for these specialized libraries if needed:
- Maps: Leaflet.js (\`<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\\/script>\`)
- 3D/WebGL: Three.js (\`<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\\/script>\`) or PlayCanvas (\`<script src="https://code.playcanvas.com/playcanvas-latest.js"><\\/script>\`)
- 2D Physics: Matter.js (\`<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"><\\/script>\`)

### CORE ARCHITECTURAL PRINCIPLES:
1. **Adaptive Visual Identity**: Every page MUST have a unique visual personality. The prompt will include a VISUAL IDENTITY DIRECTIVE with specific colors, typography, layout style, and mood. You MUST follow these specifications precisely — do NOT default to a generic dark tech aesthetic, do NOT reuse the same design across different sites. Load appropriate Google Fonts via \`<link>\` in the \`<head>\` to match the typography directive. Use custom CSS \`<style>\` blocks when the mood calls for effects beyond Tailwind (glows, textures, patterns, gradients, etc.).
2. **Total Interactivity**: EVERY button, link, and UI element MUST be fully functional.
   - Navigation: use \`<a>\` tags with descriptive \`href\` attributes (e.g., \`/profile\`, \`/checkout\`).
   - JS navigation: call \`window.navigateTo('/url')\`. NEVER use \`window.location.href\`.
   - Interactive features (Like, Save, Add to Cart, Submit): write actual JavaScript to update DOM, show toasts/notifications via Swal or custom elements, and persist state to \`localStorage\`.
   - ZERO dead buttons. Every visible control must do something meaningful.
3. **Dynamic & Alive Content**: Use JS intervals/timeouts for realistic real-time updates — timestamps updating, counters incrementing, feeds rotating, notifications arriving, stock tickers fluctuating.
4. **Realistic Loading Simulation**: Show skeleton loaders, shimmer effects, or spinners initially. Use \`setTimeout\` (800-2000ms) to "fetch" and reveal content progressively, simulating real API calls.
5. **Responsive Design**: Use Tailwind responsive prefixes (\`sm:\`, \`md:\`, \`lg:\`, \`xl:\`) so layout adapts perfectly across all viewport sizes.
6. **Micro-interactions**: Hover scales, subtle shadows, smooth GSAP entrance animations, transition effects on state changes. Make every interaction feel polished.
7. **Rich Content Density**: Generate substantial, realistic content — not placeholder lorem ipsum. Use Faker.js (\`window.faker\`) for realistic names, emails, dates, paragraphs, company names, etc. Populate feeds, tables, cards, and lists with diverse, believable data.

### UNIVERSAL NAVIGATION RULES (CRITICAL — ZERO DEAD ELEMENTS):
Every single interactive element on the page MUST lead somewhere or do something real. Follow these rules strictly:

1. **Links**: Every \`<a>\` tag MUST have a meaningful \`href\` that describes the destination (e.g., \`/products/quantum-headphones\`, \`/user/jane-doe/profile\`, \`/blog/post/ai-revolution\`). NEVER use \`href="#"\` or empty \`href\` values for navigation links.
2. **Buttons that navigate**: Any button that conceptually leads to another view (View Details, Read More, See All, Visit Profile, Open, Explore, Get Started) MUST call \`window.navigateTo('/descriptive-path')\` on click.
3. **Contextual paths**: Navigation links MUST include contextual path segments. A product card for "Quantum Headphones" priced at $299 should link to \`/products/quantum-headphones\` — NOT a generic \`/product\`.
4. **Pagination**: Each page number, Next, Previous button MUST use \`window.paginateTo(basePath, pageNumber)\` or \`window.navigateTo()\` with page params. Page 2 MUST show different content than page 1.
5. **Comments & Social**: Each username MUST link to a user profile page (\`/user/{handle}\`). Each "Reply" MUST open an inline reply form or navigate. "View N replies" MUST expand or navigate to \`/post/{id}/comments\`.
6. **Navigation menus**: Sidebar items, footer links, breadcrumbs, tab headers, dropdown items — ALL must use \`<a href>\` or \`window.navigateTo()\` with descriptive URLs.
7. **Cards & Grids**: The ENTIRE card surface must be clickable. Use \`data-card-link="/products/item-slug"\` on the card container, or wrap in an \`<a>\` tag. Each card in a grid MUST link to a unique detail page.
8. **Search results**: Every result item MUST navigate to a corresponding detail page.
9. **Modals & Dialogs**: Modals with complex content (quick-view, profile popup) MUST include a "View Full Page" link that calls \`window.navigateTo()\`.
10. **Dropdown menus**: Use \`<a href="/path">\` for each dropdown item. NEVER use plain \`<div>\` or \`<span>\` for navigation menu items.
11. **Breadcrumbs**: Every page below root level MUST include breadcrumb navigation. Each breadcrumb is a clickable \`<a>\` linking to the parent path.
12. **Tabs**: Simple tabs use Alpine.js for client-side switching. Complex tabs with separate data (Reviews, Specifications) navigate via \`window.navigateTo('/product/item/reviews')\`.
13. **Form submissions**: Search forms navigate to \`/search?q={query}\`. Login forms show a "logged in" state. Contact forms show a confirmation page.

### NAVIGATION PATTERN EXAMPLES:
- Blog listing: each post card \`<a href="/blog/post/{slug}">\` with full card clickable
- E-commerce grid: each product \`<a href="/products/{product-slug}">\`, price, title, image all inside the link
- Social feed: username links to \`/user/{handle}\`, post links to \`/post/{id}\`, comments to \`/post/{id}/comments\`
- Dashboard sidebar: each menu item \`<a href="/dashboard/{section}">\`
- Settings page: each category \`<a href="/settings/{category}">\`

### IMAGE GENERATION:
To include images, use \`data-ai-prompt\` on \`<img>\` tags. The runtime generates these in real-time.
Example: \`<img data-ai-prompt="Professional headshot of a smiling woman in business attire" src="" alt="Profile photo" class="w-full h-48 object-cover" />\`
Always include descriptive prompts, proper alt text, and sizing classes. Use Pexels stock photos via direct URL when appropriate for generic imagery (e.g. \`src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=600"\`).

### GAME ENGINE (PLAYCANVAS) SPECIFICS:
When generating games or 3D worlds:
- Full-screen canvas with id "application-canvas"
- Responsive: \`app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW); app.setCanvasResolution(pc.RESOLUTION_AUTO);\`
- Complex environments with primitives styled via shaders/lighting
- Polished game-feel: camera damping, particles, responsive WASD/Mouse controls

### FOOTER:
Include a subtle footer: "Copyright 202X — Simulated by InfiniteWeb"
`;

export const PRELOADED_SCRIPTS = `<!-- InfiniteWeb Runtime Libraries -->
<link href="https://cdn.jsdelivr.net/npm/daisyui@4.10.2/dist/full.min.css" rel="stylesheet" type="text/css" />
<script src="https://cdn.tailwindcss.com"><\/script>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"><\/script>
<script src="https://unpkg.com/lucide@latest"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.4/howler.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"><\/script>
<script type="module">import { faker } from 'https://esm.sh/@faker-js/faker'; window.faker = faker;<\/script>
`;

const LIB_MARKER = 'InfiniteWeb Runtime Libraries';

export const cleanHtml = (html: string) => {
    html = html.replace(/^\s*```html\n?/i, '').replace(/\n?```\s*$/, '').trim();

    if (!html.includes(LIB_MARKER)) {
        const headMatch = html.match(/<head[^>]*>/i);
        if (headMatch) {
            const insertPos = html.indexOf(headMatch[0]) + headMatch[0].length;
            html = html.slice(0, insertPos) + '\n' + PRELOADED_SCRIPTS + html.slice(insertPos);
        } else {
            html = PRELOADED_SCRIPTS + '\n' + html;
        }
    }

    if (html.includes('</body>') && !html.includes('__infiniteWebBridge')) {
      html = html.replace('</body>', `${INJECTED_SCRIPT}</body>`);
    } else if (!html.includes('__infiniteWebBridge')) {
      html += INJECTED_SCRIPT;
    }
    return html;
};

function getModelConfig(model: ModelTier, isDeepResearch: boolean) {
  const isFlash = model === ModelTier.FLASH;
  return {
    systemInstruction: SYSTEM_INSTRUCTION,
    temperature: isDeepResearch ? 0.8 : 0.65,
    maxOutputTokens: isFlash ? 32768 : 65536,
    thinkingConfig: {
      thinkingBudget: isFlash
        ? (isDeepResearch ? 8192 : 4096)
        : (isDeepResearch ? 12000 : 6000)
    },
  };
}

export interface NavigationContext {
  referrerUrl?: string;
  siteIdentity?: {
    brandName?: string;
    domain?: string;
  };
  breadcrumb?: Array<{ url: string; title: string }>;
  queryParams?: Record<string, string>;
  userStylePreference?: string;
}

function buildPrompt(
  url: string,
  stateString: string,
  deviceType: string,
  soundEnabled: boolean,
  isDeepResearch: boolean,
  navContext?: NavigationContext
): string {
  let contextSection = '';

  if (navContext?.referrerUrl) {
    contextSection += `\n[REFERRER_URL: "${navContext.referrerUrl}"]`;
  }

  if (navContext?.siteIdentity && Object.keys(navContext.siteIdentity).length > 0) {
    const si = navContext.siteIdentity;
    contextSection += `\n[SITE_IDENTITY: ${JSON.stringify(si)}]`;
    contextSection += `\nSITE CONTINUITY (MANDATORY):`;
    contextSection += `\n- This is a SUBPAGE of an existing site. You MUST maintain the same brand identity and overall design language.`;
    if (si.brandName) {
      contextSection += `\n- The site brand name is "${si.brandName}". Use EXACTLY this name in the logo, navigation, title, and footer. Do NOT invent a different name.`;
    }
    if (si.domain) {
      contextSection += `\n- The site domain is "${si.domain}". All internal links must stay on this domain.`;
    }
    contextSection += `\n- Maintain the same navigation bar structure and footer from the parent page.`;
    contextSection += `\n- Adapt the main content area layout to suit this subpage's content.`;
    contextSection += `\n- NEVER rename or rebrand the site. NEVER use generic names like "Nexus", "Nova", "Apex", "Pulse", or any other invented brand.`;
  }

  const styleResult = resolveStyle(url);
  const styleSection = getStylePromptSection(styleResult, navContext?.userStylePreference);

  if (navContext?.breadcrumb && navContext.breadcrumb.length > 0) {
    contextSection += `\n[NAVIGATION_BREADCRUMB: ${JSON.stringify(navContext.breadcrumb)}]`;
    contextSection += `\nBREADCRUMB: Render a clickable breadcrumb trail at the top of the page using this path data. Each segment must be a link via <a href>.`;
  }

  if (navContext?.queryParams && Object.keys(navContext.queryParams).length > 0) {
    contextSection += `\n[QUERY_PARAMS: ${JSON.stringify(navContext.queryParams)}]`;
    contextSection += `\nQUERY PARAMETERS: Use these to filter, sort, paginate, or display search results. Reflect them in the page content.`;
  }

  return `[TARGET_URL: "${url}"]
[DEVICE_TYPE: "${deviceType}"]
[SOUND_ENABLED: ${soundEnabled ? 'TRUE' : 'FALSE'}]
[CURRENT_BROWSER_STATE: ${stateString}]${contextSection}
${styleSection}
Generate the complete, fully interactive page for the target URL.
CRITICAL: Every button, link, card, tab, menu item, and interactive element MUST be wired to navigate via <a href> or window.navigateTo(). Zero dead buttons. Zero non-functional links.
CRITICAL: Follow the VISUAL IDENTITY DIRECTIVE above precisely. The page design MUST match the specified mood, colors, and typography — not a generic template.
${deviceType !== 'desktop' ? `DEVICE: Optimize layout, typography, and interactions for ${deviceType}. Use Tailwind responsive prefixes appropriately, but ensure base classes look perfect for ${deviceType}.` : ''}
${deviceType === 'vr' ? 'VR MODE: Use A-Frame (<script src="https://aframe.io/releases/1.4.2/aframe.min.js"><\\/script>) or Three.js for an immersive 3D environment with interactive objects, skybox, and camera controls.' : ''}
${deviceType === 'ar' ? 'AR MODE: Use A-Frame with AR.js or WebXR. Transparent background — no skybox. Render 3D objects floating in space.' : ''}
${soundEnabled ? 'AUDIO ENABLED: Integrate Tone.js for procedural background music and Howler.js for UI sound effects. Create an immersive soundscape reacting to user interactions. Start audio context on first user interaction.' : ''}
${stateString !== 'None' ? 'STATE: Render the page reflecting the provided browser state (logged-in status, cart items, preferences, etc.).' : ''}
IMAGE INSTRUCTION: For images, use \`data-ai-prompt="<detailed description>"\` on \`<img>\` tags. The runtime generates these. Example: \`<img data-ai-prompt="A modern cityscape at sunset" src="" alt="Cityscape" />\`. Also use Pexels stock photos where appropriate.
${isDeepResearch ? 'DEEP RESEARCH MODE: Apply maximum architectural reasoning. Every JS component must be flawless. Optimize for maximum visual fidelity and interactivity.' : ''}
${navContext?.siteIdentity?.brandName ? `REMINDER: The site name is "${navContext.siteIdentity.brandName}". Use this EXACT name everywhere — in the logo, nav, title tag, and footer. Do NOT change or replace it.` : ''}`;
}

export const generatePageContentStream = async function* (
  url: string,
  model: ModelTier,
  isDeepResearch: boolean = false,
  virtualState?: any,
  deviceType: 'desktop' | 'tablet' | 'mobile' | 'vr' | 'ar' = 'desktop',
  soundEnabled: boolean = false,
  userId?: string,
  navContext?: NavigationContext
): AsyncGenerator<string, void, unknown> {
  const apiKey = await resolveApiKey(userId);
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  const pruned = virtualState ? pruneVirtualState(virtualState) : null;
  const stateString = pruned && Object.keys(pruned).length > 0
    ? JSON.stringify(pruned)
    : 'None';

  const prompt = buildPrompt(url, stateString, deviceType, soundEnabled, isDeepResearch, navContext);

  try {
    const responseStream = await ai.models.generateContentStream({
      model: model,
      contents: prompt,
      config: getModelConfig(model, isDeepResearch),
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Gemini Stream Error:", error);
    throw error;
  }
};

const IMAGE_MODEL = 'gemini-2.0-flash-preview-image-generation';
const IMAGE_TIMEOUT_MS = 30000;

export const generateImage = async (prompt: string, userId?: string): Promise<string> => {
  const apiKey = await resolveApiKey(userId);
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Image generation timed out')), IMAGE_TIMEOUT_MS);
    });

    const generatePromise = ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: `Generate a high-quality photograph: ${prompt}. Photorealistic, professional lighting, high resolution.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return '';
  } catch (error) {
    console.error("Image Generation Error:", error);
    return '';
  }
};

function buildPlaceholderSvg(prompt: string): string {
  const escaped = prompt.replace(/[<>&"']/g, '').substring(0, 60);
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#1e293b"/><stop offset="100%" style="stop-color:#334155"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><text x="200" y="140" fill="#94a3b8" font-family="system-ui" font-size="13" text-anchor="middle">${escaped}</text><text x="200" y="170" fill="#475569" font-family="system-ui" font-size="11" text-anchor="middle">Image unavailable</text></svg>`)}`;
}

export const processAiImages = async (
  html: string,
  onProgress?: (completed: number, total: number) => void
): Promise<string> => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const images = Array.from(doc.querySelectorAll('img[data-ai-prompt]'));

  if (images.length === 0) return html;

  const total = images.length;
  let completed = 0;
  onProgress?.(0, total);

  const BATCH_SIZE = 3;
  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (img) => {
      const prompt = img.getAttribute('data-ai-prompt');
      if (!prompt) {
        completed++;
        onProgress?.(completed, total);
        return;
      }

      try {
        const base64Image = await generateImage(prompt);
        if (base64Image) {
          img.setAttribute('src', base64Image);
          img.removeAttribute('data-ai-prompt');
        } else {
          img.setAttribute('src', buildPlaceholderSvg(prompt));
        }
      } catch {
        img.setAttribute('src', buildPlaceholderSvg(prompt));
      }

      completed++;
      onProgress?.(completed, total);
    }));
  }

  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] || '<!DOCTYPE html>';
  return `${doctype}\n${doc.documentElement.outerHTML}`;
};

export const generatePageContent = async (
  url: string,
  model: ModelTier,
  isDeepResearch: boolean = false,
  virtualState?: any,
  deviceType: 'desktop' | 'tablet' | 'mobile' | 'vr' | 'ar' = 'desktop',
  soundEnabled: boolean = false,
  userId?: string,
  navContext?: NavigationContext
): Promise<string> => {
  const apiKey = await resolveApiKey(userId);
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  const pruned = virtualState ? pruneVirtualState(virtualState) : null;
  const stateString = pruned && Object.keys(pruned).length > 0
    ? JSON.stringify(pruned)
    : 'None';

  const prompt = buildPrompt(url, stateString, deviceType, soundEnabled, isDeepResearch, navContext);

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: getModelConfig(model, isDeepResearch),
    });

    return cleanHtml(response.text || "<!-- Error --><h1>Empty Response</h1>");
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

export const refinePageContent = async (
  currentHtml: string,
  instruction: string,
  model: ModelTier,
  deviceType: 'desktop' | 'tablet' | 'mobile' | 'vr' | 'ar' = 'desktop',
  soundEnabled: boolean = false,
  userId?: string
): Promise<string> => {
  const apiKey = await resolveApiKey(userId);
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `[REQUEST_TYPE: CODE_REFINEMENT]
[INSTRUCTION: "${instruction}"]
[DEVICE_TYPE: "${deviceType}"]
[SOUND_ENABLED: ${soundEnabled ? 'TRUE' : 'FALSE'}]

Modify the existing HTML source to satisfy the user's request.
${deviceType !== 'desktop' ? `Optimize for ${deviceType} viewport.` : ''}
${soundEnabled ? 'Audio is enabled — integrate Tone.js/Howler.js as appropriate.' : ''}
Keep all injected bridge scripts intact. Maintain the design system.
CRITICAL: Ensure ALL buttons, links, and interactive elements navigate or perform actions. Zero dead elements.
Return the FULL updated HTML source starting with <!DOCTYPE html>.

[CURRENT_SOURCE_START]
${currentHtml}
[CURRENT_SOURCE_END]`;

  try {
    const isFlash = model === ModelTier.FLASH;
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4,
        maxOutputTokens: isFlash ? 32768 : 65536,
        thinkingConfig: {
          thinkingBudget: isFlash ? 2048 : 4000,
        },
      }
    });

    return cleanHtml(response.text || currentHtml);
  } catch (error) {
    console.error("Refinement Error", error);
    throw error;
  }
};
