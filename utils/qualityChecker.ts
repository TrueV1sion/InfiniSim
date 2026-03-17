export interface QualityReport {
  passed: boolean;
  issues: string[];
  warnings: string[];
}

export function checkGeneratedHtml(html: string): QualityReport {
  const issues: string[] = [];
  const warnings: string[] = [];

  if (!html.includes('<title') || html.includes('<title></title>')) {
    issues.push('Missing or empty <title> tag');
  }

  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1Count === 0) {
    warnings.push('No <h1> element found');
  }

  if (!html.includes('fonts.googleapis.com') && !html.includes('fonts.gstatic.com')) {
    warnings.push('No Google Fonts detected');
  }

  const deadLinks = (html.match(/href=["']#["']/g) || []).length;
  if (deadLinks > 2) {
    warnings.push(`Found ${deadLinks} dead links (href="#")`);
  }

  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (visibleText.length < 500) {
    warnings.push('Very low content density (less than 500 chars of visible text)');
  }

  if (!html.includes('meta name="viewport"') && !html.includes("meta name='viewport'")) {
    warnings.push('Missing viewport meta tag');
  }

  const passed = issues.length === 0;
  return { passed, issues, warnings };
}

export function buildQualityFixInstruction(report: QualityReport): string | null {
  if (report.passed && report.warnings.length <= 1) return null;

  const fixes: string[] = [];

  for (const issue of report.issues) {
    if (issue.includes('<title>')) {
      fixes.push('Add a descriptive <title> tag');
    }
  }

  for (const warning of report.warnings) {
    if (warning.includes('Google Fonts')) {
      fixes.push('Add Google Fonts via <link> in <head> for heading and body fonts');
    }
    if (warning.includes('dead links')) {
      fixes.push('Replace all href="#" with meaningful navigation paths');
    }
    if (warning.includes('content density')) {
      fixes.push('Add more content: additional sections, descriptions, and interactive elements');
    }
    if (warning.includes('viewport')) {
      fixes.push('Add <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    }
  }

  if (fixes.length === 0) return null;

  return `Fix the following quality issues:\n${fixes.map((f, i) => `${i + 1}. ${f}`).join('\n')}`;
}
