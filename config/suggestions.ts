export type SuggestionCategory = 'experiences' | 'apps' | 'creative' | 'connected' | 'webcontainer';

export interface Suggestion {
  url: string;
  label: string;
  description: string;
  category: SuggestionCategory;
  icon: string;
  features?: string[];
}

export const CATEGORY_META: Record<SuggestionCategory, { label: string; description: string }> = {
  experiences: { label: 'Experiences', description: '3D worlds, games, and immersive environments' },
  apps: { label: 'Apps & Tools', description: 'Dashboards, SaaS platforms, and productivity tools' },
  creative: { label: 'Creative', description: 'Portfolios, galleries, and visual showcases' },
  connected: { label: 'Live Data', description: 'Real-time feeds powered by InfiniteAPI' },
  webcontainer: { label: 'WebContainer', description: 'Full-stack apps running in-browser' },
};

export const SUGGESTIONS: Suggestion[] = [
  {
    url: 'cyberpunk-arena-3d.play',
    label: '3D Cyberpunk Arena',
    description: 'Explore a neon-lit cyberpunk city with WASD controls and dynamic lighting',
    category: 'experiences',
    icon: '🎮',
    features: ['3D', 'Audio'],
  },
  {
    url: 'mars-colony-dashboard.org',
    label: 'Mars Base Control',
    description: 'Manage a simulated Mars colony with real-time resource monitoring',
    category: 'experiences',
    icon: '🚀',
    features: ['Dashboard'],
  },
  {
    url: 'ocean-depths-explorer.dive',
    label: 'Deep Ocean Explorer',
    description: 'Dive into the abyss with a 3D submarine simulation and bioluminescent creatures',
    category: 'experiences',
    icon: '🌊',
    features: ['3D', 'Audio'],
  },
  {
    url: 'retro-arcade-cabinet.play',
    label: 'Retro Arcade Cabinet',
    description: 'Classic arcade games rendered with pixel-perfect CRT effects',
    category: 'experiences',
    icon: '👾',
    features: ['Audio'],
  },
  {
    url: 'vr-sculpture-gallery.museum',
    label: 'VR Sculpture Gallery',
    description: 'Walk through a virtual museum of procedurally generated sculptures',
    category: 'experiences',
    icon: '🏛️',
    features: ['3D', 'VR'],
  },
  {
    url: 'quantum-chess.play',
    label: 'Quantum Chess',
    description: 'Chess with quantum mechanics -- pieces exist in superposition',
    category: 'experiences',
    icon: '♟️',
  },

  {
    url: 'amazon-quantum.shop',
    label: 'Quantum E-Commerce',
    description: 'A futuristic shopping platform with AI recommendations and AR previews',
    category: 'apps',
    icon: '🛒',
  },
  {
    url: 'ai-civilization-simulator.gov',
    label: 'Civilization Simulator',
    description: 'Interactive dashboard controlling an AI-driven civilization simulation',
    category: 'apps',
    icon: '🤖',
    features: ['Dashboard'],
  },
  {
    url: 'project-management.saas',
    label: 'Project Manager Pro',
    description: 'Kanban boards, Gantt charts, and team collaboration in one place',
    category: 'apps',
    icon: '📋',
    features: ['Dashboard'],
  },
  {
    url: 'fitness-tracker-dashboard.health',
    label: 'Fitness Dashboard',
    description: 'Track workouts, nutrition, and health metrics with beautiful charts',
    category: 'apps',
    icon: '💪',
    features: ['Dashboard'],
  },
  {
    url: 'email-client.app',
    label: 'Email Client',
    description: 'A sleek, modern email client with folders, search, and compose',
    category: 'apps',
    icon: '📧',
  },
  {
    url: 'recipe-book.kitchen',
    label: 'Recipe Collection',
    description: 'Browse, search, and save recipes with step-by-step cooking mode',
    category: 'apps',
    icon: '🍳',
  },

  {
    url: 'nexus-social-feed.net',
    label: 'Holographic Social',
    description: 'A futuristic social media feed with stories, posts, and reactions',
    category: 'creative',
    icon: '🌐',
  },
  {
    url: 'generative-art-studio.gallery',
    label: 'Generative Art Studio',
    description: 'Create and browse procedurally generated art using interactive controls',
    category: 'creative',
    icon: '🎨',
  },
  {
    url: 'music-visualizer.audio',
    label: 'Music Visualizer',
    description: 'WebGL audio-reactive visualizations that respond to synthesized music',
    category: 'creative',
    icon: '🎵',
    features: ['Audio', '3D'],
  },
  {
    url: 'photography-portfolio.design',
    label: 'Photography Portfolio',
    description: 'Minimal, elegant portfolio with masonry grid and lightbox galleries',
    category: 'creative',
    icon: '📸',
  },
  {
    url: 'neon-magazine.design',
    label: 'Digital Magazine',
    description: 'An editorial-style magazine layout with rich typography and animation',
    category: 'creative',
    icon: '📖',
  },
  {
    url: 'ascii-art-terminal.retro',
    label: 'ASCII Art Terminal',
    description: 'A retro terminal interface that generates ASCII art in real-time',
    category: 'creative',
    icon: '🖥️',
  },

  {
    url: 'hacker-news-reader.app',
    label: 'Hacker News Reader',
    description: 'Live feed from Hacker News with comments and voting via InfiniteAPI',
    category: 'connected',
    icon: '📡',
    features: ['InfiniteAPI'],
  },
  {
    url: 'weather-dashboard.app',
    label: 'Live Weather Dashboard',
    description: 'Real-time weather data for any city with maps and forecasts',
    category: 'connected',
    icon: '🌤️',
    features: ['InfiniteAPI'],
  },
  {
    url: 'global-news-stream.live',
    label: 'Real-time News Portal',
    description: 'Breaking news aggregator with live updates from around the world',
    category: 'connected',
    icon: '📰',
    features: ['InfiniteAPI'],
  },
  {
    url: 'crypto-ticker-dashboard.finance',
    label: 'Crypto Tracker',
    description: 'Live cryptocurrency prices, charts, and portfolio tracking',
    category: 'connected',
    icon: '📈',
    features: ['InfiniteAPI'],
  },
  {
    url: 'github-explorer.dev',
    label: 'GitHub Explorer',
    description: 'Browse trending repositories and developer profiles with live data',
    category: 'connected',
    icon: '🐙',
    features: ['InfiniteAPI'],
  },
  {
    url: 'space-station-tracker.live',
    label: 'ISS Tracker',
    description: 'Track the International Space Station position on a live map',
    category: 'connected',
    icon: '🛸',
    features: ['InfiniteAPI'],
  },

  {
    url: 'wc://react-todo-app',
    label: 'React Todo App',
    description: 'A full React + Vite todo application running in WebContainer',
    category: 'webcontainer',
    icon: '⚛️',
    features: ['WebContainer'],
  },
  {
    url: 'wc://express-rest-api',
    label: 'Express REST API',
    description: 'A Node.js + Express REST API with CRUD endpoints',
    category: 'webcontainer',
    icon: '🔧',
    features: ['WebContainer'],
  },
  {
    url: 'wc://react-dashboard',
    label: 'React Dashboard',
    description: 'A full admin dashboard with charts, tables, and routing',
    category: 'webcontainer',
    icon: '📊',
    features: ['WebContainer'],
  },
  {
    url: 'wc://markdown-editor',
    label: 'Markdown Editor',
    description: 'A live Markdown editor with preview built with React',
    category: 'webcontainer',
    icon: '✏️',
    features: ['WebContainer'],
  },
];

export function getSuggestionsByCategory(category: SuggestionCategory): Suggestion[] {
  return SUGGESTIONS.filter(s => s.category === category);
}

export function getRandomSuggestion(): Suggestion {
  return SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)];
}

export const HERO_PLACEHOLDERS = [
  'amazon-quantum.shop',
  'a retro 1995 news site',
  'wc://react-dashboard',
  'mars-colony-dashboard.org',
  'cyberpunk-arena-3d.play',
  'hacker-news-reader.app',
  'generative-art-studio.gallery',
  'an AI-powered music player',
  'weather-dashboard.app',
  'wc://express-rest-api',
];
