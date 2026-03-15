import { GoogleGenAI } from "@google/genai";
import { ModelTier } from "../types";
import { getUserApiKey } from "../supabase";
import { pruneVirtualState } from "../utils/statePruner";

// The "Standard Library" injected into every generated page to handle navigation and bridge the AI to the browser chrome.
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

const SYSTEM_INSTRUCTION = `
You are InfiniteWeb 4.0, the world's most advanced generative web engine. You don't just "generate pages"; you simulate a fully interactive, hyper-realistic internet.

### CORE ARCHITECTURAL PRINCIPLES:
1. **Uncompromising Quality**: Every page must look like a high-end, award-winning website. Use Tailwind CSS for all styling.
2. **Total Interactivity**: EVERY button, link, and feature MUST be fully functional. This is a true full simulation.
   - For page navigation, use \`<a>\` tags with descriptive \`href\` attributes (e.g., \`/profile\`, \`/checkout\`).
   - If you must navigate via JavaScript, call \`window.navigateTo('/your-url')\`. DO NOT use \`window.location.href\`.
   - For interactive features (like "Like", "Save", "Add to Cart", "Submit"), write the actual JavaScript to update the DOM, show toast notifications, and persist state to \`localStorage\`.
   - NEVER generate "dead" buttons. If a button is on the screen, it must perform its intended action or navigate to a relevant page.
3. **Dynamic Content**: Hallucinate realistic real-time updates using JS intervals. Timestamps should update, stock tickers should fluctuate, news feeds should rotate, and social media feeds should simulate incoming posts or notifications.
4. **Variety of Website Types**: Be prepared to generate highly authentic e-commerce platforms (with working carts), social media networks (with interactive feeds), news portals (with breaking news banners), SaaS dashboards, and immersive 3D experiences.
5. **Realistic Network Latency**: Simulate realistic network latency *within* the generated page. Use skeleton loaders, spinners, or progress bars initially, then use \`setTimeout\` (e.g., 800ms - 2000ms) to "fetch" and reveal the actual content, making it feel like a real web application loading data from a server.
6. **Responsive Design**: The user can toggle between Desktop, Tablet, and Mobile views. You MUST ensure your Tailwind classes are fully responsive (e.g., use \`md:\`, \`lg:\` prefixes) so the layout adapts perfectly to any device width.
7. **Library Ecosystem**: 
   The following libraries are PRE-INSTALLED in the environment. DO NOT output their <script> tags. Just use them directly:
   - Tailwind CSS (Global classes)
   - DaisyUI (Tailwind components: \`btn\`, \`card\`, \`modal\`, etc. are ready to use!)
   - Alpine.js (UI/State: \`x-data\`, \`x-show\`, etc.)
   - Lucide Icons (Call \`lucide.createIcons()\` to render)
   - GSAP (Animations: \`gsap.to()\`)
   - Chart.js (Data visualization: \`new Chart()\`)
   - Faker.js (Mock data: \`window.faker\`)
   - SortableJS (Drag & Drop: \`new Sortable()\`)
   - Howler.js (Audio/SFX: \`new Howl()\`)
   - Tone.js (Procedural Music/Synths: \`new Tone.Synth()\`)
   - Marked.js (Markdown: \`marked.parse()\`)
   - Canvas Confetti (Delight: \`confetti()\`)
   - SweetAlert2 (Dialogs: \`Swal.fire()\`. Note: native \`alert\`/\`confirm\` are overridden to use Swal)
   
   For the following specialized libraries, you MUST include their <script> tags if you need them:
   - Maps: Leaflet.js (<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>)
   - 3D/WebGL: Three.js (<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>) or PlayCanvas (<script src="https://code.playcanvas.com/playcanvas-latest.js"></script>)
   - 2D Physics: Matter.js (<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>)

### GAME ENGINE (PLAYCANVAS) SPECIFICS:
When a URL or prompt implies a game or 3D world:
- Initialize a full-screen canvas with id "application-canvas".
- Implement responsive resizing: app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW); app.setCanvasResolution(pc.RESOLUTION_AUTO);
- Create complex environments using primitive archetypes (cubes, spheres, planes) but styled with advanced shaders and light mapping.
- Implement polished "game-feel": smooth camera damping, particle effects for actions, and responsive WASD/Mouse controls.

### BEHAVIORAL DIRECTIVES:
- Act as a high-level full-stack engineer and a world-class creative director.
- Use sophisticated typography (Inter, JetBrains Mono, or Playfair Display via Google Fonts).
- Implement "Micro-interactions": hover scales, subtle box-shadow transitions, and smooth entrance animations using GSAP.
- Always include a "Debug Footer" or small AI-generated "Copyright 202X - Simulated by InfiniteWeb" note.

### OUTPUT FORMAT:
- Return ONLY the raw HTML5 code starting with <!DOCTYPE html>.
- NO markdown wrappers. NO explanations. NO code blocks. JUST CODE.
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

export const generatePageContentStream = async function* (
  url: string,
  model: ModelTier,
  isDeepResearch: boolean = false,
  virtualState?: any,
  deviceType: 'desktop' | 'tablet' | 'mobile' | 'vr' | 'ar' = 'desktop',
  soundEnabled: boolean = false,
  userId?: string
): AsyncGenerator<string, void, unknown> {
  let apiKey = process.env.API_KEY;

  if (userId) {
    const userKey = await getUserApiKey(userId);
    if (userKey) apiKey = userKey;
  }

  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });
  
  const pruned = virtualState ? pruneVirtualState(virtualState) : null;
  const stateString = pruned && Object.keys(pruned).length > 0
    ? JSON.stringify(pruned)
    : 'None';

  const prompt = `
    [REQUEST_TYPE: SERVER_GET_STREAM]
    [TARGET_URL: "${url}"]
    [BROWSER_USER_AGENT: "InfiniteWeb/4.0 (LatentSpace; Interactive)"]
    [DEVICE_TYPE: "${deviceType}"]
    [SOUND_ENABLED: ${soundEnabled ? 'TRUE' : 'FALSE'}]
    [DEEP_RESEARCH_MODE: ${isDeepResearch ? 'ENABLED' : 'DISABLED'}]
    [CURRENT_BROWSER_STATE: ${stateString}]
    
    TASK: Execute the generation of the page at the target URL. 
    CRITICAL DEVICE INSTRUCTION: The user is viewing this on a ${deviceType} screen. You MUST optimize the layout, typography, and interactive elements specifically for ${deviceType}. Use Tailwind's responsive prefixes (sm:, md:, lg:) appropriately, but ensure the default/base classes look perfect for ${deviceType}.
    ${deviceType === 'vr' ? "CRITICAL VR INSTRUCTION: This is a Virtual Reality experience. You MUST use A-Frame (<script src=\"https://aframe.io/releases/1.4.2/aframe.min.js\"></script>) or Three.js to render a fully immersive 3D environment. Include interactive 3D objects, a skybox, and camera controls." : ""}
    ${deviceType === 'ar' ? "CRITICAL AR INSTRUCTION: This is an Augmented Reality experience. You MUST use A-Frame with AR.js or WebXR to render an AR scene. The background of the iframe is transparent, so do NOT render a skybox or solid background color. Render 3D objects floating in space." : ""}
    ${soundEnabled ? "CRITICAL AUDIO INSTRUCTION: Sound is ENABLED. You MUST integrate rich audio features. Use Tone.js for procedural background music or synthesizers, and Howler.js for UI sound effects. Create an immersive soundscape that reacts to user interactions. Make sure audio context is started on first user interaction." : ""}
    CRITICAL STATE INSTRUCTION: If CURRENT_BROWSER_STATE is provided and contains data (e.g., localStorage, sessionStorage, cookies), you MUST render the page to reflect this state.
    CRITICAL IMAGE INSTRUCTION: To include images, you MUST use the attribute \`data-ai-prompt="<detailed image description>"\` on \`<img>\` tags instead of a real src. The system will generate these images in real-time. Example: \`<img data-ai-prompt="A futuristic cyberpunk neon sign" src="" alt="Neon sign" />\`
    ${isDeepResearch ? "CRITICAL: Perform deep architectural reasoning. Ensure every single JS component is flawless and robust. Optimize for maximum visual fidelity." : ""}
    If this is a known brand site, simulate its high-fidelity alternative universe version.
    If it is a tool or game, make it fully production-ready.
  `;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: isDeepResearch ? 0.9 : 0.7,
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

