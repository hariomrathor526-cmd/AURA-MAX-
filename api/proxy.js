export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const currentDomain = url.origin; 
  const targetDomain = 'https://vidcloud.eu.org';
  const cdnHost = 'bunny-cdn-qbg-s6.testwave.cc';

  // 1. Preflight CORS Requests
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

  // 2. Route Target Determination
  let targetUrl = targetDomain + url.pathname + url.search;

  // Handle CDN Proxy Route
  if (url.pathname.startsWith('/cdn-proxy/')) {
    const originalCdnPath = url.pathname.replace('/cdn-proxy/', '');
    targetUrl = `https://${cdnHost}/${originalCdnPath}${url.search}`;
  }

  // Forward Headers
  const forwardHeaders = {
    'accept': req.headers.get('accept') || '*/*',
    'accept-language': req.headers.get('accept-language') || 'en-US,en;q=0.9',
    'user-agent': req.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'referer': 'https://vidcloud.eu.org/',
    'origin': 'https://vidcloud.eu.org',
  };

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

    const contentType = response.headers.get('content-type') || '';

    // 3. HTML Interception & Interceptor Injection
    if (contentType.includes('text/html')) {
      let html = await response.text();

      const injectedAssets = `
      <style>
        #join-tg-popup-container, 
        [id*="join-tg-popup"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }

        .sr-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999999 !important;
          backdrop-filter: blur(2px);
        }
        #srPopup {
          background: #ffffff;
          width: 88%;
          max-width: 380px;
          border-radius: 28px;
          padding: 35px 24px 28px 24px;
          text-align: center;
          position: relative;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          box-sizing: border-box;
        }
        #srClose {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 36px;
          height: 36px;
          background: #f2f2f4;
          border: none;
          border-radius: 50%;
          font-size: 16px;
          color: #333333;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          outline: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          z-index: 10;
        }
        #srIcon {
          width: 70px;
          height: 70px;
          background: #f6f6f8;
          border-radius: 50%;
          margin: 0 auto 16px auto;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
        }
        #srTitle {
          font-size: 22px;
          font-weight: 700;
          color: #000000;
          margin-bottom: 10px;
        }
        #srSub {
          font-size: 14px;
          color: #666666;
          line-height: 1.4;
          margin-bottom: 26px;
        }
        #srBtn {
          display: block;
          width: 100%;
          background: #111111;
          color: #ffffff;
          text-decoration: none;
          padding: 14px 0;
          border-radius: 16px;
          font-size: 16px;
          font-weight: 600;
          box-sizing: border-box;
        }
      </style>
      <script>
        function closeSrModal() {
          var el = document.getElementById('srOverlay');
          if (el) {
            el.style.setProperty('display', 'none', 'important');
            el.remove();
          }

          document.body.style.setProperty('overflow', 'auto', 'important');
          document.body.style.setProperty('position', 'static', 'important');
          document.documentElement.style.setProperty('overflow', 'auto', 'important');
        }

        document.addEventListener('DOMContentLoaded', function() {
          setInterval(function() {
            var oldPopups = document.querySelectorAll('#join-tg-popup-container');
            oldPopups.forEach(function(item) { item.remove(); });
          }, 400);

          var closeBtn = document.getElementById('srClose');
          var overlay = document.getElementById('srOverlay');

          if (closeBtn) {
            closeBtn.addEventListener('click', closeSrModal);
            closeBtn.addEventListener('touchstart', closeSrModal);
          }

          if (overlay) {
            overlay.addEventListener('click', function(e) {
              if (e.target === overlay) {
                closeSrModal();
              }
            });
          }
        });

        // Deep Interception System (Fetch, XHR, and HTML Video Elements)
        (function() {
          const myDomain = '${currentDomain}';
          const cdnHost = '${cdnHost}';

          function rewriteUrl(inputUrl) {
            if (typeof inputUrl !== 'string') return inputUrl;

            if (inputUrl.includes('vidcloud.eu.org')) {
              return inputUrl.replace('https://vidcloud.eu.org', myDomain);
            }
            if (inputUrl.includes(cdnHost)) {
              return inputUrl.replace('https://' + cdnHost, myDomain + '/cdn-proxy');
            }
            return inputUrl;
          }

          // 1. Fetch Interceptor
          const originalFetch = window.fetch;
          window.fetch = function(...args) {
            args[0] = rewriteUrl(args[0]);
            return originalFetch.apply(this, args);
          };

          // 2. XHR Interceptor
          const originalXHR = window.XMLHttpRequest.prototype.open;
          window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            url = rewriteUrl(url);
            return originalXHR.call(this, method, url, ...rest);
          };

          // 3. HTML Video/Audio Prototype Interceptor
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

          // 4. MutationObserver for Dynamic Elements Injection
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              mutation.addedNodes.forEach((node) => {
                if (node.tagName === 'VIDEO' || node.tagName === 'SOURCE' || node.tagName === 'IFRAME') {
                  if (node.src && node.src.includes(cdnHost)) {
                    node.src = rewriteUrl(node.src);
                  }
                }
              });
            });
          });

          observer.observe(document.documentElement, { childList: true, subtree: true });
        })();
      </script>
      </head>`;

      const newPopupHTML = `
      <div id="srOverlay" class="sr-overlay">
        <div id="srPopup">
          <div id="srClose" onclick="closeSrModal()" ontouchstart="closeSrModal()">✕</div>
          <div id="srIcon">📢</div>
          <div id="srTitle">Join Our Community</div>
          <div id="srSub">
            Stay updated with latest material<br>and notifications
          </div>
          <a href="https://t.me/studystark" target="_blank" id="srBtn" onclick="closeSrModal()">
            Join Now
          </a>
        </div>
      </div>
      </body>`;

      html = html.replace('</head>', injectedAssets);
      html = html.replace('</body>', newPopupHTML);

      // DOM String Replacement
      html = html.replaceAll('https://vidcloud.eu.org', currentDomain);
      html = html.replaceAll('vidcloud.eu.org', url.host);
      html = html.replaceAll(`https://${cdnHost}`, `${currentDomain}/cdn-proxy`);
      html = html.replaceAll(cdnHost, `${url.host}/cdn-proxy`);
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

    // 4. JS & JSON Handlers
    if (contentType.includes('javascript') || contentType.includes('json')) {
      let text = await response.text();
      text = text.replaceAll('https://vidcloud.eu.org', currentDomain);
      text = text.replaceAll('vidcloud.eu.org', url.host);
      text = text.replaceAll(`https://${cdnHost}`, `${currentDomain}/cdn-proxy`);
      text = text.replaceAll(cdnHost, `${url.host}/cdn-proxy`);

      return new Response(text, {
        status: response.status,
        headers: {
          'content-type': contentType,
          'access-control-allow-origin': '*',
        },
      });
    }

    // 5. Media & Stream Response Headers Pass-through
    const resHeaders = new Headers();
    ['content-type', 'content-length', 'content-range', 'accept-ranges'].forEach(h => {
      if (response.headers.has(h)) resHeaders.set(h, response.headers.get(h));
    });
    resHeaders.set('access-control-allow-origin', '*');

    return new Response(response.body, {
      status: response.status,
      headers: resHeaders,
    });

  } catch (error) {
    return new Response('Proxy Error: ' + error.message, { status: 500 });
  }
}
