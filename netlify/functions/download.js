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

    // Try Invidious first if it is a YouTube link to maximize stability
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

        for (const instance of INVIDIOUS_INSTANCES) {
          try {
            const targetApiUrl = `${instance}/api/v1/videos/${videoId}`;
            const response = await fetch(targetApiUrl);
            if (!response.ok) continue;

            const data = await response.json();
            if (data && data.title) {
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
                  title: data.title
                })
              };
            }
          } catch (err) {
            console.warn(`Invidious serverless extraction failed for ${instance}:`, err.message);
          }
        }
      }
    }

    // Fallback to Cobalt instances
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

    let lastError = '';
    for (const serverUrl of COBALT_INSTANCES) {
      try {
        const response = await fetch(`${serverUrl}/api/json`, {
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
        });

        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status} from ${serverUrl}`);
        }

        const resData = await response.json();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(resData)
        };
      } catch (err) {
        console.warn(`Cobalt serverless extraction failed for ${serverUrl}:`, err.message);
        lastError = err.message;
      }
    }

    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: `All extraction nodes failed. Last error: ${lastError}` })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