export const generateImage = async (prompt: string, userId?: string): Promise<string> => {
  let apiKey = process.env.API_KEY;

  if (userId) {
    const userKey = await getUserApiKey(userId);
    if (userKey) apiKey = userKey;
  }

  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
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

      img.setAttribute('src', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2ZmZiIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+R2VuZXJhdGluZyBJbWFnZS4uLjwvdGV4dD48L3N2Zz4=');

      try {
        const base64Image = await generateImage(prompt);
        if (base64Image) {
          img.setAttribute('src', base64Image);
          img.removeAttribute('data-ai-prompt');
        }
      } catch (e) {
        console.error('Failed to generate image for prompt:', prompt, e);
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
  let apiKey = process.env.API_KEY;

  if (userId) {
    const userKey = await getUserApiKey(userId);
    if (userKey) apiKey = userKey;
  }

  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });
  
  const pruned = virtualState ? pruneVirtualState(virtualState) : null;
  const stateString = pruned && Object.keys(pruned).length > 0
    ? JSON.stringify(pruned)
    : 'None';

  // Enhance the prompt with "environmental" cues to help the AI contextualize its "server" role
  const prompt = `
    [REQUEST_TYPE: SERVER_GET]
    [TARGET_URL: "${url}"]
    [BROWSER_USER_AGENT: "InfiniteWeb/4.0 (LatentSpace; Interactive)"]
    [DEVICE_TYPE: "${deviceType}"]
    [SOUND_ENABLED: ${soundEnabled ? 'TRUE' : 'FALSE'}]
    [DEEP_RESEARCH_MODE: ${isDeepResearch ? 'ENABLED' : 'DISABLED'}]
    [CURRENT_BROWSER_STATE: ${stateString}]
    
    TASK: Execute the generation of the page at the target URL. 
    CRITICAL DEVICE INSTRUCTION: The user is viewing this on a ${deviceType} screen. You MUST optimize the layout, typography, and interactive elements specifically for ${deviceType}. Use Tailwind's responsive prefixes (sm:, md:, lg:) appropriately, but ensure the default/base classes look perfect for ${deviceType}.
    ${deviceType === 'vr' ? "CRITICAL VR INSTRUCTION: This is a Virtual Reality experience. You MUST use A-Frame (<script src=\"https://aframe.io/releases/1.4.2/aframe.min.js\"></script>) or Three.js to render a fully immersive 3D environment. Include interactive 3D objects, a skybox, and camera controls." : ""}
    ${deviceType === 'ar' ? "CRITICAL AR INSTRUCTION: This is an Augmented Reality experience. You MUST use A-Frame with AR.js or WebXR to render an AR scene. The background of the iframe is transparent, so do NOT render a skybox or solid background color. Render 3D objects floating in space." : ""}
    ${soundEnabled ? "CRITICAL AUDIO INSTRUCTION: Sound is ENABLED. You MUST integrate rich audio features. Use Tone.js for procedural background music or synthesizers, and Howler.js for UI sound effects. Create an immersive soundscape that reacts to user interactions. Make sure audio context is started on first user interaction." : ""}
    CRITICAL STATE INSTRUCTION: If CURRENT_BROWSER_STATE is provided and contains data (e.g., localStorage, sessionStorage, cookies), you MUST render the page to reflect this state. For example, if the state indicates the user is logged in, render the authenticated dashboard/profile. If the state contains shopping cart items, render the cart with those items.
    ${isDeepResearch ? "CRITICAL: Perform deep architectural reasoning. Ensure every single JS component is flawless and robust. Optimize for maximum visual fidelity." : ""}
    If this is a known brand site, simulate its high-fidelity alternative universe version.
    If it is a tool or game, make it fully production-ready.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: isDeepResearch ? 0.9 : 0.7,
        ...(model === ModelTier.PRO ? { thinkingConfig: { thinkingBudget: isDeepResearch ? 12000 : 6000 } } : {})
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
  userId?: string
): Promise<string> => {
  let apiKey = process.env.API_KEY;

  if (userId) {
    const userKey = await getUserApiKey(userId);
    if (userKey) apiKey = userKey;
  }

  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    [REQUEST_TYPE: CODE_REFINEMENT]
    [INSTRUCTION: "${instruction}"]
    [DEVICE_TYPE: "${deviceType}"]
    [SOUND_ENABLED: ${soundEnabled ? 'TRUE' : 'FALSE'}]

    TASK: Modify the existing HTML source to satisfy the user's request. 
    CRITICAL DEVICE INSTRUCTION: The user is viewing this on a ${deviceType} screen. You MUST optimize the layout, typography, and interactive elements specifically for ${deviceType}. Use Tailwind's responsive prefixes (sm:, md:, lg:) appropriately, but ensure the default/base classes look perfect for ${deviceType}.
    ${deviceType === 'vr' ? "CRITICAL VR INSTRUCTION: This is a Virtual Reality experience. You MUST use A-Frame (<script src=\"https://aframe.io/releases/1.4.2/aframe.min.js\"></script>) or Three.js to render a fully immersive 3D environment. Include interactive 3D objects, a skybox, and camera controls." : ""}
    ${deviceType === 'ar' ? "CRITICAL AR INSTRUCTION: This is an Augmented Reality experience. You MUST use A-Frame with AR.js or WebXR to render an AR scene. The background of the iframe is transparent, so do NOT render a skybox or solid background color. Render 3D objects floating in space." : ""}
    ${soundEnabled ? "CRITICAL AUDIO INSTRUCTION: Sound is ENABLED. You MUST integrate rich audio features. Use Tone.js for procedural background music or synthesizers, and Howler.js for UI sound effects. Create an immersive soundscape that reacts to user interactions. Make sure audio context is started on first user interaction." : ""}
    Keep all injected bridge scripts intact. 
    Maintain the design system.
    Return the FULL updated HTML source.

    [CURRENT_SOURCE_START]
    ${currentHtml}
    [CURRENT_SOURCE_END]
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4,
        ...(model === ModelTier.PRO ? { thinkingConfig: { thinkingBudget: 4000 } } : {})
      }
    });

    return cleanHtml(response.text || currentHtml);
  } catch (error) {
    console.error("Refinement Error", error);
    throw error;
  }
};