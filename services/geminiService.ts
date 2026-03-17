import { GoogleGenAI } from "@google/genai";
import { ModelTier } from "../types";
import { resolveStyle, getStylePromptSection } from "../utils/styleResolver";
import { resolveCreativeDirection, getCreativeDirectionPrompt } from "../config/creativeDirections";

const INJECTED_SCRIPT = `
<script>
  (function() {
    function getBrowserState() {
      try {
        return {
          localStorage: Object.assign({}, window.localStorage),
          sessionStorage: Object.assign({}, window.sessionStorage),
          cookie: document.cookie
        };
      } catch(e) { return {}; }
    }

    function syncState() {
      window.parent.postMessage({ type: 'INFINITE_WEB_STATE_UPDATE', state: getBrowserState() }, '*');
    }

    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      originalSetItem.apply(this, arguments);
      syncState();
    };
    const originalRemoveItem = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function(key) {
      originalRemoveItem.apply(this, arguments);
      syncState();
    };
    const originalClear = Storage.prototype.clear;
    Storage.prototype.clear = function() {
      originalClear.apply(this, arguments);
      syncState();
    };

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

    const originalPushState = history.pushState;
    history.pushState = function(state, unused, url) {
      if (url) {
        window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: url.toString(), state: getBrowserState() }, '*');
      }
      return originalPushState.apply(this, arguments);
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function(state, unused, url) {
      if (url) {
        window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: url.toString(), state: getBrowserState() }, '*');
      }
      return originalReplaceState.apply(this, arguments);
    };

    document.addEventListener('click', function(e) {
      if (e.defaultPrevented) return;
      const link = e.target.closest('a');
      if (link) {
        const href = link.getAttribute('href');
        if (href && href !== '#' && !href.startsWith('javascript:')) {
          e.preventDefault();
          window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: href, state: getBrowserState() }, '*');
        }
      }
    });

    document.addEventListener('submit', function(e) {
      if (e.defaultPrevented) return;
      e.preventDefault();
      const form = e.target;
      const action = form.getAttribute('action') || window.location.pathname;
      if (action.startsWith('javascript:')) return;
      const formData = new FormData(form);
      const params = new URLSearchParams();
      for (const [key, value] of formData.entries()) {
        params.append(key, value.toString());
      }
      const queryStr = params.toString();
      const target = action + (action.includes('?') ? '&' : '?') + queryStr;
      window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: target, state: getBrowserState() }, '*');
    });

    const originalLog = console.log;
    const originalError = console.error;
    console.log = (...args) => {
      originalLog(...args);
      window.parent.postMessage({ type: 'DEVTOOLS_CONSOLE_LOG', level: 'log', payload: args.map(a => String(a)) }, '*');
    };
    console.error = (...args) => {
      originalError(...args);
      window.parent.postMessage({ type: 'DEVTOOLS_CONSOLE_LOG', level: 'error', payload: args.map(a => String(a)) }, '*');
    };

    const originalFetch = window.fetch;
    window.fetch = async function(resource, init) {
      const url = typeof resource === 'string' ? resource : resource.url;
      if (url.startsWith('/api/') || url.includes('api.')) {
        return new Promise((resolve, reject) => {
          const requestId = Math.random().toString(36).substring(7);

          const handler = (event) => {
            if (event.data.type === 'INFINITE_WEB_API_RESPONSE' && event.data.requestId === requestId) {
              window.removeEventListener('message', handler);
              resolve(new Response(event.data.body, {
                status: event.data.status || 200,
                headers: { 'Content-Type': 'application/json' }
              }));
            }
          };
          window.addEventListener('message', handler);

          window.parent.postMessage({
            type: 'INFINITE_WEB_API_CALL',
            requestId,
            url,
            method: init?.method || 'GET',
            body: init?.body,
            state: getBrowserState()
          }, '*');
        });
      }
      return originalFetch.apply(this, arguments);
    };
  })();
</script>
`;

