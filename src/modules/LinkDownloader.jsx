import React, { useState } from 'react';
import { Download, Globe, Sparkles, AlertCircle, RefreshCw, FolderPlus } from 'lucide-react';
import { translations } from '../assets/translations';

const LinkDownloader = ({ language, theme, activeProject, onAddProjectAsset, onUpdateProjectState }) => {
  const t = translations[language] || translations.en;

  const [targetUrl, setTargetUrl] = useState('');
  const [mediaFormat, setMediaFormat] = useState('video'); // 'video', 'audio'
  const [vQuality, setVQuality] = useState('1080'); // '1080', '720', '480'
  const [aFormat, setAFormat] = useState('mp3'); // 'mp3', 'ogg'
  
  const [isFetching, setIsFetching] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState('');
  const [downloadResult, setDownloadResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFetchMedia = async () => {
    if (!targetUrl.trim()) {
      alert("Please paste a valid social media link.");
      return;
    }

    setIsFetching(true);
    setFetchingStatus("Connecting to Cobalt API nodes...");
    setDownloadResult(null);
    setErrorMsg('');

    try {
      // Step 1: Query public Cobalt API node
      setFetchingStatus("Extracting video streams from social server...");
      const response = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: targetUrl.trim(),
          isAudioOnly: mediaFormat === 'audio',
          audioFormat: mediaFormat === 'audio' ? aFormat : undefined,
          vQuality: mediaFormat === 'video' ? vQuality : undefined
        })
      });

      const res = await response.json();
      
      if (res.status === 'stream' || res.status === 'redirect') {
        setDownloadResult({
          url: res.url,
          filename: res.filename || `extracted_media_${Date.now()}.${mediaFormat === 'audio' ? aFormat : 'mp4'}`,
          title: res.filename ? res.filename.split('.').slice(0, -1).join('.') : 'Extracted Media Video'
        });
      } else if (res.status === 'picker') {
        // Cobalt picker format (multiple stream options)
        if (res.picker && res.picker.length > 0) {
          setDownloadResult({
            url: res.picker[0].url,
            filename: `extracted_media_${Date.now()}.${mediaFormat === 'audio' ? aFormat : 'mp4'}`,
            title: 'Extracted Multi-stream Media'
          });
        } else {
          throw new Error("No download streams found in the picker list.");
        }
      } else if (res.status === 'error') {
        throw new Error(res.error || "Cobalt API returned an extraction error.");
      } else {
        throw new Error("Unexpected extraction response status.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to contact extraction servers. Please verify target link or try again later.");
    } finally {
      setIsFetching(false);
      setFetchingStatus('');
    }
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

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }} className="glass-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
        <Download size={24} style={{ color: 'var(--accent-primary)' }} />
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }} className="gradient-text">
            Social Media Link Downloader
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
            '⚡ Fetch & Extract Media Link'
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
            padding: '1rem',
            border: '1px solid var(--accent-primary)',
            background: 'var(--accent-glow)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginTop: '0.5rem'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600 }}>✓ EXTRACTION SUCCESSFUL</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                {downloadResult.title}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {/* Direct Download Link Button */}
              <a
                href={downloadResult.url}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
                style={{
                  flex: 1,
                  textDecoration: 'none',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  padding: '0.55rem',
                  color: '#fff'
                }}
              >
                <Download size={14} /> Download File
              </a>

              {/* Import to active project option */}
              {activeProject && (
                <button
                  onClick={handleImportToProject}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    fontSize: '0.8rem',
                    padding: '0.55rem',
                    borderColor: 'var(--accent-primary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <FolderPlus size={14} /> Import to Project
                </button>
              )}
            </div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              If downloading fails, right-click "Download File" and select "Save Link As".
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkDownloader;
