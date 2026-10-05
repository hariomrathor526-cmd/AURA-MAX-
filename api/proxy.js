export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const currentDomain = url.origin; 
  const targetDomain = 'https://vidcloud.eu.org';

  const oldLogo = 'https://vidcloud.eu.org/images/logo.png';
  const newLogo = 'https://cdn.phototourl.com/member/2026-10-02-62a99f01-301c-41f1-9584-0fd12ae4b326.jpg';

  // 1. CORS Preflight
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

  // 2. Target Routing (Video Streams + CDN Bypass)
  let targetUrl = '';
  if (url.pathname.startsWith('/proxy-cdn/')) {
    const originalCdnPath = url.pathname.replace('/proxy-cdn/', '');
    targetUrl = `https://bunny-cdn-qbg-s6.testwave.cc/${originalCdnPath}${url.search}`;
  } else {
    targetUrl = targetDomain + url.pathname + url.search;
  }

  // Headers Spoofing
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

    // 3. HTML Page Modification
    if (contentType.includes('text/html')) {
      let html = await response.text();

      // Reliable CSS & JS Injection
      const customInjections = `
      <meta name="referrer" content="no-referrer" />
      <style>
        /* Block Original Popups */
        #join-tg-popup-container, [id*="join-tg-popup"] {
          display: none !important;
        }

        /* Working Simple Popup Overlay */
        #myPopupOverlay {
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999999;
        }
        .my-popup-box {
          background: #fff; width: 85%; max-width: 340px;
          border-radius: 20px; padding: 25px 20px; text-align: center;
          position: relative; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          font-family: sans-serif;
        }
        .my-close-btn {
          position: absolute; top: 12px; right: 12px;
          background: #f0f0f0; border: none; width: 30px; height: 30px;
          border-radius: 50%; font-size: 16px; cursor: pointer; color: #333;
        }
        .my-popup-btn {
          display: block; width: 100%; background: #5b42f3; color: #fff !important;
          text-decoration: none; padding: 12px 0; border-radius: 12px;
          font-weight: bold; margin-top: 15px; font-size: 15px;
        }
      </style>
      <script>
        // Global Fetch & XHR Rewriter for Streams
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

          const origFetch = window.fetch;
          window.fetch = function(...args) {
            if (args[0]) args[0] = fixUrl(args[0]);
            return origFetch.apply(this, args);
          };

          const origXHR = window.XMLHttpRequest.prototype.open;
          window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            if (url) url = fixUrl(url);
            return origXHR.call(this, method, url, ...rest);
          };
        })();

        // Text & Image Replacement
        function applyChanges() {
          if (!document.body) return;
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
          let node;
          while (node = walker.nextNode()) {
            if (node.nodeValue) {
              node.nodeValue = node.nodeValue
                .replace(/Stark\\/PW Team/gi, 'AURA MAX')
                .replace(/Study Stark/gi, 'AURA MAX')
                .replace(/studystark/gi, 'AURA MAX')
                .replace(/VidCloud/gi, 'AURA MAX')
                .replace(/Dev Aryan/gi, '₋⁻–RATHOR');
            }
          }
          document.querySelectorAll('img').forEach(img => {
            if (img.src && img.src.includes('images/logo.png')) {
              img.src = "${newLogo}";
            }
          });
        }

        window.addEventListener('DOMContentLoaded', () => {
          applyChanges();
          setInterval(applyChanges, 1000);
        });
      </script>
      `;

      const popupHtml = `
      <div id="myPopupOverlay" onclick="this.style.display='none'">
        <div class="my-popup-box" onclick="event.stopPropagation()">
          <button class="my-close-btn" onclick="document.getElementById('myPopupOverlay').style.display='none'">✕</button>
          <div style="font-size:35px; margin-bottom:8px;">📢</div>
          <h3 style="margin:0 0 8px 0; color:#111;">Join Our Community</h3>
          <p style="margin:0; font-size:13px; color:#666;">Stay updated with latest material and notifications</p>
          <a href="https://t.me/+poV8mzcMG4dkY2Vl" target="_blank" class="my-popup-btn" onclick="document.getElementById('myPopupOverlay').style.display='none'">Join Now</a>
        </div>
      </div>
      `;

      html = html.replace('</head>', customInjections + '</head>');
      html = html.replace('</body>', popupHtml + '</body>');

      // Global Static String Replacement
      html = html.replaceAll(oldLogo, newLogo);
      html = html.replaceAll('/images/logo.png', newLogo);
      html = html.replaceAll('https://vidcloud.eu.org', currentDomain);
      html = html.replaceAll('vidcloud.eu.org', url.host);
      html = html.replace(/https:\/\/[^\/]*testwave\.cc/g, `${currentDomain}/proxy-cdn`);

      html = html.replaceAll('Stark/PW Team', 'AURA MAX');
      html = html.replaceAll('Study Stark', 'AURA MAX');
      html = html.replace(/studystark/gi, 'AURA MAX');
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

    // 4. Proxy Stream Headers
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