const SYSTEM_INSTRUCTION = `You are InfiniteWeb 4.0, the world's most advanced generative web engine. You simulate a fully interactive, hyper-realistic internet where every page looks like it was designed by a top creative agency and built by a senior engineering team.

### ABSOLUTE OUTPUT RULES (READ FIRST):
- Return ONLY raw HTML5 starting with \`<!DOCTYPE html>\`.
- NO markdown wrappers (\`\`\`html). NO explanations. NO commentary. JUST the HTML document.
- ALWAYS include proper \`<html>\`, \`<head>\`, and \`<body>\` tags.
- Place ALL \`<script>\` tags at the END of \`<body>\`, right before \`</body>\`.

### LIBRARY ECOSYSTEM (CRITICAL):
The following libraries are AUTOMATICALLY INJECTED by the runtime. You MUST NOT include their \`<script>\` or \`<link>\` tags — they are already loaded:
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

You may use Tailwind utilities, DaisyUI components, AND/OR custom CSS in a \`<style>\` block — whichever produces the most stunning result.

You MUST include \`<script>\`/\`<link>\` tags ONLY for these specialized libraries if needed:
- Maps: Leaflet.js (\`<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\\/script>\`)
- 3D/WebGL: Three.js (\`<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\\/script>\`) or PlayCanvas (\`<script src="https://code.playcanvas.com/playcanvas-latest.js"><\\/script>\`)
- 2D Physics: Matter.js (\`<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"><\\/script>\`)

### DESIGN EXCELLENCE (NON-NEGOTIABLE):

**1. Visual Quality Checklist — EVERY page must include ALL of these:**
- A Google Fonts \`<link>\` in \`<head>\` with at least 2 fonts (one for headings, one for body)
- A cohesive color palette with at most 5-6 colors applied consistently
- A clear typographic hierarchy: at least 3 distinct heading sizes with proper contrast to body text
- Consistent spacing based on an 8px scale (p-2, p-4, p-6, p-8, p-12, p-16)
- At least one visually striking section (hero with gradient, bold image, color block, or dramatic typography)
- Proper contrast ratios for all text (light text on dark backgrounds, dark text on light backgrounds)

**2. Layout Diversity — NEVER repeat the same layout pattern:**
- Each major section must use a DIFFERENT layout: full-width hero, then two-column, then card grid, then testimonial strip, then centered CTA, etc.
- Vary visual density: some sections should breathe (sparse whitespace), others should be rich and dense
- Use asymmetric layouts, offset elements, and varied column widths to create visual interest
- Break the grid occasionally: a pull quote, a full-bleed image, an offset card

**3. Content Originality — NO generic filler:**
- NEVER use "Welcome to Our Website", "We provide the best service", "Lorem ipsum" or any generic corporate text
- Generate content that is SPECIFIC to the URL context: a coffee shop should describe single-origin beans and brewing methods; a space agency should detail mission parameters
- Headlines must be creative and contextual, not generic
- Use Faker.js (\`window.faker\`) for realistic names, emails, dates, company names — but write the actual descriptive content yourself

**4. Anti-Patterns — NEVER do any of these:**
- NEVER use default DaisyUI theme colors without customization via Tailwind config or custom CSS
- NEVER generate a page that is just rows of identical cards with no visual variety
- NEVER use more than 3 font families on a single page
- NEVER use the same dark-blue-tech aesthetic for every site — match the design to the content
- NEVER create a page shorter than 3 screen-heights of content (except for tools/games)
- NEVER leave images without proper sizing classes (always include w- and h- or aspect-ratio)

### TOTAL INTERACTIVITY (ZERO DEAD ELEMENTS):
1. **Links**: Every \`<a>\` tag MUST have a meaningful \`href\` (e.g., \`/products/quantum-headphones\`). NEVER use \`href="#"\` for navigation.
2. **Buttons**: Any button leading to another view MUST call \`window.navigateTo('/descriptive-path')\`. NEVER use \`window.location.href\`.
3. **Contextual paths**: A product "Quantum Headphones" links to \`/products/quantum-headphones\`, NOT generic \`/product\`.
4. **Cards**: The entire card surface must be clickable via wrapper \`<a>\` tag or \`onclick="window.navigateTo(...)"\`. Each card links to a unique detail page.
5. **Navigation menus**: ALL sidebar items, footer links, breadcrumbs, tabs, dropdowns use \`<a href>\` or \`window.navigateTo()\` with descriptive URLs.
6. **Forms**: Search forms navigate to \`/search?q={query}\`. Login forms show "logged in" state. Contact forms show confirmation.
7. **Interactive features**: Like, Save, Add to Cart — write actual JS to update DOM, show toasts via Swal, persist to localStorage.
8. **Social elements**: Usernames link to \`/user/{handle}\`. Reply buttons open inline forms or navigate.

### DYNAMIC & ALIVE:
- Use JS intervals/timeouts for real-time feel: updating timestamps, rotating feeds, incrementing counters, fluctuating tickers
- Simulate network latency: show skeleton loaders initially, then use \`setTimeout\` (800-2000ms) to reveal content progressively
- GSAP entrance animations on scroll-visible sections: fade-in-up, slide-in, scale-in
- Hover micro-interactions on every interactive element: scale, shadow, color shift, underline animation

### RESPONSIVE DESIGN:
- Use Tailwind responsive prefixes (\`sm:\`, \`md:\`, \`lg:\`, \`xl:\`) for ALL layout decisions
- Mobile-first: base classes for mobile, then scale up
- Navigation should collapse to a hamburger menu on mobile

### IMAGE GENERATION:
For images, use \`data-ai-prompt\` on \`<img>\` tags. The runtime generates these in real-time.
- Example: \`<img data-ai-prompt="Professional headshot of a smiling woman in business attire, warm studio lighting, neutral background" src="" alt="Profile photo" class="w-full h-48 object-cover rounded-lg" />\`
- ALWAYS write detailed prompts (minimum 15 words): include subject, composition, lighting, mood, and style
- ALWAYS include alt text, sizing classes (w-, h- or aspect-ratio), and object-cover/contain
- For generic imagery, use Pexels stock photos: \`src="https://images.pexels.com/photos/{id}/pexels-photo-{id}.jpeg?auto=compress&cs=tinysrgb&w=600"\`

### GAME ENGINE (PLAYCANVAS) SPECIFICS:
When generating games or 3D worlds:
- Full-screen canvas with id "application-canvas"
- Responsive: \`app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW); app.setCanvasResolution(pc.RESOLUTION_AUTO);\`
- Complex environments with primitives styled via shaders/lighting
- Polished game-feel: camera damping, particles, responsive WASD/Mouse controls

### FOOTER:
Include a subtle footer: "Copyright 202X — Simulated by InfiniteWeb"
`;

