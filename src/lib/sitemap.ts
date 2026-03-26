import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

type SitemapUrl = {
  loc: string;
  lastmod: string;
  changefreq: "daily" | "weekly" | "monthly";
  priority: string;
};

type GenerateSitemapXmlOptions = {
  baseUrl: string;
  publicDir: string;
};

const LANDING_LOCALES = ["ja", "ko", "es", "de", "el", "id", "vi", "fr", "ar", "zh", "zh-tw", "pt", "th"] as const;

const STATIC_PAGES = [
  { path: "/", changefreq: "weekly" as const, priority: "1.0" },
  { path: "/docs", changefreq: "weekly" as const, priority: "0.9" },
  { path: "/skill", changefreq: "monthly" as const, priority: "0.8" },
  { path: "/auth/signup", changefreq: "monthly" as const, priority: "0.7" },
  { path: "/blog", changefreq: "daily" as const, priority: "0.9" },
];

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function walkHtmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return walkHtmlFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".html") ? [fullPath] : [];
  });
}

function extractLastmodFromBlogHtml(filePath: string) {
  const html = readFileSync(filePath, "utf8");
  const match =
    html.match(/"dateModified":\s*"(\d{4}-\d{2}-\d{2})"/) ??
    html.match(/"datePublished":\s*"(\d{4}-\d{2}-\d{2})"/);
  return match?.[1];
}

function collectLandingUrls(publicDir: string, baseUrl: string, now: string): SitemapUrl[] {
  const urls: SitemapUrl[] = [];

  // English landing
  urls.push({ loc: `${baseUrl}/`, lastmod: now, changefreq: "weekly", priority: "1.0" });

  // Locale landings
  for (const locale of LANDING_LOCALES) {
    if (existsSync(join(publicDir, locale, "index.html"))) {
      urls.push({ loc: `${baseUrl}/${locale}`, lastmod: now, changefreq: "weekly", priority: "0.9" });
    }
  }

  return urls;
}

function collectBlogUrls(publicDir: string, baseUrl: string, now: string): SitemapUrl[] {
  const blogDir = resolve(publicDir, "blog");
  if (!existsSync(blogDir)) return [];

  const urls: SitemapUrl[] = [];

  for (const filePath of walkHtmlFiles(blogDir).sort()) {
    const relPath = relative(blogDir, filePath).split(sep).join("/");
    const segments = relPath.split("/");
    const basename = segments[segments.length - 1]?.replace(/\.html$/, "");
    if (!basename) continue;

    // Root blog files: blog/slug.html
    if (segments.length === 1) {
      if (basename === "index") continue;
      const lastmod = extractLastmodFromBlogHtml(filePath) ?? now;
      urls.push({ loc: `${baseUrl}/blog/${basename}`, lastmod, changefreq: "monthly", priority: "0.8" });
      continue;
    }

    // Locale blog files: blog/locale/index.html or blog/locale/slug.html
    if (segments.length === 2) {
      const [locale] = segments;
      if (basename === "index") {
        urls.push({ loc: `${baseUrl}/blog/${locale}`, lastmod: now, changefreq: "weekly", priority: "0.7" });
      } else {
        const lastmod = extractLastmodFromBlogHtml(filePath) ?? now;
        urls.push({ loc: `${baseUrl}/blog/${locale}/${basename}`, lastmod, changefreq: "monthly", priority: "0.7" });
      }
    }
  }

  return urls;
}

function renderUrl(entry: SitemapUrl) {
  return [
    "  <url>",
    `    <loc>${escapeXml(entry.loc)}</loc>`,
    `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`,
    `    <changefreq>${entry.changefreq}</changefreq>`,
    `    <priority>${entry.priority}</priority>`,
    "  </url>",
  ].join("\n");
}

export function generateSitemapXml({ baseUrl, publicDir }: GenerateSitemapXmlOptions) {
  const base = normalizeBaseUrl(baseUrl);
  const now = new Date().toISOString();

  const urls: SitemapUrl[] = [
    ...collectLandingUrls(publicDir, base, now),
    // Static pages (skip "/" since collectLandingUrls handles it)
    ...STATIC_PAGES.slice(1).map((p) => ({
      loc: `${base}${p.path}`,
      lastmod: now,
      changefreq: p.changefreq,
      priority: p.priority,
    })),
    ...collectBlogUrls(publicDir, base, now),
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(renderUrl),
    "</urlset>",
    "",
  ].join("\n");
}
