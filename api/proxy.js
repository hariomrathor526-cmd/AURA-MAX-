export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const currentDomain = url.origin; 
  const targetDomain = 'https://vidcloud.eu.org';

  const oldLogo = 'https://vidcloud.eu.org/images/logo.png';
  const newLogo = 'https://cdn.phototourl.com/member/2026-10-02-62a99f01-301c-41f1-9584-0fd12ae4b326.jpg';

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

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    
    responseHeaders.delete('x-frame-options');
    responseHeaders.delete('content-security-policy');
    responseHeaders.delete('content-security-policy-report-only');

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

    // HTML Content Rewriting using HTMLRewriter & Injections
    if (contentType.includes('text/html')) {
      let html = await response.text();

      // Universal Domain & Asset Replacements at Response Level
      html = html.replaceAll('https://vidcloud.eu.org', currentDomain);
      html = html.replaceAll('vidcloud.eu.org', url.host);
      html = html.replaceAll(oldLogo, newLogo);
      html = html.replaceAll('/images/logo.png', newLogo);

      // Kill RUM/Tracking scripts that detect proxies & freeze execution
      html = html.replace(/<script[^>]*rum[^>]*>[\s\S]*?<\/script>/gi, '');

      const injectedAssets = `
      <style>
        #join-tg-popup-container, [id*="join-tg-popup"] { display: none !important; }
        .btn-top-action[href*="telegram.me"], .btn-top-action[href*="t.me"], .btn-top-action[href*="whatsapp.com"] { display: none !important; }

        .custom-menu-wrapper { position: relative; display: inline-block; }
        .custom-menu-trigger {
          background: #ffffff; border: 1px solid #e2e8f0; color: #5b42f3;
          padding: 8px 14px; border-radius: 12px; cursor: pointer; font-size: 20px;
          display: flex; align-items: center; justify-content: center; outline: none;
        }
        .custom-dropdown-content {
          display: none; position: absolute; right: 0; top: 115%; background: #ffffff;
          border: 1px solid #e2e8f0; min-width: 200px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          border-radius: 16px; z-index: 999999; padding: 8px; flex-direction: column; gap: 6px;
        }
        .custom-dropdown-content.show { display: flex !important; }
        .custom-dropdown-content .header-btn {
          width: 100% !important; justify-content: flex-start !important; padding: 10px 14px !important;
          border-radius: 10px !important; background: #f8fafc !important; border: 1px solid #edf2f7 !important;
          color: #2d3748 !important; font-size: 14px !important; font-weight: 500 !important; gap: 12px !important;
        }
        .custom-menu-tg-btn {
          display: flex; align-items: center; gap: 10px; background: #0088cc; color: #ffffff !important;
          text-decoration: none; padding: 10px 14px; border-radius: 10px; font-size: 14px; font-weight: 600;
        }

        .sr-overlay {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.4);
          display: flex; align-items: center; justify-content: center; z-index: 9999999 !important; backdrop-filter: blur(2px);
        }
        #srPopup {
          background: #ffffff; width: 88%; max-width: 380px; border-radius: 28px; padding: 35px 24px 28px 24px;
          text-align: center; position: relative; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        }
        #srClose {
          position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; background: #f2f2f4;
          border: none; border-radius: 50%; font-size: 16px; color: #333333; cursor: pointer;
        }
        #srIcon { width: 70px; height: 70px; background: #f6f6f8; border-radius: 50%; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center; font-size: 32px; }
        #srTitle { font-size: 22px; font-weight: 700; color: #000000; margin-bottom: 10px; }
        #srSub { font-size: 14px; color: #666666; line-height: 1.4; margin-bottom: 26px; }
        #srBtn { display: block; width: 100%; background: #5b42f3; color: #ffffff; text-decoration: none; padding: 14px 0; border-radius: 16px; font-size: 16px; font-weight: 600; }
      </style>
      <script>
        // High-Priority Early Override for about:blank Window Spawns
        (function() {
          const myDomain = '${currentDomain}';
          const targetDomain = 'https://vidcloud.eu.org';

          // Anti-Anti-Proxy Interceptor
          window.datadogRum = { init: function(){}, startView: function(){} };

          // Override window.open & Force load in current frame instead of about:blank
          const origOpen = window.open;
          window.open = function(url, target, features) {
            if (!url || url === 'about:blank') {
              return window;
            }
            if (typeof url === 'string') {
              url = url.replace(targetDomain, myDomain);
              window.location.href = url;
              return window;
            }
            return origOpen.apply(this, arguments);
          };

          // Override document.domain
          try {
            Object.defineProperty(document, 'domain', {
              get: function() { return '${url.host}'; },
              set: function() {}
            });
          } catch(e) {}
        })();

        function closeSrModal() {
          var el = document.getElementById('srOverlay');
          if (el) { el.style.setProperty('display', 'none', 'important'); el.remove(); }
          document.body.style.setProperty('overflow', 'auto', 'important');
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
              if (updated !== node.nodeValue) { node.nodeValue = updated; }
            }
          }
        }

        function replaceImages() {
          const newUrl = "${newLogo}";
          document.querySelectorAll('img').forEach(function(img) {
            if (img.src && img.src.includes('images/logo.png')) { img.src = newUrl; }
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

          const dropdownContent = document.createElement('div');
          dropdownContent.className = 'custom-dropdown-content';

          Array.from(controls.children).forEach(btn => {
            if (btn.title) { btn.innerHTML = btn.innerHTML + ' <span>' + btn.title + '</span>'; }
            dropdownContent.appendChild(btn);
          });

          const tgBtn = document.createElement('a');
          tgBtn.className = 'custom-menu-tg-btn';
          tgBtn.href = 'https://t.me/+poV8mzcMG4dkY2Vl';
          tgBtn.target = '_blank';
          tgBtn.innerHTML = '<span>Join Telegram</span>';
          dropdownContent.appendChild(tgBtn);

          menuWrapper.appendChild(menuBtn);
          menuWrapper.appendChild(dropdownContent);
          controls.appendChild(menuWrapper);

          menuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownContent.classList.toggle('show');
          });

          document.addEventListener('click', function(e) {
            if (!menuWrapper.contains(e.target)) { dropdownContent.classList.remove('show'); }
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
          if (closeBtn) { closeBtn.addEventListener('click', closeSrModal); }
          if (overlay) { overlay.addEventListener('click', function(e) { if (e.target === overlay) closeSrModal(); }); }
        });
      </script>`;

      const newPopupHTML = `
      <div id="srOverlay" class="sr-overlay">
        <div id="srPopup">
          <div id="srClose" onclick="closeSrModal()">✕</div>
          <div id="srIcon">📢</div>
          <div id="srTitle">Join Our Community</div>
          <div id="srSub">Stay updated with latest material<br>and notifications</div>
          <a href="https://t.me/+poV8mzcMG4dkY2Vl" target="_blank" id="srBtn" onclick="closeSrModal()">Join Now</a>
        </div>
      </div>`;

      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${injectedAssets}`);
      } else {
        html = injectedAssets + html;
      }

      if (html.includes('</body>')) {
        html = html.replace('</body>', `${newPopupHTML}</body>`);
      } else {
        html = html + newPopupHTML;
      }

      return new Response(html, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    if (contentType.includes('javascript') || contentType.includes('json')) {
      let text = await response.text();
      text = text.replaceAll('https://vidcloud.eu.org', currentDomain);
      text = text.replaceAll('vidcloud.eu.org', url.host);
      text = text.replaceAll(oldLogo, newLogo);
      text = text.replaceAll('/images/logo.png', newLogo);

      return new Response(text, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });

  } catch (error) {
    return new Response('Proxy Error: ' + error.message, { status: 500 });
  }
}