export const PRELOADED_SCRIPTS = `
<!-- Preloaded Standard Libraries -->
<link href="https://cdn.jsdelivr.net/npm/daisyui@4.10.2/dist/full.min.css" rel="stylesheet" type="text/css" />
<script src="https://cdn.tailwindcss.com"></script>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
<script src="https://unpkg.com/lucide@latest"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.4/howler.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"></script>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script type="module">import { faker } from 'https://esm.sh/@faker-js/faker'; window.faker = faker;</script>
`;

export const cleanHtml = (html: string) => {
    html = html.replace(/^\s*```html\n?/i, '').replace(/\n?```\s*$/, '').trim();

    if (!html.includes('cdn.tailwindcss.com')) {
        html = PRELOADED_SCRIPTS + '\n' + html;
    }

    if (html.includes('</body>') && !html.includes('INFINITE_WEB_NAVIGATE')) {
      html = html.replace('</body>', `${INJECTED_SCRIPT}</body>`);
    } else if (!html.includes('INFINITE_WEB_NAVIGATE')) {
      html += INJECTED_SCRIPT;
    }
    return html;
};

function truncateState(virtualState: any): string {
  if (!virtualState || Object.keys(virtualState).length === 0) return 'None';
  let stateString = JSON.stringify(virtualState);
  if (stateString.length > 50000) {
    stateString = stateString.substring(0, 50000) + '... [TRUNCATED]';
  }
  return stateString;
}

function buildPrompt(
  url: string,
  stateString: string,
  deviceType: string,
  soundEnabled: boolean,
  isDeepResearch: boolean,
  browserEra: string
): string {
  const styleResult = resolveStyle(url);
  const styleSection = getStylePromptSection(styleResult);

  const creativeDirection = resolveCreativeDirection(url);
  const creativeSection = creativeDirection ? getCreativeDirectionPrompt(creativeDirection) : '';

  let prompt = `[TARGET_URL: "${url}"]
[DEVICE_TYPE: "${deviceType}"]
[SOUND_ENABLED: ${soundEnabled ? 'TRUE' : 'FALSE'}]
[CURRENT_BROWSER_STATE: ${stateString}]
[BROWSER_ERA: "${browserEra}"]
${styleSection}
${creativeSection}

Generate the complete, fully interactive page for the target URL.

CRITICAL REQUIREMENTS:
- Every button, link, card, tab, menu item, and interactive element MUST navigate or perform an action. Zero dead buttons.
- The page MUST look like an award-winning, professionally designed website with the specified design mood.
- Include at least 2 Google Fonts via <link> in <head> that match the style directive typography.
- Use at least 3 different section layouts (never repeat the same card grid).
- Generate rich, contextual content specific to this URL (no generic placeholder text).
- Include GSAP entrance animations and hover micro-interactions.`;

  if (deviceType !== 'desktop') {
    prompt += `\nDEVICE: Optimize layout, typography, and interactions for ${deviceType}. Use Tailwind responsive prefixes. Ensure base classes are perfect for ${deviceType}.`;
  }
  if (deviceType === 'vr') {
    prompt += '\nVR MODE: Use A-Frame (<script src="https://aframe.io/releases/1.4.2/aframe.min.js"><\\/script>) or Three.js for an immersive 3D environment with interactive objects, skybox, and camera controls.';
  }
  if (deviceType === 'ar') {
    prompt += '\nAR MODE: Use A-Frame with AR.js or WebXR. Transparent background. Render 3D objects floating in space.';
  }
  if (soundEnabled) {
    prompt += '\nAUDIO ENABLED: Use Tone.js for procedural background music and Howler.js for UI sound effects. Start audio context on first user interaction.';
  }
  if (browserEra !== 'default') {
    prompt += `\nBROWSER ERA: "${browserEra}". Style the page to look exactly like a website from that era. For 1995: tables, gray bg, blue links, Times New Roman. For 2001: early CSS, bevels. For 2010: gradients, rounded corners. For 2035: neural interfaces, holographic elements. You may override the style directive to match the era if they conflict.`;
  }
  if (stateString !== 'None') {
    prompt += '\nSTATE: Render the page reflecting the provided browser state (logged-in status, cart items, preferences, etc.).';
  }
  if (isDeepResearch) {
    prompt += '\nDEEP RESEARCH MODE: Apply maximum architectural reasoning. Every JS component must be flawless. Optimize for maximum visual fidelity and interactivity.';
  }

  prompt += `\nIMAGE INSTRUCTION: For images, use \`data-ai-prompt="<detailed description of at least 15 words>"\` on \`<img>\` tags. Include subject, composition, lighting, mood, color palette. Also use Pexels stock photos where appropriate.`;

  return prompt;
}

