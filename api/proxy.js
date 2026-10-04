export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const currentDomain = url.origin; 
  const targetDomain = 'https://vidcloud.eu.org';
  const cdnHost = 'bunny-cdn-qbg-s6.testwave.cc';
  const cloudfrontHost = 'd1d34p8vz63oiq.cloudfront.net';

  // 1. Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'access-control-allow-headers': '*',
        'access-control-allow-credentials': 'true',
        'access-control-max-age': '86400',
      },
    });
  }

  // 2. Routing Logic
  let targetUrl = '';
  let activeHost = 'vidcloud.eu.org';
  let isMediaProxy = false;

  if (url.pathname.startsWith('/cdn-proxy/')) {
    isMediaProxy = true;
    activeHost = cdnHost;
    const realPath = url.pathname.replace('/cdn-proxy/', '');
    targetUrl = `https://${cdnHost}/${realPath}${url.search}`;
  } else if (url.pathname.startsWith('/cf-proxy/')) {
    isMediaProxy = true;
    activeHost = cloudfrontHost;
    const realPath = url.pathname.replace('/cf-proxy/', '');
    targetUrl = `https://${cloudfrontHost}/${realPath}${url.search}`;
  } else {
    targetUrl = targetDomain + url.pathname + url.search;
  }

  // 3. Request Headers & Cookie Pass-Through
  const forwardHeaders = {
    'accept': req.headers.get('accept') || '*/*',
    'accept-language': req.headers.get('accept-language') || 'en-US,en;q=0.9',
    'user-agent': req.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'host': activeHost,
    'referer': 'https://vidcloud.eu.org/',
    'origin': 'https://vidcloud.eu.org',
  };

  // Cookie pass-through for CloudFront/CDN Auth
  if (req.headers.has('cookie')) {
    forwardHeaders['cookie'] = req.headers.get('cookie');
  }

  if (req.headers.has('range')) {
    forwardHeaders['range'] = req.headers.get('range');
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : null,
      redirect: 'follow',
    });

    // Handle Direct Media & DASH Segment Requests
    if (isMediaProxy) {
      const mediaResHeaders = new Headers(response.headers);
      mediaResHeaders.set('access-control-allow-origin', '*');
      mediaResHeaders.set('access-control-allow-credentials', 'true');
      mediaResHeaders.set('access-control-allow-methods', 'GET, POST, OPTIONS');
      
      return new Response(response.body, {
        status: response.status,
        headers: mediaResHeaders,
      });
    }

    const contentType = response.headers.get('content-type') || '';

    // 4. HTML Injection & Multi-CDN Interceptor
    if (contentType.includes('text/html')) {
      let html = await response.text();

      const injectedAssets = `
      <style>
        #join-tg-popup-container, [id*="join-tg-popup"] {
          display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important;
        }
        .sr-overlay {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.4);
          display: flex; align-items: center; justify-content: center; z-index: 9999999 !important; backdrop-filter: blur(2px);
        }
        #srPopup {
          background: #ffffff; width: 88%; max-width: 380px; border-radius: 28px; padding: 35px 24px 28px 24px;
          text-align: center; position: relative; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15); font-family: sans-serif;
        }
        #srClose {
          position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; background: #f2f2f4;
          border: none; border-radius: 50%; font-size: 16px; color: #333; cursor: pointer; display: flex; align-items: center; justify-content: center;
        }
        #srIcon { width: 70px; height: 70px; background: #f6f6f8; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 32px; }
        #srTitle { font-size: 22px; font-weight: 700; color: #000; margin-bottom: 10px; }
        #srSub { font-size: 14px; color: #666; line-height: 1.4; margin-bottom: 26px; }
        #srBtn { display: block; width: 100%; background: #111; color: #fff; text-decoration: none; padding: 14px 0; border-radius: 16px; font-size: 16px; font-weight: 600; }
      </style>
      <script>
        function closeSrModal() {
          var el = document.getElementById('srOverlay');
          if (el) el.remove();
          document.body.style.setProperty('overflow', 'auto', 'important');
          document.documentElement.style.setProperty('overflow', 'auto', 'important');
        }

        document.addEventListener('DOMContentLoaded', function() {
          setInterval(function() {
            var oldPopups = document.querySelectorAll('#join-tg-popup-container');
            oldPopups.forEach(function(item) { item.remove(); });
          }, 400);
        });

        (function() {
          const myDomain = '${currentDomain}';
          const cdnHost = '${cdnHost}';
          const cfHost = '${cloudfrontHost}';

          function rewriteUrl(inputUrl) {
            if (typeof inputUrl !== 'string') return inputUrl;

            if (inputUrl.includes('vidcloud.eu.org')) {
              return inputUrl.replace('https://vidcloud.eu.org', myDomain);
            }
            if (inputUrl.includes(cdnHost)) {
              return inputUrl.replace('https://' + cdnHost, myDomain + '/cdn-proxy');
            }
            if (inputUrl.includes(cfHost)) {
              return inputUrl.replace('https://' + cfHost, myDomain + '/cf-proxy');
            }
            return inputUrl;
          }

          // Fetch Interceptor for DASH/HLS Requests
          const originalFetch = window.fetch;
          window.fetch = function(...args) {
            args[0] = rewriteUrl(args[0]);
            if (typeof args[1] === 'object') {
              args[1].credentials = 'include';
            } else {
              args[1] = { credentials: 'include' };
            }
            return originalFetch.apply(this, args);
          };

          // XHR Interceptor
          const originalXHR = window.XMLHttpRequest.prototype.open;
          window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            url = rewriteUrl(url);
            return originalXHR.call(this, method, url, ...rest);
          };

          // Media element src Interceptor
          const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
          if (originalSrcDescriptor) {
            Object.defineProperty(HTMLMediaElement.prototype, 'src', {
              set: function(val) {
                return originalSrcDescriptor.set.call(this, rewriteUrl(val));
              },
              get: function() {
                return originalSrcDescriptor.get.call(this);
              }
            });
          }
        })();
      </script>
      </head>`;

      const newPopupHTML = `
      <div id="srOverlay" class="sr-overlay">
        <div id="srPopup">
          <div id="srClose" onclick="closeSrModal()">✕</div>
          <div id="srIcon">📢</div>
          <div id="srTitle">Join Our Community</div>
          <div id="srSub">Stay updated with latest material<br>and notifications</div>
          <a href="https://t.me/studystark" target="_blank" id="srBtn" onclick="closeSrModal()">Join Now</a>
        </div>
      </div>
      </body>`;

      html = html.replace('</head>', injectedAssets);
      html = html.replace('</body>', newPopupHTML);

      // Global Domain Strings Replace
      html = html.replaceAll('https://vidcloud.eu.org', currentDomain);
      html = html.replaceAll('vidcloud.eu.org', url.host);
      html = html.replaceAll(`https://${cdnHost}`, `${currentDomain}/cdn-proxy`);
      html = html.replaceAll(cdnHost, `${url.host}/cdn-proxy`);
      html = html.replaceAll(`https://${cloudfrontHost}`, `${currentDomain}/cf-proxy`);
      html = html.replaceAll(cloudfrontHost, `${url.host}/cf-proxy`);
      html = html.replaceAll('Study Stark', 'AURA MAX');
      html = html.replaceAll('VidCloud', 'AURA MAX');

      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('content-type', 'text/html; charset=utf-8');
      responseHeaders.set('access-control-allow-origin', '*');

      return new Response(html, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    // 5. JS & JSON Dynamic Content Rewriting
    if (contentType.includes('javascript') || contentType.includes('json')) {
      let text = await response.text();
      text = text.replaceAll('https://vidcloud.eu.org', currentDomain);
      text = text.replaceAll('vidcloud.eu.org', url.host);
      text = text.replaceAll(`https://${cdnHost}`, `${currentDomain}/cdn-proxy`);
      text = text.replaceAll(cdnHost, `${url.host}/cdn-proxy`);
      text = text.replaceAll(`https://${cloudfrontHost}`, `${currentDomain}/cf-proxy`);
      text = text.replaceAll(cloudfrontHost, `${url.host}/cf-proxy`);

      return new Response(text, {
        status: response.status,
        headers: { 'content-type': contentType, 'access-control-allow-origin': '*' },
      });
    }

    return new Response(response.body, { status: response.status, headers: response.headers });

  } catch (error) {
    return new Response('Proxy Error: ' + error.message, { status: 500 });
  }
}
                                                                                                  </script>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      </head>`;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              html = html.replace('</head>', scriptInjector);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      html = html.replaceAll('https://vidcloud.eu.org', currentDomain);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              html = html.replaceAll('vidcloud.eu.org', url.host);
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

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                // 4. JS & JSON Rewriting
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      if (contentType.includes('javascript') || contentType.includes('json')) {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              let text = await response.text();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      text = text.replaceAll('https://vidcloud.eu.org', currentDomain);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              text = text.replaceAll('vidcloud.eu.org', url.host);

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      return new Response(text, {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                status: response.status,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          headers: {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      'content-type': contentType,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  'access-control-allow-origin': '*',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            },
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    });
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                // 5. Media & Other Requests
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      const modifiedHeaders = new Headers(response.headers);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            modifiedHeaders.set('access-control-allow-origin', '*');
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  modifiedHeaders.set('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS');
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        modifiedHeaders.set('access-control-allow-headers', '*',);

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              return new Response(response.body, {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      status: response.status,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              headers: modifiedHeaders,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    });

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        } catch (error) {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              return new Response('Proxy Error: ' + error.message, { status: 500 });
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    };
