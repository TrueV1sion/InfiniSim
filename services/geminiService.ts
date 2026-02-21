import { GoogleGenAI } from "@google/genai";
import { ModelTier } from "../types";

// The "Standard Library" injected into every generated page to handle navigation and bridge the AI to the browser chrome.
const INJECTED_SCRIPT = `
<script>
  (function() {
    // Intercept navigation
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a');
      if (link) {
        const href = link.getAttribute('href');
        if (href && href !== '#' && !href.startsWith('javascript:')) {
          e.preventDefault();
          window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: href }, '*');
        }
      }
    }, true);

    // Form submission interceptor
    document.addEventListener('submit', function(e) {
      const form = e.target;
      const action = form.getAttribute('action');
      if (!action || action.startsWith('/') || action.startsWith('http')) {
        e.preventDefault();
        const formData = new FormData(form);
        const params = new URLSearchParams();
        for (const [key, value] of formData.entries()) {
          params.append(key, value.toString());
        }
        const queryStr = params.toString();
        const target = (action || window.location.pathname) + (queryStr ? '?' + queryStr : '');
        window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: target }, '*');
      }
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
You are InfiniteWeb 3.0, the world's most advanced generative web engine. You don't just "generate pages"; you simulate a fully interactive, hyper-realistic internet.

### CORE ARCHITECTURAL PRINCIPLES:
1. **Uncompromising Quality**: Every page must look like a high-end, award-winning website. Use Tailwind CSS for all styling.
2. **Total Interactivity**: If it looks like a button, it MUST work. If it's a dashboard, the data should be dynamic (hallucinate realistic real-time updates using JS intervals).
3. **Library Ecosystem**: 
   - Icons: Use Lucide Icons (<script src="https://unpkg.com/lucide@latest"></script> followed by lucide.createIcons()).
   - Animations: Use GSAP for cinematic transitions (<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>).
   - Charts: Use Chart.js for data visualization (<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>).
   - 3D: Use PlayCanvas for immersive games/simulations (<script src="https://code.playcanvas.com/playcanvas-latest.js"></script>).

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

const cleanHtml = (html: string) => {
    html = html.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
    if (html.includes('</body>') && !html.includes('INFINITE_WEB_NAVIGATE')) {
      html = html.replace('</body>', `${INJECTED_SCRIPT}</body>`);
    } else if (!html.includes('INFINITE_WEB_NAVIGATE')) {
      html += INJECTED_SCRIPT;
    }
    return html;
};

export const generatePageContent = async (
  url: string,
  model: ModelTier,
  isDeepResearch: boolean = false
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });
  
  // Enhance the prompt with "environmental" cues to help the AI contextualize its "server" role
  const prompt = `
    [REQUEST_TYPE: SERVER_GET]
    [TARGET_URL: "${url}"]
    [BROWSER_USER_AGENT: "InfiniteWeb/3.0 (LatentSpace; Interactive)"]
    [DEEP_RESEARCH_MODE: ${isDeepResearch ? 'ENABLED' : 'DISABLED'}]
    
    TASK: Execute the generation of the page at the target URL. 
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