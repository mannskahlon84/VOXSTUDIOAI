const https = require('https');

const fetchRequest = (url, options = {}, timeoutMs = 8000) => {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: timeoutMs
      };

      const req = https.request(reqOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              body: data
            });
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request Timeout'));
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
};

exports.handler = async (event, context) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { action, payload, jobId } = JSON.parse(event.body);
    const apiKey = "afk_998ddc348f9956a7a3da4e2393876bcbea703898";

    if (action === 'generate') {
      const url = "https://api.apiframe.ai/v2/music/generate";
      const response = await fetchRequest(url, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      return {
        statusCode: response.status,
        headers,
        body: response.body
      };
    } else if (action === 'poll') {
      const url = `https://api.apiframe.ai/v2/jobs/${jobId}`;
      const response = await fetchRequest(url, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey
        }
      });

      return {
        statusCode: response.status,
        headers,
        body: response.body
      };
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid Action' })
      };
    }
  } catch (error) {
    console.error('Suno Function Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' })
    };
  }
};
