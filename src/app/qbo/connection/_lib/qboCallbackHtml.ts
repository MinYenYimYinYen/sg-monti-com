function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The OAuth callback is a cross-site navigation from Intuit, so a plain 302 would reach the
 * admin page without the SameSite=strict login cookies and bounce to the login screen.
 * Returning a page that navigates itself makes the second hop same-site, so the cookies are
 * sent. The target is always a relative path built from constants (see buildConnectionPageUrl).
 */
export function buildRedirectHtml(targetPath: string): string {
  const attribute = escapeHtml(targetPath);
  // "<" is escaped so the value can never close the script tag.
  const scriptString = JSON.stringify(targetPath).replace(/</g, "\\u003c");
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="referrer" content="no-referrer">',
    "<title>Connecting to QuickBooks</title>",
    `<noscript><meta http-equiv="refresh" content="0;url=${attribute}"></noscript>`,
    "</head>",
    "<body>",
    "<p>Finishing the QuickBooks connection...</p>",
    `<script>window.location.replace(${scriptString});</script>`,
    "</body>",
    "</html>",
  ].join("\n");
}
