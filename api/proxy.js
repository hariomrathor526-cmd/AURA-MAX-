export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // 1. CORS Preflight (OPTIONS) Requests ko turant Allow karein
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'access-control-allow-headers': '*',
        'access-control-max-age': '86400',
      },
    });
  }

  const url = new URL(req.url);
  const targetUrl = 'https://vidcloud.eu.org' + url.pathname + url.search;

  const forwardHeaders = new Headers(req.headers);
  forwardHeaders.set('host', 'vidcloud.eu.org');
  forwardHeaders.set('referer', 'https://vidcloud.eu.org/');
  forwardHeaders.delete('accept-encoding');

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : null,
    });

    const contentType = response.headers.get('content-type') || '';

    // 2. HTML Text Replacements
    if (contentType.includes('text/html')) {
      let html = await response.text();

      const scriptInjector = `
      <script>
        (function() {
          const targetDomain = 'https://apnaweb-eta.vercel.app';
          const originalFetch = window.fetch;
          window.fetch = function(...args) {
            if (typeof args[0] === 'string' && args[0].includes('vidcloud.eu.org')) {
              args[0] = args[0].replace('https://vidcloud.eu.org', targetDomain);
            }
            return originalFetch.apply(this, args);
          };

          const originalXHR = window.XMLHttpRequest.prototype.open;
          window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            if (typeof url === 'string' && url.includes('vidcloud.eu.org')) {
              url = url.replace('https://vidcloud.eu.org', targetDomain);
            }
            return originalXHR.call(this, method, url, ...rest);
          };
        })();
      </script>
      </head>`;

      html = html.replace('</head>', scriptInjector);
      html = html.replaceAll('https://vidcloud.eu.org', 'https://apnaweb-eta.vercel.app');
      html = html.replaceAll('vidcloud.eu.org', 'apnaweb-eta.vercel.app');
      html = html.replaceAll('Study Stark', 'AURA MAX');
      html = html.replaceAll('VidCloud', 'AURA MAX');

      return new Response(html, {
        status: response.status,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'access-control-allow-origin': '*',
        },
      });
    }

    // 3. JavaScript Files Rewrite
    if (contentType.includes('javascript') || contentType.includes('json')) {
      let text = await response.text();
      text = text.replaceAll('https://vidcloud.eu.org', 'https://apnaweb-eta.vercel.app');
      text = text.replaceAll('vidcloud.eu.org', 'apnaweb-eta.vercel.app');

      return new Response(text, {
        status: response.status,
        headers: {
          'content-type': contentType,
          'access-control-allow-origin': '*',
        },
      });
    }

    // 4. Sabhi Responses ke saath mandatory CORS Headers bhejein
    const modifiedHeaders = new Headers(response.headers);
    modifiedHeaders.set('access-control-allow-origin', '*');
    modifiedHeaders.set('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS');
    modifiedHeaders.set('access-control-allow-headers', '*');

    return new Response(response.body, {
      status: response.status,
      headers: modifiedHeaders,
    });

  } catch (error) {
    return new Response('Proxy Error: ' + error.message, { status: 500 });
  }
}
