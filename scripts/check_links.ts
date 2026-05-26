import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve(__dirname, '../out');

interface BrokenLink {
  sourceFile: string;
  link: string;
  reason: string;
}

function getHtmlFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getHtmlFiles(filePath, fileList);
    } else if (file.endsWith('.html')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function validateInternalLink(sourceFile: string, href: string): { valid: boolean; reason?: string } {
  // Strip query parameters and hash fragments
  const cleanHref = href.split('?')[0].split('#')[0];
  if (!cleanHref || cleanHref === '/') {
    return { valid: true };
  }

  let targetPath = '';

  if (cleanHref.startsWith('/')) {
    // Absolute internal path (e.g. /pt/essays/fta)
    targetPath = path.join(OUT_DIR, cleanHref);
  } else {
    // Relative internal path (e.g. ../fta)
    const sourceDir = path.dirname(sourceFile);
    targetPath = path.resolve(sourceDir, cleanHref);
  }

  // Next.js static export generates pages as:
  // 1. targetPath + "/index.html" (if it was a folder / route)
  // 2. targetPath + ".html" (if it was a standalone file)
  // 3. targetPath itself (if it's an asset like an image or svg)
  const pathsToCheck = [
    targetPath,
    path.join(targetPath, 'index.html'),
    targetPath + '.html',
  ];

  const exists = pathsToCheck.some((p) => fs.existsSync(p));
  if (exists) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: `Target path does not exist. Searched: [${pathsToCheck.join(', ')}]`,
  };
}

async function runLinkChecker() {
  console.log('=== RUNNING STATIC SITE LINK VALIDATION CRAWLER ===');
  console.log(`Scanning build directory: ${OUT_DIR}\n`);

  if (!fs.existsSync(OUT_DIR)) {
    console.error(`❌ Build directory "out/" not found! Please run "npm run build" first to generate static pages.\n`);
    process.exit(1);
  }

  const htmlFiles = getHtmlFiles(OUT_DIR);
  if (htmlFiles.length === 0) {
    console.log('⚠️ No HTML files found in the "out/" directory.');
    process.exit(0);
  }

  let checkedLinksCount = 0;
  const brokenLinks: BrokenLink[] = [];

  for (const file of htmlFiles) {
    const relativeSource = path.relative(OUT_DIR, file);
    const htmlContent = fs.readFileSync(file, 'utf-8');

    // Extract all href values from anchor tags, e.g., <a href="...">
    const hrefRegex = /<a\s+[^>]*href=["']([^"']*)["']/gi;
    let match;

    while ((match = hrefRegex.exec(htmlContent)) !== null) {
      const href = match[1].trim();
      checkedLinksCount++;

      // Skip external links, mailto links, and anchor-only hashes
      if (
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#') ||
        href === ''
      ) {
        continue;
      }

      const { valid, reason } = validateInternalLink(file, href);
      if (!valid) {
        brokenLinks.push({
          sourceFile: relativeSource,
          link: href,
          reason: reason || 'Unknown error',
        });
      }
    }
  }

  console.log(`Total HTML files crawled: ${htmlFiles.length}`);
  console.log(`Total internal/external links analyzed: ${checkedLinksCount}\n`);

  if (brokenLinks.length > 0) {
    console.error('❌ BROKEN INTERNAL LINKS DETECTED:');
    brokenLinks.forEach((broken, index) => {
      console.error(`\n[${index + 1}] Inside: "${broken.sourceFile}"`);
      console.error(`    Broken Link: "${broken.link}"`);
      console.error(`    Reason:      ${broken.reason}`);
    });
    console.error('\nFAIL: Link validation failed. Fix the broken routes above.\n');
    process.exit(1);
  } else {
    console.log('🎉 SUCCESS: All internal links are perfectly mapped and structurally valid! No broken routes found.\n');
    process.exit(0);
  }
}

runLinkChecker();
