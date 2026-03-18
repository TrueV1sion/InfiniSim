import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { ModelTier } from "../types";

// The "Standard Library" injected into every generated page to handle navigation and bridge the AI to the browser chrome.
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

    // Override native dialogs with SweetAlert2 if available
    if (window.Swal) {
      window.alert = function(message) {
        Swal.fire({ text: message, confirmButtonColor: '#3b82f6' });
      };
      window.confirm = function(message) {
        // Note: Native confirm is synchronous, Swal is async. 
        // We can't perfectly polyfill synchronous confirm, but we can try to warn or just return true for AI scripts that don't await.
        // For best results, AI should use Swal directly, but this catches basic usages.
        console.warn('window.confirm is deprecated in InfiniteWeb. Use Swal.fire() instead.');
        return true; 
      };
      window.prompt = function(message, defaultText) {
        console.warn('window.prompt is deprecated in InfiniteWeb. Use Swal.fire() instead.');
        return defaultText || null;
      };
    }

    // Provide a global navigation function for the AI to use
    window.navigateTo = function(url) {
      window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: url, state: getBrowserState() }, '*');
    };

    // Intercept History API for SPA routing
    const originalPushState = history.pushState;
    history.pushState = function(state, unused, url) {
      if (url) {
        window.parent.postMessage({ type: 'INFINITE_WEB_URL_UPDATE', url: url.toString(), state: getBrowserState() }, '*');
      }
      return originalPushState.apply(this, arguments);
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function(state, unused, url) {
      if (url) {
        window.parent.postMessage({ type: 'INFINITE_WEB_URL_UPDATE', url: url.toString(), state: getBrowserState() }, '*');
      }
      return originalReplaceState.apply(this, arguments);
    };

    // Intercept navigation
    document.addEventListener('click', function(e) {
      if (e.defaultPrevented) return;
      const link = e.target.closest('a');
      if (link) {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          e.preventDefault();
          window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: href, state: getBrowserState() }, '*');
        }
      }
    });

    // Form submission interceptor
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

    // Console bridge for DevTools
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

    // API Simulation Bridge
    const originalFetch = window.fetch;
    window.fetch = async function(resource, init) {
      const url = typeof resource === 'string' ? resource : resource.url;
      // Intercept API calls to simulate a backend
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

    // InfiniteAPI Bridge
    window.infiniteWeb = {
      _callbacks: {},
      _id: 0,
      _send: function(url, body) {
        return new Promise((resolve, reject) => {
          const id = "iw_" + (++this._id) + "_" + Math.random().toString(36).substring(7);
          this._callbacks[id] = { resolve, reject };
          
          const handler = (event) => {
            if (event.data.type === 'INFINITE_WEB_API_RESPONSE' && event.data.requestId === id) {
              window.removeEventListener('message', handler);
              const cb = this._callbacks[id];
              if (cb) {
                if (event.data.status >= 400 || (event.data.body && event.data.body.error)) {
                  cb.reject(new Error(event.data.body?.error || "API Error"));
                } else {
                  cb.resolve(event.data.body);
                }
                delete this._callbacks[id];
              }
            }
          };
          window.addEventListener('message', handler);

          window.parent.postMessage({
            type: 'INFINITE_WEB_API_CALL',
            requestId: id,
            url: url,
            method: 'POST',
            body: body,
            state: getBrowserState()
          }, '*');
        });
      },
      fetchExternalData: function(url, options = {}) {
        return this._send('infinite://api/proxy', { url, options });
      },
      showNotification: function(title, message) {
        return this._send('infinite://api/notify', { title, message });
      },
      storeData: function(key, value) {
        return this._send('infinite://api/store/set', { key, value });
      },
      getData: function(key) {
        return this._send('infinite://api/store/get', { key }).then(res => res.value);
      }
    };

    // Listen for scroll commands from Copilot
    window.addEventListener('message', function(event) {
      if (event.data.type === 'INFINITE_WEB_SCROLL') {
        const direction = event.data.direction;
        const amount = window.innerHeight * 0.8;
        window.scrollBy({
          top: direction === 'up' ? -amount : amount,
          behavior: 'smooth'
        });
      }
    });

    // Intercept WebXR session requests
    if (navigator.xr) {
      const originalRequestSession = navigator.xr.requestSession.bind(navigator.xr);
      navigator.xr.requestSession = async function(mode, options) {
        window.parent.postMessage({
          type: 'INFINITE_WEB_XR_SESSION',
          sessionType: mode
        }, '*');
        
        try {
          const session = await originalRequestSession(mode, options);
          
          // Intercept requestAnimationFrame to send tracking data
          const originalRequestAnimationFrame = session.requestAnimationFrame.bind(session);
          session.requestAnimationFrame = function(callback) {
            return originalRequestAnimationFrame((time, frame) => {
              // We could extract pose data here and send it, but for now just notify
              // window.parent.postMessage({ type: 'INFINITE_WEB_XR_TRACKING', time }, '*');
              callback(time, frame);
            });
          };
          
          return session;
        } catch (e) {
          console.error("XR Session failed:", e);
          throw e;
        }
      };
    }
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

### INFINITE API (HOST CAPABILITIES):
You have access to a special \`window.infiniteWeb\` object that allows you to interact with the host environment.
Use these methods to build powerful, connected applications:

1. **Proxy External Requests (Bypass CORS)**
   \`\`\`javascript
   // Use this instead of fetch() for external APIs to bypass CORS
   const data = await window.infiniteWeb.fetchExternalData('https://api.example.com/data', {
     method: 'GET',
     headers: { 'Authorization': 'Bearer token' }
   });
   \`\`\`

2. **Persistent Storage (Cross-Session)**
   \`\`\`javascript
   // Store data globally (persists across app reloads)
   await window.infiniteWeb.storeData('myApp_settings', { theme: 'dark' });
   
   // Retrieve data
   const settings = await window.infiniteWeb.getData('myApp_settings');
   \`\`\`

3. **System Notifications**
   \`\`\`javascript
   // Show a native browser notification
   await window.infiniteWeb.showNotification('Task Complete', 'Your export is ready.');
   \`\`\`

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
  browserEra: string = 'default'
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });
  
  let stateString = virtualState && Object.keys(virtualState).length > 0 
    ? JSON.stringify(virtualState) 
    : 'None';
  if (stateString.length > 50000) {
    stateString = stateString.substring(0, 50000) + '... [TRUNCATED DUE TO SIZE]';
  }

  const baseContext = `
    [TARGET_URL: "${url}"]
    [DEVICE_TYPE: "${deviceType}"]
    [SOUND_ENABLED: ${soundEnabled ? 'TRUE' : 'FALSE'}]
    [CURRENT_BROWSER_STATE: ${stateString}]
    [BROWSER_ERA: "${browserEra}"]
  `;

  if (isDeepResearch) {
    // ============================================================================
    // MULTI-AGENT WORKFLOW (Phase 1: Designer -> Phase 2: Engineer)
    // ============================================================================
    
    // --- PHASE 1: DESIGNER AGENT ---
    const designerSystemInstruction = `
You are the Visionary Designer Agent for InfiniteWeb 4.0.
Your ONLY job is to create breathtaking, hyper-realistic, award-winning HTML/Tailwind mockups.
Focus 100% of your attention on aesthetics, layout, typography, GSAP animations, and responsive design.
DO NOT write complex data fetching, state management, or InfiniteAPI logic.
Use mock data to make the design look complete and beautiful.
CRITICAL: You MUST add clear \`id\` attributes to all buttons, forms, and dynamic content areas so the Engineering Agent can wire them up later.
Output ONLY raw HTML starting with <!DOCTYPE html>. No markdown formatting.
    `;

    const designerPrompt = `
      ${baseContext}
      TASK: Generate the UI shell for the target URL. Make it visually stunning.
      Remember: Focus only on UI/UX. The Engineer will add the logic later.
    `;

    let fullHtml = "";
    try {
      const designerStream = await ai.models.generateContentStream({
        model: model,
        contents: designerPrompt,
        config: {
          systemInstruction: designerSystemInstruction,
          temperature: 0.8,
          ...(model === ModelTier.PRO ? { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } } : {})
        }
      });

      for await (const chunk of designerStream) {
        if (chunk.text) {
          fullHtml += chunk.text;
          yield chunk.text;
        }
      }
    } catch (error) {
      console.error("Designer Agent Error:", error);
      throw error;
    }

    // --- TRANSITION ---
    yield `\n<!-- WIRING LOGIC... -->\n<div id="infinite-agent-toast" style="position:fixed;bottom:24px;right:24px;background:rgba(15,23,42,0.9);color:#38bdf8;padding:12px 24px;border-radius:12px;z-index:99999;font-family:monospace;font-size:14px;box-shadow:0 10px 25px rgba(0,0,0,0.5);border:1px solid rgba(56,189,248,0.3);backdrop-filter:blur(8px);display:flex;align-items:center;gap:12px;"><svg class="animate-spin h-5 w-5 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Systems Engineer: Wiring up logic...</div>\n`;

    // --- PHASE 2: ENGINEER AGENT ---
    const engineerSystemInstruction = `
You are the Systems Engineer Agent for InfiniteWeb 4.0.
The Designer Agent has created a beautiful HTML UI. Your job is to make it functional.
You have access to the InfiniteWeb API:
- window.infiniteWeb.fetchExternalData(url, options) // Bypasses CORS
- window.infiniteWeb.storeData(key, value)
- window.infiniteWeb.getData(key)
- window.infiniteWeb.showNotification(title, message)

Write a SINGLE <script> block that:
1. Selects elements from the Designer's HTML using document.getElementById or querySelector.
2. Adds event listeners for interactivity.
3. Fetches real data using window.infiniteWeb.fetchExternalData if applicable (e.g., for news, weather, crypto).
4. Updates the DOM with the real data or handles state changes.
Output ONLY the <script>...</script> block. Do not output any other HTML. No markdown formatting.
    `;

    const engineerPrompt = `
      ${baseContext}
      DESIGNER HTML:
      \`\`\`html
      ${fullHtml}
      \`\`\`
      
      TASK: Write the <script> block to make the above HTML functional. Use the InfiniteAPI to fetch real data if this URL implies it (e.g., hacker news, weather, crypto).
    `;

    try {
      const engineerStream = await ai.models.generateContentStream({
        model: model,
        contents: engineerPrompt,
        config: {
          systemInstruction: engineerSystemInstruction,
          temperature: 0.4,
          ...(model === ModelTier.PRO ? { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } } : {})
        }
      });

      for await (const chunk of engineerStream) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    } catch (error) {
      console.error("Engineer Agent Error:", error);
      // Don't throw here, at least the user gets the UI
      yield `\n<script>console.error("Engineer Agent failed to wire logic.");</script>\n`;
    }

    // Remove the toast
    yield `\n<script>setTimeout(() => document.getElementById('infinite-agent-toast')?.remove(), 1000);</script>\n`;

  } else {
    // ============================================================================
    // STANDARD WORKFLOW (Single Agent)
    // ============================================================================
    const prompt = `
      [REQUEST_TYPE: SERVER_GET_STREAM]
      ${baseContext}
      
      TASK: Execute the generation of the page at the target URL. 
      CRITICAL DEVICE INSTRUCTION: The user is viewing this on a ${deviceType} screen. You MUST optimize the layout, typography, and interactive elements specifically for ${deviceType}. Use Tailwind's responsive prefixes (sm:, md:, lg:) appropriately, but ensure the default/base classes look perfect for ${deviceType}.
      ${deviceType === 'vr' ? "CRITICAL VR INSTRUCTION: This is a Virtual Reality experience. You MUST use A-Frame (<script src=\"https://aframe.io/releases/1.4.2/aframe.min.js\"></script>) or Three.js to render a fully immersive 3D environment. Include interactive 3D objects, a skybox, and camera controls." : ""}
      ${deviceType === 'ar' ? "CRITICAL AR INSTRUCTION: This is an Augmented Reality experience. You MUST use A-Frame with AR.js or WebXR to render an AR scene. The background of the iframe is transparent, so do NOT render a skybox or solid background color. Render 3D objects floating in space." : ""}
      ${soundEnabled ? "CRITICAL AUDIO INSTRUCTION: Sound is ENABLED. You MUST integrate rich audio features. Use Tone.js for procedural background music or synthesizers, and Howler.js for UI sound effects. Create an immersive soundscape that reacts to user interactions. Make sure audio context is started on first user interaction." : ""}
      CRITICAL ERA INSTRUCTION: The user has selected the browser era "${browserEra}". You MUST style the page to look exactly like a website from that era. For example, if 1995, use tables for layout, default gray backgrounds, blue links, and Times New Roman. If 2001, use early CSS, bevels, and smaller fonts. If 2010, use gradients, rounded corners, and early responsive design. If 2035, use neural interfaces, holographic elements, and highly advanced spatial computing concepts. Do NOT use modern Tailwind classes if they conflict with the era's aesthetic, but you may use Tailwind to achieve the era's look.
      CRITICAL STATE INSTRUCTION: If CURRENT_BROWSER_STATE is provided and contains data (e.g., localStorage, sessionStorage, cookies), you MUST render the page to reflect this state.
      CRITICAL IMAGE INSTRUCTION: To include images, you MUST use the attribute \`data-ai-prompt="<detailed image description>"\` on \`<img>\` tags instead of a real src. The system will generate these images in real-time. Example: \`<img data-ai-prompt="A futuristic cyberpunk neon sign" src="" alt="Neon sign" />\`
      If this is a known brand site, simulate its high-fidelity alternative universe version.
      If it is a tool or game, make it fully production-ready.
    `;

    try {
      const responseStream = await ai.models.generateContentStream({
        model: model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
          ...(model === ModelTier.PRO ? { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } } : {}),
          ...(model === ModelTier.FLASH ? { tools: [{ googleSearch: {} }] } : {})
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
  }
};

export const generateImage = async (prompt: string, aspectRatio: string = "1:1"): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: prompt,
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: "1K"
        }
      }
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

