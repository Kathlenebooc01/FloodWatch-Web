// Swagger UI runs as its prebuilt browser bundle in an isolated document. This
// avoids Turbopack recompiling ApiDOM and keeps its React tree outside the app.
export function GET() {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FloodWatch Cebu API reference</title>
  <link rel="stylesheet" href="/swagger-ui/swagger-ui.css">
  <style>
    body { margin: 0; background: white; }
    .swagger-ui { padding: 16px; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .information-container { padding-top: 0; }
    .swagger-ui .scheme-container { background: transparent; box-shadow: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/swagger-ui/swagger-ui-bundle.js"></script>
  <script>
    window.addEventListener('message', function (event) {
      if (event.origin !== window.location.origin || !event.data || event.data.type !== 'floodwatch-api-spec') return;
      SwaggerUIBundle({
        dom_id: '#swagger-ui',
        spec: event.data.spec,
        supportedSubmitMethods: [],
        tryItOutEnabled: false,
        persistAuthorization: false,
        queryConfigEnabled: false,
        validatorUrl: null,
        deepLinking: false,
        docExpansion: 'none',
        defaultModelsExpandDepth: -1
      });
    });
    window.parent.postMessage({ type: 'floodwatch-swagger-ready' }, window.location.origin);
  </script>
</body>
</html>`;
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src data:; font-src 'self' data:; connect-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
