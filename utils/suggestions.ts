export interface Suggestion {
  url: string;
  label: string;
  description: string;
  category: string;
  accent: string;
}

const ALL_SUGGESTIONS: Suggestion[] = [
  { url: 'amazon-quantum.shop', label: 'Quantum E-Commerce', description: 'Shopping reimagined with quantum-entangled recommendations', category: 'Shopping', accent: '#10b981' },
  { url: 'nexus-social-feed.net', label: 'Holographic Social', description: 'A social network built for the post-screen era', category: 'Social', accent: '#3b82f6' },
  { url: 'global-news-stream.live', label: 'News Stream', description: 'Real-time immersive journalism from every timeline', category: 'News', accent: '#ef4444' },
  { url: 'cyberpunk-arena-3d.play', label: '3D Cyberpunk Arena', description: 'Neon-soaked multiplayer combat in the browser', category: 'Gaming', accent: '#f59e0b' },
  { url: 'mars-colony-dashboard.org', label: 'Mars Base Control', description: 'Mission control for the first extraterrestrial settlement', category: 'Science', accent: '#f97316' },
  { url: 'ai-civilization-simulator.gov', label: 'Civilization Sim', description: 'Guide a civilization from stone tools to starships', category: 'Gaming', accent: '#06b6d4' },
  { url: 'deep-ocean-explorer.science', label: 'Abyssal Explorer', description: 'Dive 36,000 feet into an AI-generated ocean', category: 'Science', accent: '#0ea5e9' },
  { url: 'synthwave-radio.fm', label: 'Synthwave Radio', description: 'Infinite procedurally generated retro-future music', category: 'Music', accent: '#ec4899' },
  { url: 'future-city-planner.build', label: 'City Planner 2090', description: 'Design the megacity of tomorrow with AI assistance', category: 'Productivity', accent: '#8b5cf6' },
  { url: 'cosmic-art-gallery.museum', label: 'Cosmic Gallery', description: 'Art exhibitions curated by a sentient algorithm', category: 'Art', accent: '#a855f7' },
  { url: 'neural-recipe-lab.kitchen', label: 'Neural Kitchen', description: 'AI-invented recipes with impossible flavor profiles', category: 'Lifestyle', accent: '#22c55e' },
  { url: 'time-travel-agency.vacation', label: 'Temporal Vacations', description: 'Book a trip to any point in simulated history', category: 'Entertainment', accent: '#eab308' },
  { url: 'dna-design-studio.bio', label: 'DNA Studio', description: 'Genetic engineering playground for impossible organisms', category: 'Science', accent: '#14b8a6' },
  { url: 'haunted-mansion-escape.horror', label: 'Mansion Escape', description: 'A procedurally generated haunted house you can never map', category: 'Gaming', accent: '#dc2626' },
  { url: 'zen-garden-architect.calm', label: 'Zen Garden', description: 'Infinite meditative spaces generated in real-time', category: 'Wellness', accent: '#84cc16' },
  { url: 'stock-market-2099.finance', label: 'Market 2099', description: 'Trade on the interplanetary stock exchange', category: 'Finance', accent: '#0d9488' },
  { url: 'lost-library-of-babel.archive', label: 'Library of Babel', description: 'Every page that could ever be written, searchable', category: 'Knowledge', accent: '#6366f1' },
  { url: 'weather-sculptor.climate', label: 'Weather Sculptor', description: 'Design custom weather systems and watch them unfold', category: 'Science', accent: '#38bdf8' },
  { url: 'pixel-pet-sanctuary.adopt', label: 'Pixel Pets', description: 'Adopt and raise AI creatures that evolve uniquely', category: 'Entertainment', accent: '#fb923c' },
  { url: 'interstellar-map.space', label: 'Star Atlas', description: 'Navigate a billion procedural star systems', category: 'Science', accent: '#818cf8' },
];

export function getRandomSuggestions(count: number): Suggestion[] {
  const shuffled = [...ALL_SUGGESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getRandomUrl(): string {
  const prefixes = ['quantum', 'neo', 'hyper', 'ultra', 'meta', 'cyber', 'nano', 'astro', 'bio', 'synth'];
  const cores = ['market', 'city', 'lab', 'world', 'hub', 'forge', 'pulse', 'wave', 'core', 'grid'];
  const tlds = ['.ai', '.space', '.live', '.zone', '.play', '.build', '.science', '.network'];

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const core = cores[Math.floor(Math.random() * cores.length)];
  const tld = tlds[Math.floor(Math.random() * tlds.length)];

  return `${prefix}-${core}${tld}`;
}