export const generateVideo = async (prompt: string, aspectRatio: string = "16:9"): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio as any
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) return '';

    // Fetch the video and convert to blob URL for the iframe
    const response = await fetch(downloadLink, {
      method: 'GET',
      headers: {
        'x-goog-api-key': apiKey,
      },
    });
    
    if (!response.ok) return '';
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Video Generation Error:", error);
    return '';
  }
};

export const processAiImages = async (html: string): Promise<string> => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const images = Array.from(doc.querySelectorAll('img[data-ai-prompt]'));
  const videos = Array.from(doc.querySelectorAll('video[data-ai-prompt]'));

  if (images.length === 0 && videos.length === 0) return html;

  const imagePromises = images.map(async (img) => {
    const prompt = img.getAttribute('data-ai-prompt');
    const aspectRatio = img.getAttribute('data-ai-aspect-ratio') || "1:1";
    if (!prompt) return;
    
    // Set a loading state or placeholder
    img.setAttribute('src', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2ZmZiIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+R2VuZXJhdGluZyBJbWFnZS4uLjwvdGV4dD48L3N2Zz4=');
    
    try {
      const base64Image = await generateImage(prompt, aspectRatio);
      if (base64Image) {
        img.setAttribute('src', base64Image);
        img.removeAttribute('data-ai-prompt');
        img.removeAttribute('data-ai-aspect-ratio');
      }
    } catch (e) {
      console.error("Failed to generate image for prompt:", prompt, e);
    }
  });

  const videoPromises = videos.map(async (vid) => {
    const prompt = vid.getAttribute('data-ai-prompt');
    const aspectRatio = vid.getAttribute('data-ai-aspect-ratio') || "16:9";
    if (!prompt) return;
    
    try {
      const videoUrl = await generateVideo(prompt, aspectRatio);
      if (videoUrl) {
        vid.setAttribute('src', videoUrl);
        vid.setAttribute('autoplay', 'true');
        vid.setAttribute('loop', 'true');
        vid.setAttribute('muted', 'true');
        vid.removeAttribute('data-ai-prompt');
        vid.removeAttribute('data-ai-aspect-ratio');
      }
    } catch (e) {
      console.error("Failed to generate video for prompt:", prompt, e);
    }
  });

  await Promise.all([...imagePromises, ...videoPromises]);
  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] || '<!DOCTYPE html>';
  return `${doctype}\n${doc.documentElement.outerHTML}`;
};

