export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const targetUrl = 'https://vidcloud.eu.org' + url.pathname + url.search;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'host': 'vidcloud.eu.org',
        'referer': 'https://vidcloud.eu.org/',
        'user-agent': req.headers.get('user-agent') || '',
      },
    });

    const contentType = response.headers.get('content-type') || '';

    // 1. Agar HTML / JS response hai toh Domain aur URLs replace karein
    if (contentType.includes('text/html') || contentType.includes('application/javascript')) {
      let content = await response.text();

      // Sabhi Hardcoded API Calls ko Aapke Vercel Domain Par Redirect Karein
      content = content.replace(/https:\/\/vidcloud\.eu\.org/g, 'https://apnaweb-eta.vercel.app');

      // Branding & Name Replacement
      content = content.replace(/Study Stark/gi, 'AURA MAX');
      content = content.replace(/VidCloud/gi, 'AURA MAX');

      return new Response(content, {
        status: response.status,
        headers: {
          'content-type': contentType,
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'access-control-allow-headers': '*',
        },
      });
    }

    // 2. CORS Handling for API Requests (Jab options ya JSON fetch hoga)
    const newHeaders = new Headers(response.headers);
    newHeaders.set('access-control-allow-origin', '*');
    newHeaders.set('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newHeaders.set('access-control-allow-headers', '*');

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });

  } catch (error) {
    return new Response('Proxy Error: ' + error.message, { status: 500 });
  }
}
