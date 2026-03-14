import { GoogleGenAI } from "@google/genai";
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

    // Provide a global navigation function for the AI to use
    window.navigateTo = function(url) {
      window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: url, state: getBrowserState() }, '*');
    };

    // Intercept History API for SPA routing
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

    // Intercept navigation
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
6. **Library Ecosystem**: 
   - UI/State: Use Alpine.js for lightweight, declarative interactivity like modals, tabs, and dropdowns (<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>).
   - Icons: Use Lucide Icons (<script src="https://unpkg.com/lucide@latest"></script> followed by lucide.createIcons()).
   - Animations: Use GSAP for cinematic transitions (<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>).
   - Charts: Use Chart.js for data visualization (<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>).
   - Maps: Use Leaflet.js for interactive maps (<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>).
   - 3D/WebGL: Use Three.js for creative 3D experiences (<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>) or PlayCanvas for full game engines (<script src="https://code.playcanvas.com/playcanvas-latest.js"></script>).
   - 2D Physics: Use Matter.js for 2D physics simulations and games (<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>).

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

export const cleanHtml = (html: string) => {
    html = html.replace(/^\s*```html\n?/i, '').replace(/\n?```\s*$/, '').trim();
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
  virtualState?: any
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });
  
  const stateString = virtualState && Object.keys(virtualState).length > 0 
    ? JSON.stringify(virtualState) 
    : 'None';

  const prompt = `
    [REQUEST_TYPE: SERVER_GET_STREAM]
    [TARGET_URL: "${url}"]
    [BROWSER_USER_AGENT: "InfiniteWeb/4.0 (LatentSpace; Interactive)"]
    [DEEP_RESEARCH_MODE: ${isDeepResearch ? 'ENABLED' : 'DISABLED'}]
    [CURRENT_BROWSER_STATE: ${stateString}]
    
    TASK: Execute the generation of the page at the target URL. 
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

export const generateImage = async (prompt: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
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

export const processAiImages = async (html: string): Promise<string> => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const images = Array.from(doc.querySelectorAll('img[data-ai-prompt]'));

  if (images.length === 0) return html;

  const imagePromises = images.map(async (img) => {
    const prompt = img.getAttribute('data-ai-prompt');
    if (!prompt) return;
    
    // Set a loading state or placeholder
    img.setAttribute('src', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2ZmZiIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+R2VuZXJhdGluZyBJbWFnZS4uLjwvdGV4dD48L3N2Zz4=');
    
    try {
      const base64Image = await generateImage(prompt);
      if (base64Image) {
        img.setAttribute('src', base64Image);
        img.removeAttribute('data-ai-prompt');
      }
    } catch (e) {
      console.error("Failed to generate image for prompt:", prompt, e);
    }
  });

  await Promise.all(imagePromises);
  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] || '<!DOCTYPE html>';
  return `${doctype}\n${doc.documentElement.outerHTML}`;
};

export const generatePageContent = async (
  url: string,
  model: ModelTier,
  isDeepResearch: boolean = false,
  virtualState?: any
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });
  
  const stateString = virtualState && Object.keys(virtualState).length > 0 
    ? JSON.stringify(virtualState) 
    : 'None';

  // Enhance the prompt with "environmental" cues to help the AI contextualize its "server" role
  const prompt = `
    [REQUEST_TYPE: SERVER_GET]
    [TARGET_URL: "${url}"]
    [BROWSER_USER_AGENT: "InfiniteWeb/4.0 (LatentSpace; Interactive)"]
    [DEEP_RESEARCH_MODE: ${isDeepResearch ? 'ENABLED' : 'DISABLED'}]
    [CURRENT_BROWSER_STATE: ${stateString}]
    
    TASK: Execute the generation of the page at the target URL. 
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
  model: ModelTier
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    [REQUEST_TYPE: CODE_REFINEMENT]
    [INSTRUCTION: "${instruction}"]

    TASK: Modify the existing HTML source to satisfy the user's request. 
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