export const generatePageContentStream = async function* (
  url: string,
  model: ModelTier,
  isDeepResearch: boolean = false,
  virtualState?: any,
  deviceType: 'desktop' | 'tablet' | 'mobile' | 'vr' | 'ar' = 'desktop',
  soundEnabled: boolean = false,
  browserEra: string = 'default'
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  const stateString = truncateState(virtualState);
  const prompt = buildPrompt(url, stateString, deviceType, soundEnabled, isDeepResearch, browserEra);

  const isFlash = model === ModelTier.FLASH;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: isDeepResearch ? 0.8 : 0.7,
        thinkingConfig: {
          thinkingBudget: isFlash
            ? (isDeepResearch ? 8192 : 4096)
            : (isDeepResearch ? 12000 : 6000)
        },
      }
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

export const generateImage = async (prompt: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: `Generate a high-quality photograph: ${prompt}. Photorealistic, professional lighting, high resolution.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

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

  const BATCH_SIZE = 4;
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
  browserEra: string = 'default'
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  const stateString = truncateState(virtualState);
  const prompt = buildPrompt(url, stateString, deviceType, soundEnabled, isDeepResearch, browserEra);

  const isFlash = model === ModelTier.FLASH;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: isDeepResearch ? 0.8 : 0.7,
        thinkingConfig: {
          thinkingBudget: isFlash
            ? (isDeepResearch ? 8192 : 4096)
            : (isDeepResearch ? 12000 : 6000)
        },
      }
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
  browserEra: string = 'default'
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  const isFlash = model === ModelTier.FLASH;

  const prompt = `[REQUEST_TYPE: CODE_REFINEMENT]
[INSTRUCTION: "${instruction}"]
[DEVICE_TYPE: "${deviceType}"]
[SOUND_ENABLED: ${soundEnabled ? 'TRUE' : 'FALSE'}]
[BROWSER_ERA: "${browserEra}"]

Modify the existing HTML source to satisfy the user's request.
${deviceType !== 'desktop' ? `Optimize for ${deviceType} viewport.` : ''}
${soundEnabled ? 'Audio is enabled — integrate Tone.js/Howler.js as appropriate.' : ''}
${browserEra !== 'default' ? `Style must match the "${browserEra}" era aesthetic.` : ''}
Keep all injected bridge scripts intact. Maintain the design system.
CRITICAL: Ensure ALL buttons, links, and interactive elements navigate or perform actions. Zero dead elements.
Return the FULL updated HTML source starting with <!DOCTYPE html>.

[CURRENT_SOURCE_START]
${currentHtml}
[CURRENT_SOURCE_END]`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4,
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

export const generateApiResponse = async (
  url: string,
  method: string,
  body: any,
  virtualState: any,
  model: ModelTier
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  const stateString = truncateState(virtualState);

  const prompt = `[REQUEST_TYPE: API_CALL]
[ENDPOINT: "${url}"]
[METHOD: "${method}"]
[REQUEST_BODY: ${body ? (typeof body === 'string' ? body : JSON.stringify(body)) : 'None'}]
[CURRENT_BROWSER_STATE: ${stateString}]

Generate a realistic JSON response for this API endpoint.
You are simulating the backend server for this application.
Return ONLY valid JSON. No markdown formatting, no explanations, no code blocks.`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "You are a mock API server. Return only raw JSON. Generate realistic, contextual data using diverse names, values, and timestamps.",
        temperature: 0.7
      }
    });

    let text = response.text || "{}";
    text = text.replace(/^\s*```json\n?/i, '').replace(/\n?```\s*$/, '').trim();
    return text;
  } catch (error) {
    console.error("API Generation Error:", error);
    return "{}";
  }
};
