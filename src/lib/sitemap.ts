import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

type SitemapUrl = {
  path: string;
  changefreq: "daily" | "weekly" | "monthly";
  priority: string;
  lastmod?: string;
  alternates?: Array<{
    hreflang: string;
    href: string;
  }>;
};

type GenerateSitemapXmlOptions = {
  baseUrl: string;
  publicDir: string;
};

const LANDING_LOCALES = ["ja", "ko", "es", "de", "el", "id", "vi", "fr", "ar", "zh", "zh-tw", "pt", "th"] as const;

const STATIC_URLS: SitemapUrl[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/docs", changefreq: "weekly", priority: "0.9" },
  { path: "/skill", changefreq: "monthly", priority: "0.8" },
  { path: "/auth/signup", changefreq: "monthly", priority: "0.7" },
  { path: "/blog", changefreq: "daily", priority: "0.9" },
];

const LOCALE_ORDER = ["en", "es", "fr", "de", "ja", "zh", "pt", "ko", "el", "id", "vi", "ar", "zh-tw", "th"] as const;

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function joinUrl(baseUrl: string, path: string) {
  return path === "/" ? `${baseUrl}/` : `${baseUrl}${path}`;
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

function mapLandingLocaleToHreflang(locale: string) {
  if (locale === "zh") return "zh-Hans";
  if (locale === "zh-tw") return "zh-Hant";
  return locale;
}

function collectLandingUrls(publicDir: string, baseUrl: string) {
  const localeDirectories = readdirSync(publicDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "blog")
    .map((entry) => entry.name)
    .filter((locale) => existsSync(join(publicDir, locale, "index.html")))
    .sort((left, right) => {
      const leftIndex = LANDING_LOCALES.indexOf(left as (typeof LANDING_LOCALES)[number]);
      const rightIndex = LANDING_LOCALES.indexOf(right as (typeof LANDING_LOCALES)[number]);

      if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right);
      if (leftIndex === -1) return 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    });

  const alternates: Array<{ hreflang: string; href: string }> = [
    { hreflang: "en", href: joinUrl(baseUrl, "/") },
    ...localeDirectories.map((locale) => ({
      hreflang: mapLandingLocaleToHreflang(locale),
      href: joinUrl(baseUrl, `/${locale}`),
    })),
    { hreflang: "x-default", href: joinUrl(baseUrl, "/") },
  ];

  return [
    { ...STATIC_URLS[0], alternates },
    ...localeDirectories.map((locale) => ({
      path: `/${locale}`,
      changefreq: "weekly" as const,
      priority: "0.9",
      alternates,
    })),
  ];
}

function collectBlogUrls(publicDir: string, baseUrl: string) {
  const blogDir = resolve(publicDir, "blog");
  const groupedPosts = new Map<string, Map<string, SitemapUrl>>();
  const standalonePages: SitemapUrl[] = [];

  for (const filePath of walkHtmlFiles(blogDir)) {
    const relPath = relative(blogDir, filePath).split(sep).join("/");
    const segments = relPath.split("/");
    const basename = segments[segments.length - 1]?.replace(/\.html$/, "");

    if (!basename) continue;
    if (segments.length === 1) {
      if (basename === "index") continue;
      const slug = basename;
      const entry: SitemapUrl = {
        path: `/blog/${slug}`,
        changefreq: "monthly",
        priority: "0.8",
        lastmod: extractLastmodFromBlogHtml(filePath),
      };
      if (!groupedPosts.has(slug)) groupedPosts.set(slug, new Map());
      groupedPosts.get(slug)?.set("en", entry);
      continue;
    }

    if (segments.length === 2) {
      const [locale] = segments;
      if (basename === "index") {
        standalonePages.push({
          path: `/blog/${locale}`,
          changefreq: "weekly",
          priority: "0.7",
        });
        continue;
      }

      const slug = basename;
      const entry: SitemapUrl = {
        path: `/blog/${locale}/${slug}`,
        changefreq: "monthly",
        priority: "0.7",
        lastmod: extractLastmodFromBlogHtml(filePath),
      };
      if (!groupedPosts.has(slug)) groupedPosts.set(slug, new Map());
      groupedPosts.get(slug)?.set(locale, entry);
    }
  }

  const orderedPosts = [...groupedPosts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([, locales]) => {
      const presentLocales = LOCALE_ORDER.filter((locale) => locales.has(locale));
      const alternates: Array<{ hreflang: string; href: string }> =
        presentLocales.map((locale) => {
          const entry = locales.get(locale);
          if (!entry) {
            throw new Error(`Missing sitemap locale entry for ${locale}`);
          }
          return {
            hreflang: locale,
            href: joinUrl(baseUrl, entry.path),
          };
        });

      const englishEntry = locales.get("en");
      if (englishEntry) {
        alternates.push({
          hreflang: "x-default",
          href: joinUrl(baseUrl, englishEntry.path),
        });
      }

      return presentLocales.map((locale) => {
        const entry = locales.get(locale);
        if (!entry) {
          throw new Error(`Missing sitemap locale entry for ${locale}`);
        }
        return { ...entry, alternates };
      });
    });

  const orderedStandalone = standalonePages.sort((left, right) =>
    left.path.localeCompare(right.path),
  );

  return [...orderedStandalone, ...orderedPosts];
}

function renderUrl(entry: SitemapUrl, baseUrl: string) {
  const lastmod = entry.lastmod ?? new Date().toISOString().split("T")[0];
  const lines = [
    "  <url>",
    `    <loc>${escapeXml(joinUrl(baseUrl, entry.path))}</loc>`,
    `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
    `    <changefreq>${entry.changefreq}</changefreq>`,
    `    <priority>${entry.priority}</priority>`,
  ];

  for (const alternate of entry.alternates ?? []) {
    lines.push(
      `    <xhtml:link rel="alternate" hreflang="${escapeXml(alternate.hreflang)}" href="${escapeXml(alternate.href)}"/>`,
    );
  }

  lines.push("  </url>");
  return lines.join("\n");
}

export function generateSitemapXml({
  baseUrl,
  publicDir,
}: GenerateSitemapXmlOptions) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const entries = [
    ...collectLandingUrls(publicDir, normalizedBaseUrl),
    ...STATIC_URLS.slice(1),
    ...collectBlogUrls(publicDir, normalizedBaseUrl),
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries.map((entry) => renderUrl(entry, normalizedBaseUrl)),
    "</urlset>",
    "",
  ].join("\n");
}
