import React, { useState, useMemo } from 'react';
import { Download, Globe, Sparkles, AlertCircle, RefreshCw, FolderPlus } from 'lucide-react';
import { translations } from '../assets/translations';

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

const INVIDIOUS_INSTANCES = [
  'https://invidious.projectsegfau.lt',
  'https://invidious.privacydev.net',
  'https://invidious.lunar.icu',
  'https://invidious.io.lol',
  'https://iv.melmac.space',
  'https://invidious.flokinet.to',
  'https://yewtu.be',
  'https://invidious.nerdvpn.de',
  'https://invidious.namazso.eu',
  'https://inv.tux.im',
  'https://invidious.slipfox.xyz',
  'https://invidious.nohost.me'
];

const getYoutubeId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const formatDuration = (sec) => {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const LinkDownloader = ({ language, theme, activeProject, onAddProjectAsset, onUpdateProjectState }) => {
  const t = translations[language] || translations.en;

  const [targetUrl, setTargetUrl] = useState('');
  const [mediaFormat, setMediaFormat] = useState('video'); // 'video', 'audio'
  const [vQuality, setVQuality] = useState('1080'); // '1080', '720', '480'
  const [aFormat, setAFormat] = useState('mp3'); // 'mp3', 'ogg'
  const [customServerUrl, setCustomServerUrl] = useState('');
  
  const [isFetching, setIsFetching] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState('');
  const [downloadResult, setDownloadResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const detectedPlatform = useMemo(() => {
    if (!targetUrl) return null;
    const cleanUrl = targetUrl.toLowerCase().trim();
    if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      if (cleanUrl.includes('/shorts/')) {
        return { label: 'YouTube Short', type: 'youtube_short', icon: '⚡' };
      }
      return { label: 'YouTube Video', type: 'youtube_video', icon: '🎥' };
    }
    if (cleanUrl.includes('instagram.com')) {
      if (cleanUrl.includes('/reel/')) {
        return { label: 'Instagram Reel', type: 'instagram_reel', icon: '📸' };
      }
      return { label: 'Instagram Post/Story', type: 'instagram_post', icon: '📸' };
    }
    if (cleanUrl.includes('tiktok.com')) {
      return { label: 'TikTok Video', type: 'tiktok_video', icon: '🎵' };
    }
    if (cleanUrl.includes('facebook.com') || cleanUrl.includes('fb.watch')) {
      return { label: 'Facebook Video', type: 'facebook_video', icon: '👥' };
    }
    if (cleanUrl.includes('twitter.com') || cleanUrl.includes('x.com')) {
      return { label: 'Twitter/X Video', type: 'twitter_video', icon: '🐦' };
    }
    if (cleanUrl.includes('soundcloud.com')) {
      return { label: 'SoundCloud Audio', type: 'soundcloud_audio', icon: '☁️' };
    }
    return { label: 'Web Link', type: 'generic', icon: '🔗' };
  }, [targetUrl]);

  const handleFetchMedia = async () => {
    if (!targetUrl.trim()) {
      alert("Please paste a valid social media link.");
      return;
    }

    setIsFetching(true);
    setDownloadResult(null);
    setErrorMsg('');

    // Step 1: Attempt extraction via Netlify serverless backend proxy (zero CORS restrictions)
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const serverlessUrl = isLocal
      ? 'https://voxstudioai.netlify.app/.netlify/functions/download'
      : '/.netlify/functions/download';

    let serverlessSuccess = false;

    try {
      setFetchingStatus("Extracting via backend serverless proxy...");
      const response = await fetch(serverlessUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: targetUrl.trim(),
          isAudioOnly: mediaFormat === 'audio',
          audioFormat: mediaFormat === 'audio' ? aFormat : undefined,
          vQuality: mediaFormat === 'video' ? vQuality : undefined
        })
      });

      if (response.ok) {
        const res = await response.json();
        const ytId = getYoutubeId(targetUrl.trim());
        if (res.status === 'stream' || res.status === 'redirect') {
          setDownloadResult({
            url: res.url,
            filename: res.filename || `extracted_media_${Date.now()}.${mediaFormat === 'audio' ? aFormat : 'mp4'}`,
            title: res.title || 'Extracted Media',
            thumbnail: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : (res.thumbnail || null),
            duration: res.duration ? formatDuration(res.duration) : null
          });
          serverlessSuccess = true;
        } else if (res.status === 'picker') {
          if (res.picker && res.picker.length > 0) {
            setDownloadResult({
              url: res.picker[0].url,
              filename: `extracted_media_${Date.now()}.${mediaFormat === 'audio' ? aFormat : 'mp4'}`,
              title: 'Extracted Multi-stream Media',
              thumbnail: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null,
              duration: null
            });
            serverlessSuccess = true;
          }
        }
      }
    } catch (err) {
      console.warn("Backend proxy failed, falling back to client-side extraction...", err.message);
    }

    if (serverlessSuccess) {
      setIsFetching(false);
      setFetchingStatus('');
      return;
    }

    // Step 2: Client-side extraction fallback (for native Capacitor app / offline)

    // Primary YouTube Extraction Engine via Invidious instances
    const videoId = getYoutubeId(targetUrl.trim());
    if (videoId) {
      setFetchingStatus("Extracting YouTube streams via Invidious nodes...");
      let ytSuccess = false;
      let ytLastError = '';

      for (let i = 0; i < INVIDIOUS_INSTANCES.length; i++) {
        const instance = INVIDIOUS_INSTANCES[i];
        setFetchingStatus(`Trying YouTube node ${i + 1}/${INVIDIOUS_INSTANCES.length}: ${instance.replace('https://', '')}...`);
        
        try {
          const targetApiUrl = `${instance}/api/v1/videos/${videoId}`;
          let response;

          try {
            // Try direct fetch first (Invidious instances usually allow CORS natively)
            response = await fetch(targetApiUrl);
            if (!response.ok) {
              throw new Error(`Invidious node returned non-OK status: ${response.status}`);
            }
          } catch (directErr) {
            console.warn(`Direct Invidious fetch failed for ${instance}, trying via corsproxy.io...`);
            try {
              const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(targetApiUrl)}`;
              response = await fetch(proxiedUrl);
              if (!response.ok) {
                throw new Error(`corsproxy.io returned status: ${response.status}`);
              }
            } catch (proxyErr) {
              console.warn(`corsproxy.io failed, trying via allorigins...`);
              const altProxiedUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetApiUrl)}`;
              response = await fetch(altProxiedUrl);
              if (!response.ok) {
                throw new Error(`AllOrigins returned status: ${response.status}`);
              }
            }
          }
          
          const data = await response.json();
          if (data && data.title) {
            let downloadUrl = '';
            if (mediaFormat === 'audio') {
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

            // Resolve relative paths if returned
            if (downloadUrl.startsWith('/')) {
              downloadUrl = `${instance}${downloadUrl}`;
            }

            // Route through Invidious local streaming proxy to prevent googlevideo CDN CORS locks
            if (downloadUrl.includes('googlevideo.com')) {
              const urlObj = new URL(downloadUrl);
              const itag = urlObj.searchParams.get('itag') || (mediaFormat === 'audio' ? '140' : '22');
              downloadUrl = `${instance}/latest_version?id=${videoId}&itag=${itag}&local=true`;
            }

            setDownloadResult({
              url: downloadUrl,
              filename: `${data.title.replace(/[^a-zA-Z0-9]/g, '_')}.${mediaFormat === 'audio' ? 'mp3' : 'mp4'}`,
              title: data.title,
              thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
              duration: formatDuration(data.lengthSeconds)
            });
            ytSuccess = true;
            break;
          }
        } catch (err) {
          console.warn(`Invidious node ${instance} failed:`, err.message);
          ytLastError = err.message || "Unknown error";
        }
      }

      if (ytSuccess) {
        setIsFetching(false);
        setFetchingStatus('');
        return;
      }
      console.warn("Invidious extraction failed. Falling back to Cobalt...");
    }

    const serversToTry = customServerUrl.trim()
      ? [customServerUrl.trim().replace(/\/$/, '')]
      : COBALT_INSTANCES;

    let success = false;
    let lastError = '';

    for (let i = 0; i < serversToTry.length; i++) {
      const serverUrl = serversToTry[i];
      setFetchingStatus(`Extracting via node ${i + 1}/${serversToTry.length}: ${serverUrl.replace('https://', '')}...`);
      
      try {
        let response;
        const requestBody = JSON.stringify({
          url: targetUrl.trim(),
          isAudioOnly: mediaFormat === 'audio',
          audioFormat: mediaFormat === 'audio' ? aFormat : undefined,
          vQuality: mediaFormat === 'video' ? vQuality : undefined
        });

        try {
          // Attempt direct fetch first
          response = await fetch(`${serverUrl}/api/json`, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: requestBody
          });
          if (!response.ok) {
            throw new Error(`Direct response non-OK status: ${response.status}`);
          }
        } catch (directErr) {
          console.warn(`Direct fetch failed or blocked for ${serverUrl}, trying via corsproxy.io...`);
          try {
            // Fallback to corsproxy.io
            const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(serverUrl + '/api/json')}`;
            response = await fetch(proxiedUrl, {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              body: requestBody
            });
            if (!response.ok) {
              throw new Error(`Proxy HTTP error ${response.status}`);
            }
          } catch (proxyErr) {
            console.warn(`corsproxy.io failed, trying alternative proxy cors.lol...`);
            // Secondary fallback to cors.lol
            try {
              const altProxiedUrl = `https://cors.lol/?${encodeURIComponent(serverUrl + '/api/json')}`;
              response = await fetch(altProxiedUrl, {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                },
                body: requestBody
              });
              if (!response.ok) {
                throw new Error(`Secondary proxy HTTP error ${response.status}`);
              }
            } catch (altProxyErr) {
              throw new Error("All public CORS proxies returned error results.");
            }
          }
        }

        const res = await response.json();
        
        if (res.status === 'stream' || res.status === 'redirect') {
          const ytId = getYoutubeId(targetUrl.trim());
          setDownloadResult({
            url: res.url,
            filename: res.filename || `extracted_media_${Date.now()}.${mediaFormat === 'audio' ? aFormat : 'mp4'}`,
            title: res.filename ? res.filename.split('.').slice(0, -1).join('.') : 'Extracted Media Video',
            thumbnail: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null,
            duration: null
          });
          success = true;
          break;
        } else if (res.status === 'picker') {
          if (res.picker && res.picker.length > 0) {
            const ytId = getYoutubeId(targetUrl.trim());
            setDownloadResult({
              url: res.picker[0].url,
              filename: `extracted_media_${Date.now()}.${mediaFormat === 'audio' ? aFormat : 'mp4'}`,
              title: 'Extracted Multi-stream Media',
              thumbnail: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null,
              duration: null
            });
            success = true;
            break;
          } else {
            throw new Error("No download streams found in the picker list.");
          }
        } else if (res.status === 'error') {
          throw new Error(res.error || "Cobalt API returned an extraction error.");
        } else {
          throw new Error("Unexpected extraction response status.");
        }
      } catch (err) {
        console.warn(`Extraction via ${serverUrl} failed:`, err.message);
        lastError = err.message || "Unknown error";
      }
    }

    if (!success) {
      setErrorMsg(`Failed to extract media: ${lastError}. All community downloader servers are currently rate-limited or down. Please try again or type a custom API server below.`);
    }
    setIsFetching(false);
    setFetchingStatus('');
  };

  const handleImportToProject = async () => {
    if (!downloadResult || !activeProject || !onAddProjectAsset) return;
    
    setIsFetching(true);
    setFetchingStatus("Downloading file to project memory... please wait...");
    try {
      const response = await fetch(downloadResult.url);
      const blob = await response.blob();
      const ext = mediaFormat === 'audio' ? aFormat : 'mp4';
      const assetName = downloadResult.filename || `download_${Date.now()}.${ext}`;
      await onAddProjectAsset(assetName, mediaFormat, blob);
      
      // Update project state for instant mapping
      if (mediaFormat === 'audio') {
        onUpdateProjectState({ bgMusicUrl: URL.createObjectURL(blob) }, `Imported downloaded audio track: ${assetName}`);
      } else {
        onUpdateProjectState({ videoUrl: URL.createObjectURL(blob), mediaType: 'video' }, `Imported downloaded video track: ${assetName}`);
      }
      
      alert(`Successfully imported "${assetName}" into project assets library!`);
    } catch (err) {
      console.error(err);
      alert("Failed to import asset. Secure browser policy may prevent direct client-side download of this file. Please click the direct download link instead.");
    } finally {
      setIsFetching(false);
      setFetchingStatus('');
    }
  };

  const handleDownloadFile = async (e) => {
    e.preventDefault();
    if (!downloadResult || !downloadResult.url) return;

    const originalHTML = e.currentTarget.innerHTML;
    e.currentTarget.innerHTML = "<span>⏳ Processing...</span>";
    e.currentTarget.style.pointerEvents = "none";
    e.currentTarget.style.opacity = "0.7";

    try {
      const response = await fetch(downloadResult.url);
      if (!response.ok) throw new Error("CORS or network error fetching file stream");
      const blob = await response.blob();
      const localUrl = URL.createObjectURL(blob);
      
      const tempLink = document.createElement('a');
      tempLink.href = localUrl;
      tempLink.download = downloadResult.filename || 'downloaded_media';
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      URL.revokeObjectURL(localUrl);
    } catch (err) {
      console.warn("Direct blob download failed, opening in new tab fallback:", err);
      window.open(downloadResult.url, '_blank');
    } finally {
      e.currentTarget.innerHTML = originalHTML;
      e.currentTarget.style.pointerEvents = "auto";
      e.currentTarget.style.opacity = "1";
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }} className="glass-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
        <Download size={24} style={{ color: 'var(--accent-primary)' }} />
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }} className="gradient-text">
            YouTube Audio & Video Downloader
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
            Paste YouTube, Instagram, TikTok, Twitter, or SoundCloud links to download high-quality MP3/MP4 files.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        {/* URL Input Box */}
        <div>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
            Paste Target Link (Video or Audio URL)
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="e.g. https://www.youtube.com/watch?v=... or TikTok/Instagram links"
              className="form-input"
              style={{ flex: 1, fontSize: '0.85rem' }}
              disabled={isFetching}
            />
            {targetUrl && (
              <button
                onClick={() => setTargetUrl('')}
                className="btn-secondary"
                style={{ padding: '0.45rem 0.8rem', fontSize: '0.75rem' }}
              >
                Clear
              </button>
            )}
          </div>
          {detectedPlatform && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '6px',
              padding: '2px 8px',
              borderRadius: '20px',
              background: 'var(--accent-glow)',
              border: '1px solid var(--accent-primary)',
              fontSize: '0.68rem',
              fontWeight: 700,
              color: 'var(--accent-primary)',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <span>{detectedPlatform.icon} Detected: {detectedPlatform.label}</span>
            </div>
          )}
        </div>

        {/* Format Selectors Toggle */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'video', label: '🎥 Download Video (MP4)' },
            { id: 'audio', label: '🎵 Download Audio (MP3)' }
          ].map(format => (
            <button
              key={format.id}
              onClick={() => setMediaFormat(format.id)}
              className="btn-secondary"
              style={{
                flex: 1,
                fontSize: '0.8rem',
                padding: '0.55rem',
                background: mediaFormat === format.id ? 'var(--bg-secondary)' : 'transparent',
                borderColor: mediaFormat === format.id ? 'var(--accent-primary)' : 'var(--border-color)',
                color: mediaFormat === format.id ? 'var(--text-primary)' : 'var(--text-secondary)'
              }}
            >
              {format.label}
            </button>
          ))}
        </div>

        {/* Quality Config cards */}
        <div className="glass-panel" style={{ padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h4 style={{ fontSize: '0.85rem', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
            Quality Settings
          </h4>

          {mediaFormat === 'video' ? (
            <div>
              <label style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                Video Resolution
              </label>
              <select
                value={vQuality}
                onChange={(e) => setVQuality(e.target.value)}
                className="form-select"
                style={{ fontSize: '0.8rem', padding: '0.4rem' }}
              >
                <option value="1080">📺 1080p Full HD (Highest Quality)</option>
                <option value="720">📺 720p HD (Standard)</option>
                <option value="480">📱 480p SD (Mobile Optimized)</option>
              </select>
            </div>
          ) : (
            <div>
              <label style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                Audio Format
              </label>
              <select
                value={aFormat}
                onChange={(e) => setAFormat(e.target.value)}
                className="form-select"
                style={{ fontSize: '0.8rem', padding: '0.4rem' }}
              >
                <option value="mp3">🎧 High-Quality MP3 (320kbps)</option>
                <option value="ogg">🎧 Open-Source OGG Vorbis</option>
              </select>
            </div>
          )}

          <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
            <label style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
              🔧 Custom API Server (Optional Fallback)
            </label>
            <input
              type="text"
              value={customServerUrl}
              onChange={(e) => setCustomServerUrl(e.target.value)}
              placeholder="e.g. https://api.cobalt.tools (leave empty for auto-balance)"
              className="form-input"
              style={{ fontSize: '0.75rem', padding: '0.35rem' }}
            />
          </div>
        </div>

        {/* Extraction trigger button */}
        <button
          onClick={handleFetchMedia}
          disabled={isFetching}
          className="btn-primary"
          style={{ justifyContent: 'center', padding: '0.65rem', fontWeight: 700 }}
        >
          {isFetching ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={14} className="spin" />
              {fetchingStatus || 'Extracting streams...'}
            </span>
          ) : (
            `⚡ Extract ${detectedPlatform ? detectedPlatform.label : 'Media Link'}`
          )}
        </button>

        {/* Extraction Error Display */}
        {errorMsg && (
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '6px',
            padding: '0.65rem',
            color: '#f87171',
            fontSize: '0.78rem'
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Extraction Result Showcase Card */}
        {downloadResult && (
          <div className="glass-panel" style={{
            padding: '1.25rem',
            border: '1px solid var(--accent-primary)',
            background: 'var(--accent-glow)',
            borderRadius: '12px',
            display: 'flex',
            gap: '1.25rem',
            alignItems: 'center',
            marginTop: '0.8rem',
            flexWrap: 'wrap'
          }}>
            {/* Thumbnail */}
            {downloadResult.thumbnail ? (
              <div style={{ position: 'relative', width: '140px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', aspectRatio: '16/9' }}>
                <img 
                  src={downloadResult.thumbnail} 
                  alt="Video Thumbnail" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                {downloadResult.duration && (
                  <span style={{
                    position: 'absolute',
                    bottom: '4px',
                    right: '4px',
                    background: 'rgba(0, 0, 0, 0.75)',
                    color: '#fff',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    fontWeight: 700
                  }}>
                    {downloadResult.duration}
                  </span>
                )}
              </div>
            ) : (
              <div style={{
                width: '140px',
                aspectRatio: '16/9',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)'
              }}>
                <Globe size={32} />
              </div>
            )}

            {/* Details & Action Panel */}
            <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.5px' }}>
                  ✓ READY TO DOWNLOAD
                </span>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3, wordBreak: 'break-word' }}>
                  {downloadResult.title}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {/* Download Button */}
                <a
                  href={downloadResult.url}
                  onClick={handleDownloadFile}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                  style={{
                    flex: 1,
                    textDecoration: 'none',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    padding: '0.6rem 1rem',
                    color: '#fff',
                    gap: '6px'
                  }}
                >
                  <Download size={15} /> 
                  Download {mediaFormat === 'audio' ? `MP3 (${aFormat.toUpperCase()})` : `MP4 (${vQuality}p)`}
                </a>

                {/* Import to Project Button */}
                {activeProject && (
                  <button
                    onClick={handleImportToProject}
                    className="btn-secondary"
                    style={{
                      fontSize: '0.8rem',
                      padding: '0.6rem 1rem',
                      borderColor: 'var(--accent-primary)',
                      color: 'var(--text-primary)',
                      gap: '6px'
                    }}
                  >
                    <FolderPlus size={15} /> Import
                  </button>
                )}
              </div>

              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                If download opens in a new tab instead of saving, right-click the button and select <strong>"Save Link As"</strong>.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkDownloader;
