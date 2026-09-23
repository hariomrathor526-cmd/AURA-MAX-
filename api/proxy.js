export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  
  // Original target website link
  const targetUrl = 'https://vidcloud.eu.org' + url.pathname + url.search;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        // Host header badalna zaroori h taki original site proxy request reject na kare
        'host': 'vidcloud.eu.org',
        'referer': 'https://vidcloud.eu.org/',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : null,
    });

    const contentType = response.headers.get('content-type') || '';

    // Agar response HTML page hai toh Title aur Logo modify karein
    if (contentType.includes('text/html')) {
      let html = await response.text();

      // 1. Web Page Title Change Karein
      html = html.replace(/<title>.*?<\/title>/gi, '<title>Mera Brand Name</title>');

      // 2. Original Logo URL ko Apne Naye Logo URL se Replace Karein
      // (Pura link ya relative path replace karein)
      html = html.replace(/src=["'].*?logo.*?["']/gi, 'src="https://i.imgur.com/your-new-logo.png"');

      // 3. Page Header/Text Replacement (Optional)
      html = html.replace(/Study Stark/gi, 'Mera Brand Name');
      html = html.replace(/VidCloud/gi, 'Mera Brand Name');

      return new Response(html, {
        status: response.status,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'access-control-allow-origin': '*',
        },
      });
    }

    // Baaki sabhi requests (CSS, JS, Images, API) ko directly serve karein
    return response;

  } catch (error) {
    return new Response('Proxy Error: ' + error.message, { status: 500 });
  }
}
