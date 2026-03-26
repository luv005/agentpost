<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
  version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <title>XML Sitemap</title>
        <style>
          :root {
            color-scheme: dark;
            --bg: #0b1020;
            --panel: rgba(15, 23, 42, 0.84);
            --panel-border: rgba(148, 163, 184, 0.18);
            --muted: #94a3b8;
            --text: #e2e8f0;
            --accent: #60a5fa;
            --accent-soft: rgba(96, 165, 250, 0.12);
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background:
              radial-gradient(circle at top left, rgba(59, 130, 246, 0.16), transparent 30%),
              radial-gradient(circle at top right, rgba(16, 185, 129, 0.12), transparent 26%),
              var(--bg);
            color: var(--text);
          }

          main {
            max-width: 1180px;
            margin: 0 auto;
            padding: 40px 24px 64px;
          }

          .hero {
            margin-bottom: 28px;
          }

          h1 {
            margin: 0 0 10px;
            font-size: 34px;
            line-height: 1.1;
          }

          p {
            margin: 0;
            color: var(--muted);
            line-height: 1.6;
          }

          .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 14px;
            margin: 28px 0;
          }

          .stat {
            padding: 18px 20px;
            border-radius: 18px;
            border: 1px solid var(--panel-border);
            background: var(--panel);
            backdrop-filter: blur(12px);
          }

          .stat-label {
            display: block;
            margin-bottom: 8px;
            color: var(--muted);
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }

          .stat-value {
            font-size: 28px;
            font-weight: 700;
          }

          .table-wrap {
            overflow: hidden;
            border-radius: 20px;
            border: 1px solid var(--panel-border);
            background: var(--panel);
            box-shadow: 0 24px 64px rgba(15, 23, 42, 0.28);
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          thead {
            background: rgba(15, 23, 42, 0.92);
          }

          th,
          td {
            padding: 14px 16px;
            text-align: left;
            vertical-align: top;
            border-bottom: 1px solid rgba(148, 163, 184, 0.12);
          }

          th {
            color: var(--muted);
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }

          tbody tr:hover {
            background: rgba(96, 165, 250, 0.05);
          }

          a {
            color: var(--accent);
            text-decoration: none;
          }

          a:hover {
            text-decoration: underline;
          }

          .url {
            min-width: 360px;
            word-break: break-word;
          }

          .muted {
            color: var(--muted);
          }

          .alternate-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .alternate {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            border-radius: 999px;
            background: var(--accent-soft);
            color: var(--text);
            font-size: 12px;
            line-height: 1.2;
            white-space: nowrap;
          }

          .alternate-code {
            color: var(--muted);
            font-weight: 700;
            text-transform: uppercase;
          }

          @media (max-width: 840px) {
            main {
              padding-left: 16px;
              padding-right: 16px;
            }

            th:nth-child(3),
            th:nth-child(4),
            td:nth-child(3),
            td:nth-child(4) {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <main>
          <section class="hero">
            <h1>XML Sitemap</h1>
            <p>This view is for humans. Search engines still read the raw XML structure behind it.</p>
          </section>

          <section class="summary">
            <div class="stat">
              <span class="stat-label">URLs</span>
              <span class="stat-value">
                <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/>
              </span>
            </div>
            <div class="stat">
              <span class="stat-label">Alternate Links</span>
              <span class="stat-value">
                <xsl:value-of select="count(sitemap:urlset/sitemap:url/xhtml:link)"/>
              </span>
            </div>
          </section>

          <section class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Last Modified</th>
                  <th>Change Frequency</th>
                  <th>Priority</th>
                  <th>Alternates</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <tr>
                    <td class="url">
                      <a href="{sitemap:loc}">
                        <xsl:value-of select="sitemap:loc"/>
                      </a>
                    </td>
                    <td class="muted">
                      <xsl:choose>
                        <xsl:when test="sitemap:lastmod">
                          <xsl:value-of select="sitemap:lastmod"/>
                        </xsl:when>
                        <xsl:otherwise>-</xsl:otherwise>
                      </xsl:choose>
                    </td>
                    <td class="muted">
                      <xsl:value-of select="sitemap:changefreq"/>
                    </td>
                    <td class="muted">
                      <xsl:value-of select="sitemap:priority"/>
                    </td>
                    <td>
                      <xsl:choose>
                        <xsl:when test="xhtml:link">
                          <div class="alternate-list">
                            <xsl:for-each select="xhtml:link">
                              <a class="alternate" href="{@href}">
                                <span class="alternate-code">
                                  <xsl:value-of select="@hreflang"/>
                                </span>
                              </a>
                            </xsl:for-each>
                          </div>
                        </xsl:when>
                        <xsl:otherwise>
                          <span class="muted">-</span>
                        </xsl:otherwise>
                      </xsl:choose>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </section>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
