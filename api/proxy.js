export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const currentDomain = url.origin; 
  const targetDomain = 'https://vidcloud.eu.org';

  const oldLogo = 'https://vidcloud.eu.org/images/logo.png';
  const newLogo = 'https://cdn.phototourl.com/member/2026-10-02-62a99f01-301c-41f1-9584-0fd12ae4b326.jpg';

  // 1. Preflight CORS Requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      },
    });
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
      redirect: 'manual',
    });

    // Clean Headers (Remove Security Blocks preventing Test/iFrames from loading)
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    
    // Remove headers that force about:blank or block framing
    responseHeaders.delete('x-frame-options');
    responseHeaders.delete('content-security-policy');
    responseHeaders.delete('content-security-policy-report-only');

    // Handle Backend Redirects
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = responseHeaders.get('location');
      if (location) {
        const newLocation = location.replace(targetDomain, currentDomain);
        responseHeaders.set('location', newLocation);
        return new Response(null, {
          status: response.status,
          headers: responseHeaders,
        });
      }
    }

    const contentType = responseHeaders.get('content-type') || '';

    // 3. HTML Interception
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

        /* Hide Top Action Buttons */
        .btn-top-action[href*="telegram.me"],
        .btn-top-action[href*="t.me"],
        .btn-top-action[href*="whatsapp.com"] {
          display: none !important;
        }

        .custom-menu-wrapper {
          position: relative;
          display: inline-block;
        }
        .custom-menu-trigger {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #5b42f3;
          padding: 8px 14px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          outline: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.05);
          transition: all 0.2s ease;
        }
        .custom-menu-trigger:active {
          transform: scale(0.95);
        }
        .custom-dropdown-content {
          display: none;
          position: absolute;
          right: 0;
          top: 115%;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          min-width: 200px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          border-radius: 16px;
          z-index: 999999;
          padding: 8px;
          flex-direction: column;
          gap: 6px;
        }
        .custom-dropdown-content.show {
          display: flex !important;
        }
        .custom-dropdown-content .header-btn {
          width: 100% !important;
          justify-content: flex-start !important;
          padding: 10px 14px !important;
          border-radius: 10px !important;
          background: #f8fafc !important;
          border: 1px solid #edf2f7 !important;
          color: #2d3748 !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          gap: 12px !important;
          box-shadow: none !important;
        }
        .custom-dropdown-content .header-btn:hover {
          background: #f1f5f9 !important;
          color: #5b42f3 !important;
        }
        .custom-dropdown-content .header-btn svg {
          fill: currentColor !important;
          stroke: currentColor !important;
        }
        .custom-menu-tg-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #0088cc;
          color: #ffffff !important;
          text-decoration: none;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 0 4px 10px rgba(0, 136, 204, 0.2);
          transition: background 0.2s ease;
        }
        .custom-menu-tg-btn:hover {
          background: #0077b5;
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
          background: #5b42f3;
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
        (function() {
          const myDomain = '${currentDomain}';
          const targetDomain = 'https://vidcloud.eu.org';

          // Override window.open to force opening in current window instead of blank page
          window.open = function(url) {
            if (url) {
              if (url.includes('vidcloud.eu.org')) {
                url = url.replace(targetDomain, myDomain);
              } else if (url.startsWith('/')) {
                url = myDomain + url;
              }
              window.location.href = url;
            }
            return window;
          };

          // Fix IFrames dynamically
          function fixIframes() {
            document.querySelectorAll('iframe').forEach(function(iframe) {
              if (iframe.src && iframe.src.includes('vidcloud.eu.org')) {
                iframe.src = iframe.src.replace(targetDomain, myDomain);
              }
            });
          }

          // Override Fetch
          const originalFetch = window.fetch;
          window.fetch = function(input, init) {
            if (typeof input === 'string') {
              if (input.includes('vidcloud.eu.org')) {
                input = input.replace(targetDomain, myDomain);
              }
            } else if (input instanceof Request && input.url.includes('vidcloud.eu.org')) {
              input = new Request(input.url.replace(targetDomain, myDomain), input);
            }
            return originalFetch.call(this, input, init);
          };

          // Override XHR
          const originalXHR = window.XMLHttpRequest.prototype.open;
          window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            if (typeof url === 'string' && url.includes('vidcloud.eu.org')) {
              url = url.replace(targetDomain, myDomain);
            }
            return originalXHR.call(this, method, url, ...rest);
          };

          // Observe DOM for newly inserted Test IFrames
          document.addEventListener('DOMContentLoaded', function() {
            fixIframes();
            const observer = new MutationObserver(fixIframes);
            observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
          });
        })();

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

        function replaceImages() {
          const newUrl = "${newLogo}";
          document.querySelectorAll('img').forEach(function(img) {
            if (img.src && img.src.includes('images/logo.png')) {
              img.src = newUrl;
            }
          });
        }

        function organizeHeaderControls() {
          const controls = document.querySelector('.header-controls');
          if (!controls || controls.dataset.menuConverted === "true") return;

          controls.dataset.menuConverted = "true";

          const menuWrapper = document.createElement('div');
          menuWrapper.className = 'custom-menu-wrapper';

          const menuBtn = document.createElement('button');
          menuBtn.className = 'custom-menu-trigger';
          menuBtn.innerHTML = '☰';
          menuBtn.title = 'Menu';

          const dropdownContent = document.createElement('div');
          dropdownContent.className = 'custom-dropdown-content';

          const buttons = Array.from(controls.children);
          buttons.forEach(btn => {
            if (btn.title) {
              btn.innerHTML = btn.innerHTML + ' <span>' + btn.title + '</span>';
            }
            dropdownContent.appendChild(btn);
          });

          const tgBtn = document.createElement('a');
          tgBtn.className = 'custom-menu-tg-btn';
          tgBtn.href = 'https://t.me/+poV8mzcMG4dkY2Vl';
          tgBtn.target = '_blank';
          tgBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.941z"/></svg> <span>Join Telegram</span>';
          
          dropdownContent.appendChild(tgBtn);

          menuWrapper.appendChild(menuBtn);
          menuWrapper.appendChild(dropdownContent);
          controls.appendChild(menuWrapper);

          menuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownContent.classList.toggle('show');
          });

          document.addEventListener('click', function(e) {
            if (!menuWrapper.contains(e.target)) {
              dropdownContent.classList.remove('show');
            }
          });
        }

        document.addEventListener('DOMContentLoaded', function() {
          replaceDOMText();
          replaceImages();
          organizeHeaderControls();

          const observer = new MutationObserver(function() {
            replaceDOMText();
            replaceImages();
            organizeHeaderControls();
          });
          observer.observe(document.body, { childList: true, subtree: true });

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
      </script>`;

      const newPopupHTML = `
      <div id="srOverlay" class="sr-overlay">
        <div id="srPopup">
          <div id="srClose" onclick="closeSrModal()" ontouchstart="closeSrModal()">✕</div>
          <div id="srIcon">📢</div>
          <div id="srTitle">Join Our Community</div>
          <div id="srSub">
            Stay updated with latest material<br>and notifications
          </div>
          <a href="https://t.me/+poV8mzcMG4dkY2Vl" target="_blank" id="srBtn" onclick="closeSrModal()">
            Join Now
          </a>
        </div>
      </div>`;

      if (html.includes('</head>')) {
        html = html.replace('</head>', `${injectedAssets}</head>`);
      } else {
        html = injectedAssets + html;
      }

      if (html.includes('</body>')) {
        html = html.replace('</body>', `${newPopupHTML}</body>`);
      } else {
        html = html + newPopupHTML;
      }

      html = html.replaceAll(oldLogo, newLogo);
      html = html.replaceAll('/images/logo.png', newLogo);
      html = html.replaceAll('https://vidcloud.eu.org', currentDomain);

      return new Response(html, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    // 4. JS & JSON Handlers
    if (contentType.includes('javascript') || contentType.includes('json')) {
      let text = await response.text();
      
      text = text.replaceAll(oldLogo, newLogo);
      text = text.replaceAll('/images/logo.png', newLogo);
      text = text.replaceAll('https://vidcloud.eu.org', currentDomain);

      return new Response(text, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    // 5. Media & Streams
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });

  } catch (error) {
    return new Response('Proxy Error: ' + error.message, { status: 500 });
  }
}
