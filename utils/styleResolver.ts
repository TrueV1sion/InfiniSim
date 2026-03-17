import {
  DESIGN_MOODS,
  BRAND_PATTERNS,
  KEYWORD_STYLE_MAPPINGS,
  TLD_STYLE_DEFAULTS,
  type DesignMood,
} from '../config/styleProfiles';

export interface StyleResult {
  mood: DesignMood;
  brandDirective?: string;
  genreHint?: string;
  source: 'brand' | 'keyword' | 'tld' | 'random';
}

function getMoodByName(name: string): DesignMood | undefined {
  return DESIGN_MOODS.find(m => m.name === name);
}

function extractTld(url: string): string {
  const cleaned = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
  const dotIndex = cleaned.lastIndexOf('.');
  if (dotIndex === -1) return '';
  const afterDot = cleaned.substring(dotIndex).split('/')[0].split('?')[0];
  return afterDot.toLowerCase();
}

export function resolveStyle(url: string): StyleResult {
  const lower = url.toLowerCase();

  for (const bp of BRAND_PATTERNS) {
    if (bp.pattern.test(lower)) {
      const fallback = DESIGN_MOODS[Math.floor(Math.random() * DESIGN_MOODS.length)];
      return {
        mood: getMoodByName('clean-corporate') || fallback,
        brandDirective: bp.directive,
        source: 'brand',
      };
    }
  }

  const keywordScores: Record<string, number> = {};
  for (const [keyword, moodName] of Object.entries(KEYWORD_STYLE_MAPPINGS)) {
    if (lower.includes(keyword)) {
      keywordScores[moodName] = (keywordScores[moodName] || 0) + 1;
    }
  }

  if (Object.keys(keywordScores).length > 0) {
    const bestMood = Object.entries(keywordScores)
      .sort((a, b) => b[1] - a[1])[0][0];
    const mood = getMoodByName(bestMood);
    if (mood) {
      const matchedKeywords = Object.entries(KEYWORD_STYLE_MAPPINGS)
        .filter(([kw]) => lower.includes(kw))
        .map(([kw]) => kw);
      return {
        mood,
        genreHint: `URL keywords suggest: ${matchedKeywords.join(', ')}`,
        source: 'keyword',
      };
    }
  }

  const tld = extractTld(url);
  if (tld) {
    const tldMoodName = TLD_STYLE_DEFAULTS[tld];
    if (tldMoodName) {
      const mood = getMoodByName(tldMoodName);
      if (mood) {
        return {
          mood,
          genreHint: `TLD "${tld}" suggests this style`,
          source: 'tld',
        };
      }
    }
  }

  const randomMood = DESIGN_MOODS[Math.floor(Math.random() * DESIGN_MOODS.length)];
  return { mood: randomMood, source: 'random' };
}

export function getStylePromptSection(result: StyleResult, userPreference?: string): string {
  const { mood, brandDirective, genreHint } = result;

  let section = '';

  if (brandDirective) {
    section += `\n### BRAND DIRECTIVE:\n${brandDirective}\n`;
    section += `Simulate a high-fidelity, alternative-universe version of this brand. Match the brand's known design language and UX patterns closely.\n`;
  }

  section += `\n### STYLE DIRECTIVE:
[DESIGN_MOOD: "${mood.name}"]
COLOR PALETTE: ${mood.colorPalette}
TYPOGRAPHY: ${mood.typography}
LAYOUT: ${mood.layoutStyle}
DENSITY: ${mood.density}
MOOD/FEEL: ${mood.mood}
CSS APPROACH: ${mood.cssApproach}

HERO SECTION: ${mood.heroPattern}

SECTION LAYOUT OPTIONS (use at least 3 different ones):
${mood.sectionVariations.map((v, i) => `  ${i + 1}. ${v}`).join('\n')}

SIGNATURE DESIGN ELEMENTS (incorporate at least 2):
${mood.signatureElements.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}

TYPOGRAPHIC SCALE: ${mood.typographicScale}

COLOR APPLICATION RULES: ${mood.colorUsageRules}

Follow this design direction closely. It defines the visual identity of this page.
You may adapt details to fit the content, but the overall aesthetic MUST match this mood.`;

  if (genreHint) {
    section += `\n\n[GENRE_HINT: ${genreHint}]`;
  }

  if (userPreference) {
    section += `\n\n### USER STYLE PREFERENCE:\nThe user has requested: "${userPreference}". Incorporate this into the design while maintaining the overall mood.`;
  }

  return section;
}