export const generateWebContainerApp = async (
  url: string,
  model: ModelTier,
  deviceType: 'desktop' | 'tablet' | 'mobile' | 'vr' | 'ar' = 'desktop'
): Promise<Record<string, any>> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    [REQUEST_TYPE: WEBCONTAINER_APP_GENERATION]
    [URL: "${url}"]
    [DEVICE_TYPE: "${deviceType}"]

    TASK: Generate a complete, working Node.js/Express or Vite/React application based on the URL prompt.
    The URL acts as a natural language prompt (e.g., "wc://react-todo-app" or "wc://express-api").
    
    You MUST return ONLY a valid JSON object representing the file tree.
    Do NOT wrap the JSON in markdown blocks like \`\`\`json.
    
    The JSON structure must match the WebContainer FileSystemTree format:
    {
      "package.json": {
        "file": {
          "contents": "{\\"name\\": \\"app\\", \\"scripts\\": {\\"dev\\": \\"vite\\"}}"
        }
      },
      "src": {
        "directory": {
          "main.tsx": {
            "file": {
              "contents": "console.log('hello')"
            }
          }
        }
      }
    }
    
    Ensure you include all necessary files (package.json, index.html, source files).
    For React apps, use Vite. Include vite.config.js if needed.
    The dev script in package.json MUST be named "dev" (e.g., "dev": "vite" or "dev": "node server.js").
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      temperature: 0.7,
      responseMimeType: "application/json",
    }
  });

  const text = response.text || "{}";
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse WebContainer JSON:", text);
    throw new Error("Failed to generate valid WebContainer file tree.");
  }
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
  
  let stateString = virtualState && Object.keys(virtualState).length > 0 
    ? JSON.stringify(virtualState) 
    : 'None';
  if (stateString.length > 50000) {
    stateString = stateString.substring(0, 50000) + '... [TRUNCATED DUE TO SIZE]';
  }

  const prompt = `
    [REQUEST_TYPE: SERVER_GET]
    [TARGET_URL: "${url}"]
    [BROWSER_USER_AGENT: "InfiniteWeb/4.0 (LatentSpace; Interactive)"]
    [DEVICE_TYPE: "${deviceType}"]
    [SOUND_ENABLED: ${soundEnabled ? 'TRUE' : 'FALSE'}]
    [DEEP_RESEARCH_MODE: ${isDeepResearch ? 'ENABLED' : 'DISABLED'}]
    [CURRENT_BROWSER_STATE: ${stateString}]
    [BROWSER_ERA: "${browserEra}"]
    
    TASK: Execute the generation of the page at the target URL. 
    CRITICAL DEVICE INSTRUCTION: The user is viewing this on a ${deviceType} screen. You MUST optimize the layout, typography, and interactive elements specifically for ${deviceType}. Use Tailwind's responsive prefixes (sm:, md:, lg:) appropriately, but ensure the default/base classes look perfect for ${deviceType}.
    ${deviceType === 'vr' ? "CRITICAL VR INSTRUCTION: This is a Virtual Reality experience. You MUST use A-Frame (<script src=\"https://aframe.io/releases/1.4.2/aframe.min.js\"></script>) or Three.js to render a fully immersive 3D environment. Include interactive 3D objects, a skybox, and camera controls." : ""}
    ${deviceType === 'ar' ? "CRITICAL AR INSTRUCTION: This is an Augmented Reality experience. You MUST use A-Frame with AR.js or WebXR to render an AR scene. The background of the iframe is transparent, so do NOT render a skybox or solid background color. Render 3D objects floating in space." : ""}
    ${soundEnabled ? "CRITICAL AUDIO INSTRUCTION: Sound is ENABLED. You MUST integrate rich audio features. Use Tone.js for procedural background music or synthesizers, and Howler.js for UI sound effects. Create an immersive soundscape that reacts to user interactions. Make sure audio context is started on first user interaction." : ""}
    CRITICAL ERA INSTRUCTION: The user has selected the browser era "${browserEra}". You MUST style the page to look exactly like a website from that era. For example, if 1995, use tables for layout, default gray backgrounds, blue links, and Times New Roman. If 2001, use early CSS, bevels, and smaller fonts. If 2010, use gradients, rounded corners, and early responsive design. If 2035, use neural interfaces, holographic elements, and highly advanced spatial computing concepts. Do NOT use modern Tailwind classes if they conflict with the era's aesthetic, but you may use Tailwind to achieve the era's look.
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
        ...(model === ModelTier.PRO ? { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } } : {}),
        ...(model === ModelTier.FLASH ? { tools: [{ googleSearch: {} }] } : {})
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

  const prompt = `
    [REQUEST_TYPE: CODE_REFINEMENT]
    [INSTRUCTION: "${instruction}"]
    [DEVICE_TYPE: "${deviceType}"]
    [SOUND_ENABLED: ${soundEnabled ? 'TRUE' : 'FALSE'}]
    [BROWSER_ERA: "${browserEra}"]

    TASK: Modify the existing HTML source to satisfy the user's request. 
    CRITICAL DEVICE INSTRUCTION: The user is viewing this on a ${deviceType} screen. You MUST optimize the layout, typography, and interactive elements specifically for ${deviceType}. Use Tailwind's responsive prefixes (sm:, md:, lg:) appropriately, but ensure the default/base classes look perfect for ${deviceType}.
    ${deviceType === 'vr' ? "CRITICAL VR INSTRUCTION: This is a Virtual Reality experience. You MUST use A-Frame (<script src=\"https://aframe.io/releases/1.4.2/aframe.min.js\"></script>) or Three.js to render a fully immersive 3D environment. Include interactive 3D objects, a skybox, and camera controls." : ""}
    ${deviceType === 'ar' ? "CRITICAL AR INSTRUCTION: This is an Augmented Reality experience. You MUST use A-Frame with AR.js or WebXR to render an AR scene. The background of the iframe is transparent, so do NOT render a skybox or solid background color. Render 3D objects floating in space." : ""}
    ${soundEnabled ? "CRITICAL AUDIO INSTRUCTION: Sound is ENABLED. You MUST integrate rich audio features. Use Tone.js for procedural background music or synthesizers, and Howler.js for UI sound effects. Create an immersive soundscape that reacts to user interactions. Make sure audio context is started on first user interaction." : ""}
    CRITICAL ERA INSTRUCTION: The user has selected the browser era "${browserEra}". You MUST style the page to look exactly like a website from that era. For example, if 1995, use tables for layout, default gray backgrounds, blue links, and Times New Roman. If 2001, use early CSS, bevels, and smaller fonts. If 2010, use gradients, rounded corners, and early responsive design. If 2035, use neural interfaces, holographic elements, and highly advanced spatial computing concepts. Do NOT use modern Tailwind classes if they conflict with the era's aesthetic, but you may use Tailwind to achieve the era's look.
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
  
  let stateString = virtualState && Object.keys(virtualState).length > 0 
    ? JSON.stringify(virtualState) 
    : 'None';
  if (stateString.length > 50000) {
    stateString = stateString.substring(0, 50000) + '... [TRUNCATED DUE TO SIZE]';
  }

  const prompt = `
    [REQUEST_TYPE: API_CALL]
    [ENDPOINT: "${url}"]
    [METHOD: "${method}"]
    [REQUEST_BODY: ${body ? (typeof body === 'string' ? body : JSON.stringify(body)) : 'None'}]
    [CURRENT_BROWSER_STATE: ${stateString}]
    
    TASK: Generate a realistic JSON response for this API endpoint.
    You are simulating the backend server for this application.
    Return ONLY valid JSON. No markdown formatting, no explanations, no code blocks.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "You are a mock API server. Return only raw JSON.",
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

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          inlineData: {
            data: base64Audio,
            mimeType: mimeType
          }
        },
        "Transcribe this audio exactly as spoken. Return only the transcription."
      ]
    });
    return response.text || '';
  } catch (error) {
    console.error("Audio Transcription Error:", error);
    return '';
  }
};