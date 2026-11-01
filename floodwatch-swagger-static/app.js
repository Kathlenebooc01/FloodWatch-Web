(() => {
  'use strict';

  const specs = window.FLOODWATCH_SPECS;
  const nextTab = document.getElementById('next-tab');
  const supabaseTab = document.getElementById('supabase-tab');
  const notice = document.getElementById('supabase-notice');
  const viewer = document.getElementById('swagger-ui');

  function show(source) {
    nextTab.setAttribute('aria-pressed', String(source === 'next'));
    supabaseTab.setAttribute('aria-pressed', String(source === 'supabase'));
    notice.hidden = source !== 'supabase';
    viewer.replaceChildren();
    window.SwaggerUIBundle({
      dom_id: '#swagger-ui',
      spec: specs[source],
      supportedSubmitMethods: [],
      tryItOutEnabled: false,
      persistAuthorization: false,
      queryConfigEnabled: false,
      validatorUrl: null,
      deepLinking: false,
      docExpansion: 'none',
      defaultModelsExpandDepth: -1,
    });
  }

  nextTab.addEventListener('click', () => show('next'));
  supabaseTab.addEventListener('click', () => show('supabase'));
  show('next');
})();
