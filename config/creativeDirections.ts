export interface CreativeDirection {
  pageType: string;
  keywords: string[];
  pathPatterns: RegExp[];
  sections: string;
  contentTone: string;
  interactiveFeatures: string;
  visualStorytelling: string;
}

export const CREATIVE_DIRECTIONS: CreativeDirection[] = [
  {
    pageType: 'e-commerce-home',
    keywords: ['shop', 'store', 'buy', 'market', 'ecommerce', 'amazon', 'ebay'],
    pathPatterns: [/^\/?$/, /\/home/],
    sections: `
1. Hero: Promotional banner or seasonal campaign with strong CTA
2. Featured/trending products carousel (6-8 items)
3. Category grid with imagery (4-6 categories)
4. Deal of the day or flash sale section with countdown timer
5. Customer testimonials or ratings summary
6. Newsletter signup or app download prompt
7. Footer with trust badges, payment icons, and quick links`,
    contentTone: 'Persuasive and confident. Use power words: "exclusive", "limited", "bestselling". Product descriptions should be specific and benefit-oriented.',
    interactiveFeatures: 'Working cart with add/remove, product quick-view modals, wishlist toggle, quantity selectors, star rating displays, price sort/filter.',
    visualStorytelling: 'Lead with lifestyle imagery showing products in use. Create a sense of abundance and variety. Use urgency elements (limited stock indicators, countdown timers).',
  },
  {
    pageType: 'e-commerce-product',
    keywords: ['product', 'item', 'detail'],
    pathPatterns: [/\/products?\//, /\/item\//, /\/p\//],
    sections: `
1. Product hero: Large image gallery (main + thumbnails) on left, details on right
2. Product title, price, ratings, and primary CTA (Add to Cart)
3. Variant selectors (size, color) and quantity
4. Tabbed details: Description, Specifications, Reviews
5. Customer reviews with rating breakdown chart
6. Related/similar products carousel
7. Recently viewed items`,
    contentTone: 'Detailed and informative. Specific measurements, materials, features. Use Faker for realistic product data.',
    interactiveFeatures: 'Image gallery with thumbnail switching, variant selectors that update price/image, add to cart with quantity, tab switching for details/specs/reviews, review sorting.',
    visualStorytelling: 'Product is the hero. Multiple angles. Show scale and detail. Use white or contextual backgrounds.',
  },
  {
    pageType: 'blog-home',
    keywords: ['blog', 'stories', 'articles', 'journal', 'magazine', 'editorial'],
    pathPatterns: [/\/blog\/?$/, /\/stories\/?$/, /\/articles\/?$/],
    sections: `
1. Featured/hero article with large image and excerpt
2. Recent articles grid (6-9 posts in 2-3 column grid)
3. Category/tag filter bar
4. Popular posts sidebar or section
5. Newsletter subscription section
6. Author highlights or contributors`,
    contentTone: 'Engaging and editorial. Compelling headlines that make you want to click. Excerpt text that hooks the reader. Use Faker for realistic author names and dates.',
    interactiveFeatures: 'Category filtering, article card hover effects with excerpt preview, reading time estimates, share buttons, bookmark/save toggle.',
    visualStorytelling: 'Lead with strong editorial imagery. Vary card sizes to create hierarchy (one large featured, rest smaller). Use typography to differentiate sections.',
  },
  {
    pageType: 'blog-post',
    keywords: ['post', 'article', 'read'],
    pathPatterns: [/\/blog\/[^/]+/, /\/post\//, /\/article\//],
    sections: `
1. Article header: Title, author with avatar, date, reading time, category
2. Hero/featured image
3. Article body with rich formatting (headings, pull quotes, inline images, code blocks if relevant)
4. Author bio card at end
5. Share buttons and engagement (like, bookmark)
6. Related articles grid (3 items)
7. Comment section with reply threading`,
    contentTone: 'Well-written article voice. Use real-feeling paragraphs, not lorem ipsum. Include subheadings and varied paragraph lengths for readability.',
    interactiveFeatures: 'Floating table of contents, progress bar showing reading position, share buttons, comment form with reply, like/bookmark toggles.',
    visualStorytelling: 'Editorial photography for the hero. Drop caps or large first letters. Pull quotes as visual breakpoints in long text.',
  },
  {
    pageType: 'saas-landing',
    keywords: ['saas', 'platform', 'tool', 'software', 'startup', 'app'],
    pathPatterns: [/^\/?$/, /\/home/],
    sections: `
1. Hero: Bold headline with value prop, subtitle, CTA buttons (primary + secondary), product screenshot or mockup
2. Social proof: Logos of companies or user count
3. Features grid (3-4 features with icons, titles, descriptions)
4. Product demo/screenshot section with annotations
5. How it works (3 numbered steps)
6. Pricing cards (3 tiers: Free, Pro, Enterprise)
7. Testimonials from named users with roles
8. FAQ accordion
9. Final CTA section`,
    contentTone: 'Clear and benefit-focused. Lead with the problem, present the solution. Use specific numbers and outcomes. Avoid jargon.',
    interactiveFeatures: 'Pricing toggle (monthly/annual), FAQ accordion, feature tabs, smooth scroll navigation, CTA hover animations.',
    visualStorytelling: 'Show the product in context. Use before/after or problem/solution framing. Build trust through social proof and testimonials.',
  },
  {
    pageType: 'social-feed',
    keywords: ['social', 'feed', 'network', 'community', 'forum'],
    pathPatterns: [/\/feed\/?$/, /\/home\/?$/, /\/timeline/],
    sections: `
1. Navigation with user avatar, notifications, messages, search
2. Post creation area (what's on your mind?)
3. Feed of posts with: author info, content, images, engagement buttons
4. Trending/sidebar with hashtags or topics
5. Suggested connections or groups
6. Stories/highlights row at top`,
    contentTone: 'Casual, social, human. Diverse voices in posts. Mix of text, images, shared links. Real-feeling usernames and content.',
    interactiveFeatures: 'Like/heart with counter, comment expand/collapse, share menu, post creation, follow/unfollow, notification badge, infinite scroll simulation.',
    visualStorytelling: 'Variety in post types (text-only, image, link preview, poll). User avatars and names create a sense of community. Real-time indicators (online dots, typing indicators).',
  },
  {
    pageType: 'dashboard',
    keywords: ['dashboard', 'analytics', 'admin', 'panel', 'monitor', 'metrics'],
    pathPatterns: [/\/dashboard/, /\/admin/, /\/analytics/],
    sections: `
1. Top bar with user info, notifications, settings
2. KPI cards row (4 metrics with trend indicators)
3. Main chart (line or area chart showing primary metric over time)
4. Secondary charts grid (2-3 smaller charts: bar, pie, etc.)
5. Recent activity or events table
6. Quick actions or to-do list panel`,
    contentTone: 'Data-driven and precise. Specific numbers, percentages, and trends. Use Faker for realistic metric values.',
    interactiveFeatures: 'Chart hover tooltips, date range selector, tab switching between metrics, sortable tables, expandable rows, quick action buttons.',
    visualStorytelling: 'Data hierarchy: biggest number first. Use color to indicate positive/negative trends. Charts should tell a story at a glance.',
  },
  {
    pageType: 'portfolio',
    keywords: ['portfolio', 'work', 'projects', 'gallery', 'photo', 'creative'],
    pathPatterns: [/\/portfolio/, /\/work\/?$/, /\/projects\/?$/],
    sections: `
1. Dramatic hero with name/title and a statement or tagline
2. Selected works grid (masonry or uniform, 4-8 projects)
3. About section with photo and brief bio
4. Skills or services
5. Client logos or press mentions
6. Contact section or CTA`,
    contentTone: 'Confident and concise. Let the work speak. Brief but impactful project descriptions. Show range and quality.',
    interactiveFeatures: 'Image hover reveals with project title/category, lightbox gallery, category filter for projects, smooth scroll between sections.',
    visualStorytelling: 'Visual-first. Large high-quality images. Minimal text. Create drama through scale and contrast. The portfolio pieces ARE the design.',
  },
  {
    pageType: 'restaurant',
    keywords: ['restaurant', 'food', 'menu', 'dining', 'cafe', 'bistro', 'kitchen', 'recipe', 'cook'],
    pathPatterns: [/\/menu/, /\/restaurant/, /\/dining/],
    sections: `
1. Hero: Atmospheric food/restaurant photo with name and tagline
2. Brief story or philosophy of the chef/restaurant
3. Menu organized by category (Starters, Mains, Desserts) with prices
4. Featured dishes with images and descriptions
5. Ambiance gallery (3-4 photos of interior/food)
6. Reservation section with date/time form
7. Location with address and hours`,
    contentTone: 'Evocative and sensory. Describe flavors, textures, origins. Use words that make you hungry. Poetic but not pretentious.',
    interactiveFeatures: 'Menu category tabs, reservation form, image gallery, map integration, dietary filter (vegetarian, gluten-free).',
    visualStorytelling: 'Food photography is king. Warm lighting, close-ups of dishes. Show the dining experience, not just the food. Create atmosphere through imagery.',
  },
  {
    pageType: 'news-home',
    keywords: ['news', 'journal', 'gazette', 'tribune', 'times', 'daily', 'press'],
    pathPatterns: [/^\/?$/, /\/home/],
    sections: `
1. Breaking news banner (if applicable)
2. Lead story with large hero image
3. Top stories grid (4-6 stories in mixed sizes)
4. Section navigation (Politics, Tech, Sports, Culture, etc.)
5. Opinion/editorial section
6. Most read sidebar or section
7. Weather widget or market ticker`,
    contentTone: 'Journalistic and authoritative. Clear, factual headlines. Bylines with author names. Timestamps that feel current.',
    interactiveFeatures: 'Section filtering, live update indicators, article save/bookmark, share buttons, comment count badges, breaking news animation.',
    visualStorytelling: 'Information hierarchy is everything. Largest story = most important. Dense but organized. Use image sizes to signal story importance.',
  },
  {
    pageType: 'documentation',
    keywords: ['docs', 'documentation', 'api', 'reference', 'guide', 'manual'],
    pathPatterns: [/\/docs?\//, /\/api\//, /\/reference/, /\/guide/],
    sections: `
1. Sidebar navigation with nested sections
2. Search bar (prominent)
3. Current page content with heading hierarchy
4. Code examples with syntax highlighting
5. Next/previous page navigation
6. On-this-page table of contents (right sidebar)`,
    contentTone: 'Clear, technical, precise. Structured with headings and lists. Code examples should look real and functional.',
    interactiveFeatures: 'Sidebar collapse/expand, search with results preview, code block copy button, tab switching between language examples, theme toggle (light/dark).',
    visualStorytelling: 'Clarity over aesthetics. Strong heading hierarchy. Code blocks are the visual centerpiece. Use callout boxes for tips/warnings.',
  },
  {
    pageType: 'user-profile',
    keywords: ['profile', 'user', 'account'],
    pathPatterns: [/\/user\//, /\/profile/, /\/@/],
    sections: `
1. Profile header: avatar, cover photo, name, bio, stats (followers, following, posts)
2. Action buttons (Follow, Message, Share)
3. Tabbed content (Posts, Media, Likes, About)
4. Content feed or grid based on active tab
5. Sidebar with additional info (joined date, location, links)`,
    contentTone: 'Personal and varied. Each profile should feel unique. Realistic bio text, diverse interests and content.',
    interactiveFeatures: 'Follow/unfollow toggle, tab switching, content grid/list view toggle, share profile button, hover effects on content items.',
    visualStorytelling: 'The avatar and cover photo set the personality. Stats create social proof. Content grid showcases the user identity.',
  },
  {
    pageType: 'search-results',
    keywords: ['search'],
    pathPatterns: [/\/search/, /\?q=/],
    sections: `
1. Search bar (pre-filled with query) at top
2. Results count and filter/sort options
3. Results list (10 items) with title, URL, description snippet
4. Pagination
5. Related searches or suggestions
6. Sidebar with filters (category, date, type)`,
    contentTone: 'Informational and scannable. Relevant-looking results with realistic snippets. Varied sources and types.',
    interactiveFeatures: 'Filter sidebar, sort dropdown, pagination, search refinement, result type tabs (All, Images, News, etc.).',
    visualStorytelling: 'Clean and scannable. Highlight matching query terms. Clear visual distinction between title, URL, and description.',
  },
  {
    pageType: 'game-or-interactive',
    keywords: ['game', 'play', 'arcade', 'simulator', 'puzzle', 'arena', '3d'],
    pathPatterns: [/\.game/, /\.play/, /\/game/, /\/play/],
    sections: `
1. Full-screen or prominent game canvas/viewport
2. HUD/UI overlay with score, health, controls
3. Start screen with game title and play button
4. Controls instructions or tutorial
5. High scores or leaderboard`,
    contentTone: 'Exciting and immersive. Game-appropriate language. Clear instructions.',
    interactiveFeatures: 'Fully playable game mechanic (even if simple), keyboard/mouse controls, score tracking, restart button, sound toggle.',
    visualStorytelling: 'The game IS the visual experience. Make it feel polished and complete. Use particle effects, smooth animations, and satisfying feedback.',
  },
  {
    pageType: 'settings-page',
    keywords: ['settings', 'preferences', 'config'],
    pathPatterns: [/\/settings/, /\/preferences/, /\/config/],
    sections: `
1. Settings sidebar/nav with categories
2. Current section with form controls
3. Toggle switches, dropdowns, text inputs
4. Save/cancel buttons
5. Danger zone (delete account, etc.)`,
    contentTone: 'Clear and helpful. Each setting should have a brief description of what it does.',
    interactiveFeatures: 'Toggle switches that visually respond, dropdown selectors, form validation, save confirmation toast, unsaved changes warning.',
    visualStorytelling: 'Organized and calm. Group related settings. Progressive disclosure for advanced options. Clear labels and descriptions.',
  },
];

export function resolveCreativeDirection(url: string): CreativeDirection | null {
  const lower = url.toLowerCase();
  const pathPart = lower.replace(/^https?:\/\//, '').replace(/^[^/]*/, '');

  for (const dir of CREATIVE_DIRECTIONS) {
    for (const pattern of dir.pathPatterns) {
      if (pattern.test(pathPart)) {
        return dir;
      }
    }
  }

  for (const dir of CREATIVE_DIRECTIONS) {
    const matchCount = dir.keywords.filter(kw => lower.includes(kw)).length;
    if (matchCount >= 1) {
      return dir;
    }
  }

  return null;
}

export function getCreativeDirectionPrompt(direction: CreativeDirection): string {
  return `
### CREATIVE DIRECTION [${direction.pageType.toUpperCase()}]:
PAGE STRUCTURE (follow this section order):
${direction.sections}

CONTENT TONE: ${direction.contentTone}

INTERACTIVE FEATURES REQUIRED: ${direction.interactiveFeatures}

VISUAL STORYTELLING: ${direction.visualStorytelling}

Use this creative direction to structure the page. Adapt it to the specific URL context, but follow the recommended section order and include the interactive features.`;
}
