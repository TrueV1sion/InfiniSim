import { GoogleGenAI } from "@google/genai";
import { ModelTier } from "../types";
import { resolveApiKey } from "./apiKeyService";
import { pruneVirtualState } from "../utils/statePruner";

const INJECTED_SCRIPT = `
<script>
  (function() {
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

    window.navigateTo = function(url) {
      window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: url, state: getBrowserState() }, '*');
    };

    var originalPushState = history.pushState;
    history.pushState = function(state, unused, url) {
      if (url) {
        window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: url.toString(), state: getBrowserState() }, '*');
      }
      return originalPushState.apply(this, arguments);
    };

    var originalReplaceState = history.replaceState;
    history.replaceState = function(state, unused, url) {
      if (url) {
        window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: url.toString(), state: getBrowserState() }, '*');
      }
      return originalReplaceState.apply(this, arguments);
    };

    document.addEventListener('click', function(e) {
      if (e.defaultPrevented) return;
      var link = e.target.closest('a');
      if (link) {
        var href = link.getAttribute('href');
        if (href && href !== '#' && !href.startsWith('javascript:')) {
          e.preventDefault();
          window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: href, state: getBrowserState() }, '*');
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
      window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: target, state: getBrowserState() }, '*');
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

You MUST include \`<script>\`/\`<link>\` tags ONLY for these specialized libraries if needed:
- Maps: Leaflet.js (\`<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>\`)
- 3D/WebGL: Three.js (\`<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>\`) or PlayCanvas (\`<script src="https://code.playcanvas.com/playcanvas-latest.js"><\/script>\`)
- 2D Physics: Matter.js (\`<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"><\/script>\`)

### CORE ARCHITECTURAL PRINCIPLES:
1. **Uncompromising Visual Quality**: Every page must look like an award-winning, professionally designed website. Use sophisticated typography via Google Fonts (Inter, JetBrains Mono, Playfair Display, etc.). Implement a cohesive color palette with proper contrast. Use generous whitespace, grid layouts, and visual hierarchy.
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

    if (html.includes('</body>') && !html.includes('INFINITE_WEB_NAVIGATE')) {
      html = html.replace('</body>', `${INJECTED_SCRIPT}</body>`);
    } else if (!html.includes('INFINITE_WEB_NAVIGATE')) {
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

function buildPrompt(
  url: string,
  stateString: string,
  deviceType: string,
  soundEnabled: boolean,
  isDeepResearch: boolean
): string {
  return `[TARGET_URL: "${url}"]
[DEVICE_TYPE: "${deviceType}"]
[SOUND_ENABLED: ${soundEnabled ? 'TRUE' : 'FALSE'}]
[CURRENT_BROWSER_STATE: ${stateString}]

Generate the complete, fully interactive page for the target URL.
${deviceType !== 'desktop' ? `DEVICE: Optimize layout, typography, and interactions for ${deviceType}. Use Tailwind responsive prefixes appropriately, but ensure base classes look perfect for ${deviceType}.` : ''}
${deviceType === 'vr' ? 'VR MODE: Use A-Frame (<script src="https://aframe.io/releases/1.4.2/aframe.min.js"><\\/script>) or Three.js for an immersive 3D environment with interactive objects, skybox, and camera controls.' : ''}
${deviceType === 'ar' ? 'AR MODE: Use A-Frame with AR.js or WebXR. Transparent background — no skybox. Render 3D objects floating in space.' : ''}
${soundEnabled ? 'AUDIO ENABLED: Integrate Tone.js for procedural background music and Howler.js for UI sound effects. Create an immersive soundscape reacting to user interactions. Start audio context on first user interaction.' : ''}
${stateString !== 'None' ? 'STATE: Render the page reflecting the provided browser state (logged-in status, cart items, preferences, etc.).' : ''}
IMAGE INSTRUCTION: For images, use \`data-ai-prompt="<detailed description>"\` on \`<img>\` tags. The runtime generates these. Example: \`<img data-ai-prompt="A modern cityscape at sunset" src="" alt="Cityscape" />\`. Also use Pexels stock photos where appropriate.
${isDeepResearch ? 'DEEP RESEARCH MODE: Apply maximum architectural reasoning. Every JS component must be flawless. Optimize for maximum visual fidelity and interactivity.' : ''}
If this is a known brand, simulate a high-fidelity alternative universe version. If it is a tool or game, make it fully production-ready.`;
}

export const generatePageContentStream = async function* (
  url: string,
  model: ModelTier,
  isDeepResearch: boolean = false,
  virtualState?: any,
  deviceType: 'desktop' | 'tablet' | 'mobile' | 'vr' | 'ar' = 'desktop',
  soundEnabled: boolean = false,
  userId?: string
): AsyncGenerator<string, void, unknown> {
  const apiKey = await resolveApiKey(userId);
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  const pruned = virtualState ? pruneVirtualState(virtualState) : null;
  const stateString = pruned && Object.keys(pruned).length > 0
    ? JSON.stringify(pruned)
    : 'None';

  const prompt = buildPrompt(url, stateString, deviceType, soundEnabled, isDeepResearch);

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

const IMAGE_MODEL = 'gemini-3.1-flash-image-preview';
const IMAGE_TIMEOUT_MS = 15000;

export const generateImage = async (prompt: string, userId?: string): Promise<string> => {
  const apiKey = await resolveApiKey(userId);
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: `Generate a high-quality photograph: ${prompt}. Photorealistic, professional lighting, high resolution.`,
      config: {
        responseModalities: ['image', 'text'],
      },
    });

    clearTimeout(timeout);

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
  userId?: string
): Promise<string> => {
  const apiKey = await resolveApiKey(userId);
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  const pruned = virtualState ? pruneVirtualState(virtualState) : null;
  const stateString = pruned && Object.keys(pruned).length > 0
    ? JSON.stringify(pruned)
    : 'None';

  const prompt = buildPrompt(url, stateString, deviceType, soundEnabled, isDeepResearch);

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
