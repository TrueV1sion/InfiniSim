import { GoogleGenAI } from "@google/genai";
import { ModelTier } from "../types";

// Helper to inject the click interceptor script into generated HTML
const INJECTED_SCRIPT = `
<script>
  (function() {
    // Intercept clicks
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a');
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href && href !== '#') {
          window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: href }, '*');
        }
      }
    });

    // Handle form submissions (basic search simulation)
    document.addEventListener('submit', function(e) {
      e.preventDefault();
      const form = e.target;
      const inputs = Array.from(form.elements).filter(el => el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search'));
      if (inputs.length > 0) {
        const query = inputs[0].value;
        const action = form.getAttribute('action') || window.location.pathname;
        const newUrl = action + '?q=' + encodeURIComponent(query);
        window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: newUrl }, '*');
      }
    });
  })();
</script>
`;

const SYSTEM_INSTRUCTION = `
You are InfiniteWeb, an advanced AI engine capable of generating fully functional, high-fidelity web applications and sites on the fly.
Your task is to act as a web server and browser engine combined. When a user provides a URL or a natural language query, you generate the complete HTML, CSS, and JavaScript to render that page.

GUIDELINES:
1. **Aesthetics**: Use Tailwind CSS (via CDN) for all styling. Aim for modern, polished, "FAANG-quality" designs. Use gradients, glassmorphism, and clean typography.
2. **Functionality**: The page should be interactive. Use vanilla JavaScript to make buttons work, tabs switch, and simple logic functional (e.g., calculators, to-do lists, simple games).
3. **Images**: Use "https://picsum.photos/seed/{random_string}/800/600" for placeholder images. Do NOT use broken local paths.
4. **Links**: You must simulate a real website structure. Create links (<a href="...">) to plausible internal pages (e.g., /about, /products/1, /contact). 
5. **Content**: Hallucinate rich, detailed content relevant to the URL. If the user visits "mars-colony.org", create a convincing dashboard for a Mars colony.
6. **Completeness**: Return ONLY the raw HTML code starting with <!DOCTYPE html>. Do not wrap in markdown code blocks. 
7. **No External Dependencies**: Do not rely on external CSS/JS files other than Tailwind CSS and perhaps Google Fonts. All custom logic must be inline.
`;

const cleanHtml = (html: string) => {
    // Cleanup markdown if the model accidentally includes it despite instructions
    html = html.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();

    // Inject our bridge script if not present
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
  previousContext?: string
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    User is visiting: "${url}"
    Context: ${previousContext || "None - Start of session"}
    
    TASK: Generate the full, production-ready HTML5 code for this specific page. 
    Maintain absolute relevance to the URL. If the URL is "search://...", generate a dynamic search results page for that query.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.8,
        // Use thinking budget for Pro model to ensure high architectural quality
        ...(model === ModelTier.PRO ? { thinkingConfig: { thinkingBudget: 4000 } } : {})
      }
    });

    const html = response.text || "<!-- Error generating content --><h1>404 Page Generation Failed</h1>";
    return cleanHtml(html);
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-[#050505] text-white flex items-center justify-center min-h-screen flex-col font-sans">
        <div class="max-w-xl p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl">
            <h1 class="text-3xl font-bold mb-4 text-red-500 flex items-center gap-3">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Generation Halted
            </h1>
            <p class="text-gray-400 mb-6 leading-relaxed">The generative engine encountered an anomaly while constructing this reality. This usually happens due to safety filters or network congestion.</p>
            <div class="bg-black/50 p-4 rounded-lg text-[10px] font-mono text-red-400/80 border border-red-500/20 mb-6 overflow-auto max-h-32">
              ${errorMessage}
            </div>
            <div class="flex gap-4">
                <button onclick="window.parent.postMessage({type: 'INFINITE_WEB_NAVIGATE', url: '/'}, '*')" class="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all font-medium">Home</button>
                <button onclick="window.location.reload()" class="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all font-medium shadow-lg shadow-blue-500/20">Retry Generation</button>
            </div>
        </div>
      </body>
      </html>
    `;
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
    MODIFICATION REQUEST:
    
    USER INSTRUCTION: "${instruction}"

    CURRENT HTML STATE:
    ${currentHtml}

    TASK:
    Analyze the current HTML and apply the requested changes exactly. 
    Maintain the existing design language and Tailwind CSS integration.
    Return the FULL UPDATED HTML.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4,
        // Refinement is complex, use thinking
        ...(model === ModelTier.PRO ? { thinkingConfig: { thinkingBudget: 2000 } } : {})
      }
    });

    return cleanHtml(response.text || currentHtml);
  } catch (error) {
    console.error("Refinement Error", error);
    throw error;
  }
};