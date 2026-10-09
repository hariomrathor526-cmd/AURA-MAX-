export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const currentDomain = url.origin; 
  const targetDomain = 'https://vidcloud.eu.org';

  const oldLogo = 'https://vidcloud.eu.org/images/logo.png';
  const newLogo = 'https://cdn.phototourl.com/member/2026-10-02-62a99f01-301c-41f1-9584-0fd12ae4b326.jpg';

  // 1. Preflight CORS
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

  // 2. Stream Bypass Check (Direct Stream Handling for 403 URLs)
  const isStreamRequest = url.pathname.includes('.m3u8') || 
                          url.pathname.includes('.ts') || 
                          url.pathname.includes('.key') || 
                          url.pathname.includes('xml') || 
                          url.pathname.length > 30; // Matches obfuscated token URLs like 0e115d...

  const targetUrl = targetDomain + url.pathname + url.search;

  const forwardHeaders = new Headers();
  forwardHeaders.set('User-Agent', req.headers.get('user-agent') || 'Mozilla/5.0');
  forwardHeaders.set('Accept', '*/*');
  forwardHeaders.set('Referer', 'https://vidcloud.eu.org/');
  forwardHeaders.set('Origin', 'https://vidcloud.eu.org');

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : null,
    });

    // Handle Direct Media & 403-prone Streams directly
    if (isStreamRequest) {
      const mediaHeaders = new Headers(response.headers);
      mediaHeaders.set('Access-Control-Allow-Origin', '*');
      mediaHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      mediaHeaders.set('Access-Control-Allow-Headers', '*');
      
      // If server returned text/m3u8, rewrite target domains inside M3U8
      if (response.headers.get('content-type')?.includes('mpegurl') || url.pathname.endsWith('.m3u8')) {
        let m3u8Text = await response.text();
        m3u8Text = m3u8Text.replaceAll('https://vidcloud.eu.org', currentDomain);
        return new Response(m3u8Text, {
          status: response.status,
          headers: mediaHeaders
        });
      }

      return new Response(response.body, {
        status: response.status,
        headers: mediaHeaders,
      });
    }

    const contentType = response.headers.get('content-type') || '';

    // 3. HTML Interception
    if (contentType.includes('text/html')) {
      let html = await response.text();

      const injectedAssets = `
      <style>
        #join-tg-popup-container, [id*="join-tg-popup"] { display: none !important; }
        .btn-top-action[href*="telegram.me"], .btn-top-action[href*="t.me"], .btn-top-action[href*="whatsapp.com"] { display: none !important; }
        .custom-menu-wrapper { position: relative; display: inline-block; }
        .custom-menu-trigger { background: #ffffff; border: 1px solid #e2e8f0; color: #5b42f3; padding: 8px 14px; border-radius: 12px; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center; outline: none; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
        .custom-dropdown-content { display: none; position: absolute; right: 0; top: 115%; background: #ffffff; border: 1px solid #e2e8f0; min-width: 200px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-radius: 16px; z-index: 999999; padding: 8px; flex-direction: column; gap: 6px; }
        .custom-dropdown-content.show { display: flex !important; }
        .custom-dropdown-content .header-btn { width: 100% !important; justify-content: flex-start !important; padding: 10px 14px !important; border-radius: 10px !important; background: #f8fafc !important; border: 1px solid #edf2f7 !important; color: #2d3748 !important; font-size: 14px !important; font-weight: 500 !important; gap: 12px !important; box-shadow: none !important; }
        .custom-dropdown-content .header-btn:hover { background: #f1f5f9 !important; color: #5b42f3 !important; }
        .custom-menu-tg-btn { display: flex; align-items: center; gap: 10px; background: #0088cc; color: #ffffff !important; text-decoration: none; padding: 10px 14px; border-radius: 10px; font-size: 14px; font-weight: 600; }
        .sr-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.4); display: flex; align-items: center; justify-content: center; z-index: 9999999 !important; backdrop-filter: blur(2px); }
        #srPopup { background: #ffffff; width: 88%; max-width: 380px; border-radius: 28px; padding: 35px 24px 28px 24px; text-align: center; position: relative; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15); font-family: sans-serif; box-sizing: border-box; }
        #srClose { position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; background: #f2f2f4; border: none; border-radius: 50%; font-size: 16px; color: #333333; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10; }
        #srIcon { width: 70px; height: 70px; background: #f6f6f8; border-radius: 50%; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center; font-size: 32px; }
        #srTitle { font-size: 22px; font-weight: 700; color: #000000; margin-bottom: 10px; }
        #srSub { font-size: 14px; color: #666666; line-height: 1.4; margin-bottom: 26px; }
        #srBtn { display: block; width: 100%; background: #5b42f3; color: #ffffff; text-decoration: none; padding: 14px 0; border-radius: 16px; font-size: 16px; font-weight: 600; box-sizing: border-box; }
      </style>
      <script>
        function closeSrModal() {
          var el = document.getElementById('srOverlay');
          if (el) el.remove();
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
              if (updated !== node.nodeValue) node.nodeValue = updated;
            }
          }
        }

        function replaceImages() {
          document.querySelectorAll('img').forEach(function(img) {
            if (img.src && img.src.includes('images/logo.png')) {
              img.src = "${newLogo}";
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

          const dropdownContent = document.createElement('div');
          dropdownContent.className = 'custom-dropdown-content';

          Array.from(controls.children).forEach(btn => {
            if (btn.title) btn.innerHTML += ' <span>' + btn.title + '</span>';
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

          menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownContent.classList.toggle('show');
          });

          document.addEventListener('click', () => dropdownContent.classList.remove('show'));
        }

        document.addEventListener('DOMContentLoaded', function() {
          replaceDOMText();
          replaceImages();
          organizeHeaderControls();

          const observer = new MutationObserver(() => {
            replaceDOMText();
            replaceImages();
            organizeHeaderControls();
          });
          observer.observe(document.body, { childList: true, subtree: true });
        });
      </script>
      </head>`;

      const newPopupHTML = `
      <div id="srOverlay" class="sr-overlay">
        <div id="srPopup">
          <div id="srClose" onclick="closeSrModal()">✕</div>
          <div id="srIcon">📢</div>
          <div id="srTitle">Join Our Community</div>
          <div id="srSub">Stay updated with latest material<br>and notifications</div>
          <a href="https://t.me/+poV8mzcMG4dkY2Vl" target="_blank" id="srBtn" onclick="closeSrModal()">Join Now</a>
        </div>
      </div>
      </body>`;

      html = html.replace('</head>', injectedAssets);
      html = html.replace('</body>', newPopupHTML);

      html = html.replaceAll(oldLogo, newLogo);
      html = html.replaceAll('/images/logo.png', newLogo);
      html = html.replaceAll('https://vidcloud.eu.org', currentDomain);
      html = html.replaceAll('vidcloud.eu.org', url.host);

      return new Response(html, {
        status: response.status,
        headers: { 'content-type': 'text/html; charset=utf-8', 'access-control-allow-origin': '*' },
      });
    }

    // 4. JS & JSON
    if (contentType.includes('javascript') || contentType.includes('json')) {
      let text = await response.text();
      text = text.replaceAll(oldLogo, newLogo);
      text = text.replaceAll('/images/logo.png', newLogo);
      text = text.replaceAll('https://vidcloud.eu.org', currentDomain);
      text = text.replaceAll('vidcloud.eu.org', url.host);

      return new Response(text, {
        status: response.status,
        headers: { 'content-type': contentType, 'access-control-allow-origin': '*' },
      });
    }

    // Default return
    const modifiedHeaders = new Headers(response.headers);
    modifiedHeaders.set('Access-Control-Allow-Origin', '*');
    return new Response(response.body, { status: response.status, headers: modifiedHeaders });

  } catch (error) {
    return new Response('Proxy Error: ' + error.message, { status: 500 });
  }
}
