import {
  DESIGN_MOODS,
  BRAND_PATTERNS,
  KEYWORD_STYLE_MAPPINGS,
  type DesignMood,
  type BrandProfile,
} from '../config/styleProfiles';

export interface StyleResult {
  type: 'brand' | 'keyword' | 'random';
  mood?: DesignMood;
  brand?: BrandProfile;
  promptUser: boolean;
}

function hashDomain(domain: string): number {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    const char = domain.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function extractDomain(url: string): string {
  try {
    if (url.startsWith('search://') || url.startsWith('infinite://')) {
      return url;
    }
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function resolveStyle(url: string): StyleResult {
  const domain = extractDomain(url);
  const urlLower = url.toLowerCase();

  const brandMatch = BRAND_PATTERNS.find(bp =>
    domain === bp.domain || domain.endsWith('.' + bp.domain)
  );

  if (brandMatch) {
    return {
      type: 'brand',
      brand: brandMatch,
      promptUser: true,
    };
  }

  for (const mapping of KEYWORD_STYLE_MAPPINGS) {
    if (urlLower.includes(mapping.keyword)) {
      const mood = DESIGN_MOODS.find(m => m.name === mapping.moodName);
      if (mood) {
        return {
          type: 'keyword',
          mood,
          promptUser: false,
        };
      }
    }
  }

  const hash = hashDomain(domain);
  const moodIndex = hash % DESIGN_MOODS.length;

  return {
    type: 'random',
    mood: DESIGN_MOODS[moodIndex],
    promptUser: false,
  };
}

export function getStylePromptSection(result: StyleResult, userPreference?: string): string {
  let section = '\n### VISUAL IDENTITY DIRECTIVE:\n';

  if (result.type === 'brand' && result.brand) {
    section += `[RECOGNIZED_BRAND: "${result.brand.domain}"]\n`;
    section += `BRAND STYLE: ${result.brand.styleDirective}\n`;
    section += 'Simulate a high-fidelity version of this brand. Match the described visual identity closely while generating original content.\n';
  } else if (result.mood) {
    section += `[DESIGN_MOOD: "${result.mood.name}"]\n`;
    section += `COLOR PALETTE: ${result.mood.colorPalette}\n`;
    section += `TYPOGRAPHY: ${result.mood.typography}\n`;
    section += `LAYOUT STYLE: ${result.mood.layoutStyle}\n`;
    section += `DENSITY: ${result.mood.density}\n`;
    section += `MOOD: ${result.mood.mood}\n`;
    section += `CSS APPROACH: ${result.mood.cssApproach}\n`;
    section += 'You MUST follow this design mood precisely. The visual identity of the page should match these specifications. Do NOT default to a generic dark tech aesthetic.\n';
  }

  if (userPreference) {
    section += `\n[USER_STYLE_PREFERENCE: "${userPreference}"]\n`;
    section += 'The user has requested the following customization for this site. Honor their preference, adapting the base style accordingly.\n';
  }

  return section;
}
