<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
<xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
<xsl:template match="/">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <title>XML Sitemap — AgentSend</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0a0a0a;color:#e5e5e5;padding:2rem}
    h1{font-size:1.5rem;font-weight:600;margin-bottom:.25rem;color:#fff}
    p.meta{color:#737373;font-size:.875rem;margin-bottom:1.5rem}
    table{width:100%;border-collapse:collapse;font-size:.8125rem}
    thead th{text-align:left;padding:.625rem .75rem;background:#171717;color:#a3a3a3;font-weight:500;border-bottom:1px solid #262626;position:sticky;top:0}
    tbody td{padding:.5rem .75rem;border-bottom:1px solid #1a1a1a}
    tbody tr:hover{background:#111}
    a{color:#a78bfa;text-decoration:none}
    a:hover{text-decoration:underline}
    .priority{text-align:center}
    .freq{text-align:center}
    .date{white-space:nowrap;color:#a3a3a3}
  </style>
</head>
<body>
  <h1>XML Sitemap</h1>
  <p class="meta">
    This sitemap contains <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> URLs.
  </p>
  <table>
    <thead>
      <tr>
        <th>URL</th>
        <th class="priority">Priority</th>
        <th class="freq">Change Freq</th>
        <th>Last Modified</th>
      </tr>
    </thead>
    <tbody>
      <xsl:for-each select="sitemap:urlset/sitemap:url">
        <tr>
          <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
          <td class="priority"><xsl:value-of select="sitemap:priority"/></td>
          <td class="freq"><xsl:value-of select="sitemap:changefreq"/></td>
          <td class="date"><xsl:value-of select="sitemap:lastmod"/></td>
        </tr>
      </xsl:for-each>
    </tbody>
  </table>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
