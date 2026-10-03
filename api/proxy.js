export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const currentDomain = url.origin; 
  const targetDomain = 'https://vidcloud.eu.org';
  const newLogoUrl = 'https://cdn.phototourl.com/member/2026-10-02-62a99f01-301c-41f1-9584-0fd12ae4b326.jpg';

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

  // Direct Image Proxy Redirect for Logo
  if (url.pathname.includes('/images/logo.png')) {
    return Response.redirect(newLogoUrl, 301);
  }

  // 2. Target Forwarding
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

    // 3. HTML Interception & Replacement
    if (contentType.includes('text/html')) {
      let html = await response.text();

      const injectedAssets = `
      <style>
        /* Hide Original Telegram Popup Completely */
        #join-tg-popup-container, 
        [id*="join-tg-popup"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }

        /* Hide ONLY Top Action Telegram and WhatsApp Buttons */
        .btn-top-action[href*="telegram.me"],
        .btn-top-action[href*="t.me"],
        .btn-top-action[href*="whatsapp.com"] {
          display: none !important;
        }

        /* SR Popup Styles */
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

        // Lightweight Safe Replacement Engine
        function runSafeReplacement() {
          const newLogo = "${newLogoUrl}";

          // Update Image Logos safely
          const imgs = document.querySelectorAll('img');
          imgs.forEach(function(img) {
            if (img.src && (img.src.includes('logo') || img.src.includes('images/'))) {
              if (img.src !== newLogo) img.src = newLogo;
            }
          });

          // Text Replacements safely
          const walker = document.createTreeWalker(
            document.body || document.documentElement,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );
          let node;
          while (node = walker.nextNode()) {
            if (node.nodeValue && node.parentNode.id !== 'srPopup') {
              let text = node.nodeValue;
              if (/Stark\/PW Team|Study Stark|studystark|StudyStark/i.test(text)) {
                node.nodeValue = text.replace(/Stark\/PW Team|Study Stark|studystark|StudyStark/gi, 'AURA MAX');
              }
              if (/Dev Aryan/i.test(node.nodeValue)) {
                node.nodeValue = node.nodeValue.replace(/Dev Aryan/gi, '₋⁻–RATHOR');
              }
            }
          }
        }

        document.addEventListener('DOMContentLoaded', function() {
          runSafeReplacement();

          // Throttled Observer to prevent UI Freezing
          let isPending = false;
          const observer = new MutationObserver(function() {
            if (!isPending) {
              isPending = true;
              setTimeout(function() {
                runSafeReplacement();
                isPending = false;
              }, 300);
            }
          });

          if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
          }

          // Close button event binding
          var closeBtn = document.getElementById('srClose');
          var overlay = document.getElementById('srOverlay');

          if (closeBtn) {
            closeBtn.onclick = closeSrModal;
          }
          if (overlay) {
            overlay.onclick = function(e) {
              if (e.target === overlay) closeSrModal();
            };
          }
        });

        (function() {
          const myDomain = '${currentDomain}';
          const originalFetch = window.fetch;
          window.fetch = function(...args) {
            if (typeof args[0] === 'string' && args[0].includes('vidcloud.eu.org')) {
              args[0] = args[0].replace('https://vidcloud.eu.org', myDomain);
            }
            return originalFetch.apply(this, args);
          };

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

      const newPopupHTML = `
      <div id="srOverlay" class="sr-overlay">
        <div id="srPopup">
          <div id="srClose" onclick="closeSrModal()">✕</div>
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

      // Server-side Bulk String Replacement
      html = html.replaceAll('https://vidcloud.eu.org/images/logo.png', newLogoUrl);
      html = html.replaceAll('/images/logo.png', newLogoUrl);
      html = html.replaceAll('https://vidcloud.eu.org', currentDomain);
      html = html.replaceAll('vidcloud.eu.org', url.host);

      html = html.replaceAll('Stark/PW Team', 'AURA MAX');
      html = html.replace(/studystark/gi, 'AURA MAX');
      html = html.replaceAll('Study Stark', 'AURA MAX');
      html = html.replaceAll('StudyStark', 'AURA MAX');
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

    // 4. JS & JSON Handlers
    if (contentType.includes('javascript') || contentType.includes('json')) {
      let text = await response.text();
      text = text.replaceAll('https://vidcloud.eu.org/images/logo.png', newLogoUrl);
      text = text.replaceAll('/images/logo.png', newLogoUrl);
      text = text.replaceAll('https://vidcloud.eu.org', currentDomain);
      text = text.replaceAll('vidcloud.eu.org', url.host);
      text = text.replaceAll('Stark/PW Team', 'AURA MAX');
      text = text.replace(/studystark/gi, 'AURA MAX');
      text = text.replaceAll('Study Stark', 'AURA MAX');
      text = text.replaceAll('StudyStark', 'AURA MAX');
      text = text.replaceAll('Dev Aryan', '₋⁻–RATHOR');

      return new Response(text, {
        status: response.status,
        headers: {
          'content-type': contentType,
          'access-control-allow-origin': '*',
        },
      });
    }

    // 5. Media & Streams
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
