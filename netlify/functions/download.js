const https = require('https');

const fetchWithTimeout = (url, options = {}, timeoutMs = 3500) => {
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
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: async () => JSON.parse(data),
            text: async () => data
          });
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

// Node-compatible Promise.any Polyfill
const promiseAny = (promises) => {
  return new Promise((resolve, reject) => {
    let rejectedCount = 0;
    const errors = [];
    if (promises.length === 0) {
      reject(new Error("Empty promise array"));
      return;
    }
    promises.forEach((p, index) => {
      Promise.resolve(p)
        .then(resolve)
        .catch((err) => {
          rejectedCount++;
          errors[index] = err;
          if (rejectedCount === promises.length) {
            reject(new Error("All promises rejected: " + errors.map(e => e.message).join(', ')));
          }
        });
    });
  });
};

exports.handler = async function(event, context) {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { url, isAudioOnly, audioFormat, vQuality } = body;

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing target URL' })
      };
    }

    // Cobalt Instances Pool
    const COBALT_INSTANCES = [
      'https://api.cobalt.tools',
      'https://cobalt.meowing.de',
      'https://api.cobalt.meowing.de',
      'https://cobalt.canine.tools',
      'https://api.cobalt.canine.tools',
      'https://cobalt.chubby.host',
      'https://api.cobalt.chubby.host',
      'https://cobalt.fox-host.ru',
      'https://cobalt.audiostretch.io',
      'https://cobalt.projecty.xyz'
    ];

    const fetchFromCobalt = async (serverUrl) => {
      const response = await fetchWithTimeout(`${serverUrl}/api/json`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          isAudioOnly: !!isAudioOnly,
          audioFormat: isAudioOnly ? (audioFormat || 'mp3') : undefined,
          vQuality: !isAudioOnly ? (vQuality || '1080') : undefined
        })
      }, 5000); // 5 seconds timeout

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status} from ${serverUrl}`);
      }

      const resData = await response.json();
      if (!resData || resData.status === 'error') {
        throw new Error(resData.error || "Cobalt node error status");
      }
      return resData;
    };

    // Step 1: Query Cobalt first on the backend (gives high-quality direct links and native mp3 conversion)
    let cobaltResult = null;
    const cobaltBatch1 = COBALT_INSTANCES.slice(0, 4);
    try {
      cobaltResult = await promiseAny(cobaltBatch1.map(fetchFromCobalt));
    } catch (err1) {
      const cobaltBatch2 = COBALT_INSTANCES.slice(4, 8);
      try {
        cobaltResult = await promiseAny(cobaltBatch2.map(fetchFromCobalt));
      } catch (err2) {
        const cobaltBatch3 = COBALT_INSTANCES.slice(8);
        try {
          cobaltResult = await promiseAny(cobaltBatch3.map(fetchFromCobalt));
        } catch (err3) {
          console.warn("All Cobalt instances returned errors. Falling back to Invidious...");
        }
      }
    }

    if (cobaltResult) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(cobaltResult)
      };
    }

    // Step 2: Fallback to Invidious instances ONLY if it is a YouTube link and Cobalt failed
    const isYoutube = /youtube\.com|youtu\.be/.test(url);
    if (isYoutube) {
      const getYoutubeId = (u) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = u.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
      };

      const videoId = getYoutubeId(url);
      if (videoId) {
        const INVIDIOUS_INSTANCES = [
          'https://invidious.projectsegfau.lt',
          'https://invidious.privacydev.net',
          'https://invidious.lunar.icu',
          'https://invidious.io.lol',
          'https://iv.melmac.space',
          'https://invidious.flokinet.to',
          'https://yewtu.be',
          'https://invidious.nerdvpn.de',
          'https://invidious.namazso.eu'
        ];

        const fetchFromInvidious = async (instance) => {
          const targetApiUrl = `${instance}/api/v1/videos/${videoId}`;
          const response = await fetchWithTimeout(targetApiUrl, {}, 3500); // 3.5 seconds timeout
          if (!response.ok) {
            throw new Error(`Instance returned status ${response.status}`);
          }
          const data = await response.json();
          if (!data || !data.title) {
            throw new Error(`Instance returned invalid data structure`);
          }
          return { instance, data };
        };

        let successResult = null;
        const batch1 = INVIDIOUS_INSTANCES.slice(0, 4);
        try {
          successResult = await promiseAny(batch1.map(fetchFromInvidious));
        } catch (err1) {
          const batch2 = INVIDIOUS_INSTANCES.slice(4, 8);
          try {
            successResult = await promiseAny(batch2.map(fetchFromInvidious));
          } catch (err2) {
            try {
              successResult = await fetchFromInvidious(INVIDIOUS_INSTANCES[8]);
            } catch (err3) {
              console.warn("All parallel Invidious extractions failed.");
            }
          }
        }

        if (successResult) {
          const { instance, data } = successResult;
          let downloadUrl = '';
          if (isAudioOnly) {
            const audioStreams = data.adaptiveFormats || [];
            const bestAudio = audioStreams
              .filter(f => f.type && f.type.includes('audio'))
              .sort((a, b) => parseInt(b.bitrate || 0) - parseInt(a.bitrate || 0))[0];
            
            if (bestAudio && bestAudio.url) {
              downloadUrl = bestAudio.url;
            } else {
              downloadUrl = `/latest_version?id=${videoId}&itag=140&local=true`;
            }
          } else {
            const videoStreams = data.formatStreams || [];
            const bestVideo = videoStreams.find(f => f.qualityLabel === '720p') || videoStreams[0];
            if (bestVideo && bestVideo.url) {
              downloadUrl = bestVideo.url;
            } else {
              downloadUrl = `/latest_version?id=${videoId}&itag=22&local=true`;
            }
          }

          if (downloadUrl.startsWith('/')) {
            downloadUrl = `${instance}${downloadUrl}`;
          }

          if (downloadUrl.includes('googlevideo.com')) {
            const urlObj = new URL(downloadUrl);
            const itag = urlObj.searchParams.get('itag') || (isAudioOnly ? '140' : '22');
            downloadUrl = `${instance}/latest_version?id=${videoId}&itag=${itag}&local=true`;
          }

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              status: 'stream',
              url: downloadUrl,
              filename: `${data.title.replace(/[^a-zA-Z0-9]/g, '_')}.${isAudioOnly ? 'mp3' : 'mp4'}`,
              title: data.title,
              duration: data.lengthSeconds
            })
          };
        }
      }
    }

    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: `All extraction nodes failed.` })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
