import {
  BRAND_PATTERNS,
  type BrandProfile,
} from '../config/styleProfiles';

export interface StyleResult {
  type: 'brand' | 'contextual';
  brand?: BrandProfile;
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

function inferGenreFromUrl(url: string): string {
  const lower = url.toLowerCase();

  const genres: Array<{ patterns: RegExp; hint: string }> = [
    { patterns: /news|journal|times|gazette|herald|tribune|post-/, hint: 'news/journalism site' },
    { patterns: /shop|store|market|commerce|buy|deal/, hint: 'e-commerce/shopping site' },
    { patterns: /game|arena|play|quest|rpg|battle/, hint: 'gaming site' },
    { patterns: /social|feed|community|forum|chat/, hint: 'social/community site' },
    { patterns: /music|radio|audio|sound|beat|synth/, hint: 'music/audio site' },
    { patterns: /finance|stock|trade|bank|invest|crypto/, hint: 'finance/trading site' },
    { patterns: /science|research|lab|bio|dna|chem/, hint: 'science/research site' },
    { patterns: /space|mars|stellar|cosmic|astro|orbit/, hint: 'space/sci-fi site' },
    { patterns: /art|gallery|museum|exhibit|creative/, hint: 'art/gallery site' },
    { patterns: /recipe|kitchen|food|cook|bakery|cafe/, hint: 'food/cooking site' },
    { patterns: /health|wellness|meditation|zen|calm|yoga/, hint: 'wellness/health site' },
    { patterns: /dashboard|analytics|monitor|admin|metrics/, hint: 'dashboard/analytics tool' },
    { patterns: /travel|vacation|hotel|flight|tour/, hint: 'travel site' },
    { patterns: /learn|edu|course|tutorial|academy/, hint: 'education/learning site' },
    { patterns: /horror|haunted|dark|mystery|escape/, hint: 'horror/dark-themed site' },
    { patterns: /weather|climate|forecast/, hint: 'weather site' },
    { patterns: /library|archive|book|read/, hint: 'library/knowledge site' },
    { patterns: /pet|animal|adopt|sanctuary/, hint: 'pets/animals site' },
    { patterns: /city|urban|planner|build/, hint: 'city/planning site' },
    { patterns: /ocean|sea|marine|dive|underwater/, hint: 'ocean/marine site' },
  ];

  for (const { patterns, hint } of genres) {
    if (patterns.test(lower)) return hint;
  }

  return '';
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

  const genre = inferGenreFromUrl(url);

  return {
    type: 'contextual',
    genreHint: genre,
    promptUser: false,
  };
}

export function getStylePromptSection(result: StyleResult, userPreference?: string): string {
  let section = '';

  if (result.type === 'brand' && result.brand) {
    section += '\n### STYLE HINT:\n';
    section += `[RECOGNIZED_BRAND: "${result.brand.domain}"]\n`;
    section += `BRAND STYLE: ${result.brand.styleDirective}\n`;
    section += 'Simulate a high-fidelity alternative universe version of this brand. Match the described visual identity closely while generating original content.\n';
  } else if (result.genreHint) {
    section += '\n### STYLE HINT:\n';
    section += `This appears to be a ${result.genreHint}. Use this as creative inspiration for the visual design — choose colors, typography, and layout that feel authentic and premium for this type of site. Do NOT follow a rigid template.\n`;
  }

  if (userPreference) {
    section += `\n[USER_STYLE_PREFERENCE: "${userPreference}"]\n`;
    section += 'The user has requested the following customization. Honor their preference.\n';
  }

  return section;
}
