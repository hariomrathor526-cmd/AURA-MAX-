export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const currentDomain = url.origin; 
  const targetDomain = 'https://vidcloud.eu.org';

  const oldLogo = 'https://vidcloud.eu.org/images/logo.png';
  const newLogo = 'https://cdn.phototourl.com/member/2026-10-02-62a99f01-301c-41f1-9584-0fd12ae4b326.jpg';

  // 1. Preflight OPTIONS
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

  // 2. URL Target Determination (Bypassing External CDN Requests)
  let targetUrl = '';
  if (url.pathname.startsWith('/proxy-cdn/')) {
    const originalCdnPath = url.pathname.replace('/proxy-cdn/', '');
    targetUrl = `https://bunny-cdn-qbg-s6.testwave.cc/${originalCdnPath}${url.search}`;
  } else {
    targetUrl = targetDomain + url.pathname + url.search;
  }

  // Header Forwarding & Origin Spoofing
  const forwardHeaders = new Headers();
  ['range', 'accept', 'accept-language', 'user-agent', 'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform'].forEach(header => {
    if (req.headers.has(header)) {
      forwardHeaders.set(header, req.headers.get(header));
    }
  });

  forwardHeaders.set('referer', 'https://vidcloud.eu.org/');
  forwardHeaders.set('origin', 'https://vidcloud.eu.org');

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : null,
    });

    const contentType = response.headers.get('content-type') || '';

    // 3. HTML Manipulation & Clean Popup Injections
    if (contentType.includes('text/html')) {
      let html = await response.text();

      const injectedAssets = `
      <meta name="referrer" content="no-referrer" />
      <style>
        /* Hide Original TG Popups */
        #join-tg-popup-container, [id*="join-tg-popup"] {
          display: none !important;
        }

        /* Clean Popup Styling */
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
        .sr-popup-card {
          background: #ffffff;
          width: 88%;
          max-width: 360px;
          border-radius: 24px;
          padding: 30px 20px 24px 20px;
          text-align: center;
          position: relative;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          font-family: system-ui, -apple-system, sans-serif;
          box-sizing: border-box;
        }
        .sr-close-btn {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 32px;
          height: 32px;
          background: #f1f5f9;
          border: none;
          border-radius: 50%;
          font-size: 16px;
          color: #334155;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sr-icon-box {
          font-size: 36px;
          margin-bottom: 12px;
        }
        .sr-title-text {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
        }
        .sr-sub-text {
          font-size: 13px;
          color: #64748b;
          line-height: 1.4;
          margin-bottom: 20px;
        }
        .sr-action-btn {
          display: block;
          width: 100%;
          background: #5b42f3;
          color: #ffffff !important;
          text-decoration: none;
          padding: 12px 0;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          box-sizing: border-box;
        }
      </style>

      <script>
        // Guaranteed Popup Close Function
        function dismissCustomPopup() {
          var modal = document.getElementById('myCustomModal');
          if (modal) {
            modal.style.setProperty('display', 'none', 'important');
            modal.remove();
          }
          document.body.style.overflow = 'auto';
        }

        // Global Link Rewriter for Video Playback
        (function() {
          const currentProxy = '${currentDomain}';
          
          function fixUrl(urlStr) {
            if (typeof urlStr !== 'string') return urlStr;
            if (urlStr.includes('vidcloud.eu.org')) {
              return urlStr.replaceAll('https://vidcloud.eu.org', currentProxy);
            }
            if (urlStr.includes('testwave.cc') || urlStr.includes('bunny-cdn')) {
              return urlStr.replace(/https:\/\/[^\/]*testwave\.cc/g, currentProxy + '/proxy-cdn');
            }
            return urlStr;
          }

          const originalFetch = window.fetch;
          window.fetch = function(...args) {
            if (args[0]) args[0] = fixUrl(args[0]);
            return originalFetch.apply(this, args);
          };

          const originalXHR = window.XMLHttpRequest.prototype.open;
          window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            if (url) url = fixUrl(url);
            return originalXHR.call(this, method, url, ...rest);
          };
        })();

        // Text Replacement Engine
        function replaceDOMText() {
          const walk = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT, null, false);
          let node;
          while (node = walk.nextNode()) {
            if (node.nodeValue) {
              let updated = node.nodeValue;
              updated = updated.replace(/Stark\\/PW Team/gi, 'AURA MAX');
              updated = updated.replace(/Study Stark/gi, 'AURA MAX');
              updated = updated.replace(/studystark/gi, 'AURA MAX');
              updated = updated.replace(/Dev Aryan/gi, '₋⁻–RATHOR');
              if (updated !== node.nodeValue) {
                node.nodeValue = updated;
              }
            }
          }
        }

        document.addEventListener('DOMContentLoaded', function() {
          replaceDOMText();
          const observer = new MutationObserver(replaceDOMText);
          observer.observe(document.body, { childList: true, subtree: true });
        });
      </script>
      </head>`;

      const newPopupHTML = `
      <div id="myCustomModal" class="sr-overlay" onclick="if(event.target === this) dismissCustomPopup();">
        <div class="sr-popup-card">
          <button type="button" class="sr-close-btn" onclick="dismissCustomPopup()">✕</button>
          <div class="sr-icon-box">📢</div>
          <div class="sr-title-text">Join Our Community</div>
          <div class="sr-sub-text">
            Stay updated with latest material<br>and notifications
          </div>
          <a href="https://t.me/+poV8mzcMG4dkY2Vl" target="_blank" class="sr-action-btn" onclick="dismissCustomPopup()">
            Join Now
          </a>
        </div>
      </div>
      </body>`;

      html = html.replace('</head>', injectedAssets);
      html = html.replace('</body>', newPopupHTML);

      // Rewriting Links
      html = html.replaceAll(oldLogo, newLogo);
      html = html.replaceAll('/images/logo.png', newLogo);
      html = html.replaceAll('https://vidcloud.eu.org', currentDomain);
      html = html.replaceAll('vidcloud.eu.org', url.host);
      html = html.replace(/https:\/\/[^\/]*testwave\.cc/g, `${currentDomain}/proxy-cdn`);

      // Text Replacements
      html = html.replaceAll('Stark/PW Team', 'AURA MAX');
      html = html.replace(/studystark/gi, 'AURA MAX');
      html = html.replaceAll('Study Stark', 'AURA MAX');
      html = html.replaceAll('VidCloud', 'AURA MAX');
      html = html.replaceAll('Dev Aryan', '₋⁻–RATHOR');

      return new Response(html, {
        status: response.status,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'access-control-allow-origin': '*',
        },
      });
    }

    // 4. Binary Media & Stream Handling
    const mediaHeaders = new Headers();
    response.headers.forEach((val, key) => {
      if (!['content-security-policy', 'x-frame-options'].includes(key.toLowerCase())) {
        mediaHeaders.set(key, val);
      }
    });
    mediaHeaders.set('access-control-allow-origin', '*');
    mediaHeaders.set('access-control-allow-methods', 'GET, POST, OPTIONS');
    mediaHeaders.set('access-control-allow-headers', '*');
    mediaHeaders.set('access-control-expose-headers', 'Content-Length, Content-Range, Accept-Ranges');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: mediaHeaders,
    });

  } catch (error) {
    return new Response('Proxy Error: ' + error.message, { status: 500 });
  }
}
