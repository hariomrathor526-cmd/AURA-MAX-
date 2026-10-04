export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const currentDomain = url.origin; 
  const targetDomain = 'https://vidcloud.eu.org';
  const cdnHost = 'bunny-cdn-qbg-s6.testwave.cc';

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

  let targetUrl = '';
  let isCdn = false;

  if (url.pathname.startsWith('/cdn-proxy/')) {
    isCdn = true;
    const realPath = url.pathname.replace('/cdn-proxy/', '');
    targetUrl = `https://${cdnHost}/${realPath}${url.search}`;
  } else {
    targetUrl = targetDomain + url.pathname + url.search;
  }

  const forwardHeaders = {
    'user-agent': req.headers.get('user-agent') || 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'referer': 'https://vidcloud.eu.org/',
    'origin': 'https://vidcloud.eu.org',
  };

  if (isCdn) {
    forwardHeaders['host'] = cdnHost;
  }

  if (req.headers.has('range')) {
    forwardHeaders['range'] = req.headers.get('range');
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : null,
    });

    if (isCdn) {
      const cdnHeaders = new Headers(response.headers);
      cdnHeaders.set('access-control-allow-origin', '*');
      cdnHeaders.set('access-control-allow-methods', 'GET, POST, OPTIONS');
      return new Response(response.body, { status: response.status, headers: cdnHeaders });
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      let html = await response.text();

      // Injected BEFORE any other script runs
      const earlyInterceptor = `
      <script>
        (function() {
          const myDomain = '${currentDomain}';
          const cdnHost = '${cdnHost}';

          function fixUrl(str) {
            if (typeof str !== 'string') return str;
            if (str.includes('vidcloud.eu.org')) {
              str = str.replace('https://vidcloud.eu.org', myDomain);
            }
            if (str.includes(cdnHost)) {
              str = str.replace('https://' + cdnHost, myDomain + '/cdn-proxy');
            }
            return str;
          }

          // Override fetch
          const origFetch = window.fetch;
          window.fetch = function(...args) {
            args[0] = fixUrl(args[0]);
            return origFetch.apply(this, args);
          };

          // Override XHR
          const origXhr = window.XMLHttpRequest.prototype.open;
          window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            url = fixUrl(url);
            return origXhr.call(this, method, url, ...rest);
          };

          // Override Video Source
          document.addEventListener('DOMContentLoaded', function() {
            const observer = new MutationObserver(function(mutations) {
              mutations.forEach(function(m) {
                m.addedNodes.forEach(function(node) {
                  if (node.tagName === 'VIDEO' || node.tagName === 'SOURCE') {
                    if (node.src && node.src.includes(cdnHost)) {
                      node.src = fixUrl(node.src);
                    }
                  }
                });
              });
            });
            observer.observe(document.body, { childList: true, subtree: true });
          });
        })();
      </script>
      `;

      html = html.replace('<head>', '<head>' + earlyInterceptor);
      html = html.replaceAll('https://vidcloud.eu.org', currentDomain);
      html = html.replaceAll('vidcloud.eu.org', url.host);
      html = html.replaceAll(`https://${cdnHost}`, `${currentDomain}/cdn-proxy`);
      html = html.replaceAll(cdnHost, `${url.host}/cdn-proxy`);

      return new Response(html, {
        status: response.status,
        headers: { 'content-type': 'text/html; charset=utf-8', 'access-control-allow-origin': '*' },
      });
    }

    if (contentType.includes('javascript') || contentType.includes('json')) {
      let text = await response.text();
      text = text.replaceAll('https://vidcloud.eu.org', currentDomain);
      text = text.replaceAll('vidcloud.eu.org', url.host);
      text = text.replaceAll(`https://${cdnHost}`, `${currentDomain}/cdn-proxy`);
      text = text.replaceAll(cdnHost, `${url.host}/cdn-proxy`);

      return new Response(text, {
        status: response.status,
        headers: { 'content-type': contentType, 'access-control-allow-origin': '*' },
      });
    }

    return new Response(response.body, { status: response.status, headers: response.headers });

  } catch (err) {
    return new Response('Error: ' + err.message, { status: 500 });
  }
}
