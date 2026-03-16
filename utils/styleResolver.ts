import {
  BRAND_PATTERNS,
  DESIGN_MOODS,
  KEYWORD_STYLE_MAPPINGS,
  type BrandProfile,
  type DesignMood,
} from '../config/styleProfiles';

export interface StyleResult {
  type: 'brand' | 'mood' | 'contextual';
  brand?: BrandProfile;
  mood?: DesignMood;
  genreHint?: string;
  promptUser: boolean;
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

function pickRandomMood(): DesignMood {
  return DESIGN_MOODS[Math.floor(Math.random() * DESIGN_MOODS.length)];
}

function matchMoodByKeyword(url: string): DesignMood | null {
  const lower = url.toLowerCase();
  for (const mapping of KEYWORD_STYLE_MAPPINGS) {
    if (lower.includes(mapping.keyword)) {
      const mood = DESIGN_MOODS.find(m => m.name === mapping.moodName);
      if (mood) return mood;
    }
  }
  return null;
}

export function resolveStyle(url: string): StyleResult {
  const domain = extractDomain(url);

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

  const keywordMood = matchMoodByKeyword(url);
  if (keywordMood) {
    return {
      type: 'mood',
      mood: keywordMood,
      promptUser: false,
    };
  }

  return {
    type: 'mood',
    mood: pickRandomMood(),
    promptUser: false,
  };
}

function buildMoodDirective(mood: DesignMood): string {
  return [
    `[DESIGN_MOOD: "${mood.name}"]`,
    `COLOR PALETTE: ${mood.colorPalette}`,
    `TYPOGRAPHY: ${mood.typography}`,
    `LAYOUT: ${mood.layoutStyle}`,
    `DENSITY: ${mood.density}`,
    `MOOD/FEEL: ${mood.mood}`,
    `CSS APPROACH: ${mood.cssApproach}`,
    'Follow this design direction closely. It defines the visual identity of this page.',
    'You may adapt details to fit the content, but the overall aesthetic MUST match.',
  ].join('\n');
}

export function getStylePromptSection(result: StyleResult, userPreference?: string): string {
  let section = '';

  if (result.type === 'brand' && result.brand) {
    section += '\n### STYLE DIRECTIVE:\n';
    section += `[RECOGNIZED_BRAND: "${result.brand.domain}"]\n`;
    section += `BRAND STYLE: ${result.brand.styleDirective}\n`;
    section += 'Simulate a high-fidelity alternative universe version of this brand. Match the described visual identity closely while generating original content.\n';
  } else if (result.type === 'mood' && result.mood) {
    section += '\n### STYLE DIRECTIVE:\n';
    section += buildMoodDirective(result.mood) + '\n';
  }

  if (userPreference) {
    section += `\n[USER_STYLE_PREFERENCE: "${userPreference}"]\n`;
    section += 'The user has requested the following customization. Honor their preference while staying within the design mood above.\n';
  }

  return section;
}
