export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const currentDomain = url.origin; 
  const targetDomain = 'https://vidcloud.eu.org';

  // 1. Preflight CORS Requests Handle Karein
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

  // 2. Exact Query Parameters Target Domain Par Forward Karein
  const targetUrl = targetDomain + url.pathname + url.search;

  const forwardHeaders = new Headers(req.headers);
  forwardHeaders.set('host', 'vidcloud.eu.org');
  forwardHeaders.set('referer', 'https://vidcloud.eu.org/');
  forwardHeaders.set('origin', 'https://vidcloud.eu.org');
  forwardHeaders.delete('accept-encoding');

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : null,
    });

    const contentType = response.headers.get('content-type') || '';

    // 3. Player Page HTML Interception & New Popup Injection
    if (contentType.includes('text/html')) {
      let html = await response.text();

      // Naya Popup CSS, Close JS aur Interceptors
      const newPopupStylesAndScripts = `
      <style>
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
          z-index: 99999;
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
          width: 32px;
          height: 32px;
          background: #f2f2f4;
          border: none;
          border-radius: 50%;
          font-size: 14px;
          color: #333333;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          outline: none;
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
        function closeTelegramPopup() {
          const overlay = document.getElementById('srOverlay');
          if (overlay) overlay.style.display = 'none';
        }

        (function() {
          const myDomain = '${currentDomain}';
          
          // Fetch API Interceptor
          const originalFetch = window.fetch;
          window.fetch = function(...args) {
            if (typeof args[0] === 'string' && args[0].includes('vidcloud.eu.org')) {
              args[0] = args[0].replace('https://vidcloud.eu.org', myDomain);
            }
            return originalFetch.apply(this, args);
          };

          // XHR Interceptor
          const originalXHR = window.XMLHttpRequest.prototype.open;
          window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            if (typeof url === 'string' && url.includes('vidcloud.eu.org')) {
              url = url.replace('https://vidcloud.eu.org', myDomain);
            }
            return originalXHR.call(this, method, url, ...rest);
          };
        })();
      </script>
      </head>`;

      // Naya Clean Popup HTML Structure
      const newPopupHTML = `
      <div id="srOverlay" class="sr-overlay">
        <div id="srPopup">
          <button id="srClose" onclick="closeTelegramPopup()">✕</button>
          <div id="srIcon">📣</div>
          <div id="srTitle">Join Our Community</div>
          <div id="srSub">
            Stay updated with latest material<br>and notifications
          </div>
          <a href="https://t.me/studystark" target="_blank" id="srBtn" onclick="closeTelegramPopup()">
            Join Now
          </a>
        </div>
      </div>
      </body>`;

      // Head Tag Modification
      html = html.replace('</head>', newPopupStylesAndScripts);

      // Purana Popup Remove Karein (Agar HTML me exist karta hai)
      html = html.replace(/<div id="join-tg-popup-container">[\s\S]*?<\/div>/gi, '');
      
      // Naya Popup Attach Karein Body ke End me
      html = html.replace('</body>', newPopupHTML);

      // Domain aur Branding Replacement
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

    // 4. JS & JSON Rewriting (Play.php player scripts)
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

    // 5. Media & Stream Data Direct Serving with CORS
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
