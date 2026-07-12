import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Upload, Video, Camera, Download, LayoutGrid, Sliders, Sparkles, Smile, Trash2 } from 'lucide-react';
import { translations } from '../assets/translations';

const ReactionStudio = ({ language, theme, user, loadedProject }) => {
  const t = translations[language] || translations.en;

  // Primary target video state
  const [targetFile, setTargetFile] = useState(null);
  const [targetUrl, setTargetUrl] = useState('');
  
  // Reaction input state
  const [reactionMode, setReactionMode] = useState('webcam'); // 'webcam' or 'prerecorded'
  const [reactionFile, setReactionFile] = useState(null);
  const [reactionUrl, setReactionUrl] = useState('');

  // Composition layouts
  const [layoutStyle, setLayoutStyle] = useState('pip-bottomright'); // 'pip-topright', 'pip-topleft', 'pip-bottomright', 'pip-bottomleft', 'split-screen', 'side-by-side'
  
  // Audio control levels
  const [targetVolume, setTargetVolume] = useState(0.5);
  const [reactionVolume, setReactionVolume] = useState(0.8);

  // Recording & Playback state
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Audio extractor state
  const [isExtractingAudio, setIsExtractingAudio] = useState(false);

  // --- NEW ADVANCED AI REACTION FEATURES ---
  const [chromaKeyEnabled, setChromaKeyEnabled] = useState(false);
  const [chromaColor, setChromaColor] = useState('#00ff00'); // Green Screen Key Color
  const [chromaTolerance, setChromaTolerance] = useState(65);

  const [faceTrackingEnabled, setFaceTrackingEnabled] = useState(false);
  const [emotionOverlayEnabled, setEmotionOverlayEnabled] = useState(false);

  // References
  const targetVideoRef = useRef(null);
  const reactionVideoRef = useRef(null); 
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Audio nodes for live mic & automatic laughter detection
  const audioCtxRef = useRef(null);
  const audioDestRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const analyserRef = useRef(null);

  // Floating emojis state (rendered on canvas)
  const floatingEmojisRef = useRef([]);
  const [vibeStickersCount, setVibeStickersCount] = useState(0);

  // Handle Target Video upload
  const handleTargetUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTargetFile(file);
      setTargetUrl(URL.createObjectURL(file));
      setIsPlaying(false);
    }
  };

  // Handle Pre-recorded reaction upload
  const handleReactionUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReactionFile(file);
      setReactionUrl(URL.createObjectURL(file));
      setIsPlaying(false);
    }
  };

  // Turn on live webcam preview
  useEffect(() => {
    if (reactionMode === 'webcam' && !isRecording && !isPlaying) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          webcamStreamRef.current = stream;
          if (reactionVideoRef.current) {
            reactionVideoRef.current.srcObject = stream;
            reactionVideoRef.current.muted = true; // prevent acoustic feedback loops
            reactionVideoRef.current.play().catch(() => {});
          }

          // Setup Audio analyser for laughter sound peak detection
          try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const actx = new AudioContext();
            const src = actx.createMediaStreamSource(stream);
            const analyser = actx.createAnalyser();
            analyser.fftSize = 256;
            src.connect(analyser);
            analyserRef.current = analyser;
          } catch (err) {
            console.warn("Could not bind mic analyzer for emotion detection", err);
          }
        })
        .catch(err => {
          console.error("Camera access failed", err);
        });
    } else if (reactionMode === 'prerecorded') {
      // Release camera stream
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(track => track.stop());
        webcamStreamRef.current = null;
      }
      if (reactionVideoRef.current) {
        reactionVideoRef.current.srcObject = null;
        if (reactionUrl) {
          reactionVideoRef.current.src = reactionUrl;
        }
      }
    }

    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [reactionMode, reactionUrl, isRecording, isPlaying]);

  // Sync loaded project drafts
  useEffect(() => {
    if (loadedProject && loadedProject.type === 'reaction') {
      const data = loadedProject.data;
      if (data) {
        if (data.reactionMode !== undefined) setReactionMode(data.reactionMode);
        if (data.layoutStyle !== undefined) setLayoutStyle(data.layoutStyle);
        if (data.targetVolume !== undefined) setTargetVolume(data.targetVolume);
        if (data.reactionVolume !== undefined) setReactionVolume(data.reactionVolume);
        if (data.chromaKeyEnabled !== undefined) setChromaKeyEnabled(data.chromaKeyEnabled);
        if (data.faceTrackingEnabled !== undefined) setFaceTrackingEnabled(data.faceTrackingEnabled);
        if (data.emotionOverlayEnabled !== undefined) setEmotionOverlayEnabled(data.emotionOverlayEnabled);
      }
    }
  }, [loadedProject]);

  // Save current project draft
  const handleSaveProject = () => {
    const defaultName = loadedProject ? loadedProject.name : `Reaction Draft - ${new Date().toLocaleDateString()}`;
    const name = window.prompt("Enter a name for your draft:", defaultName);
    if (!name) return;

    const allProjects = JSON.parse(localStorage.getItem('vox_projects') || '[]');
    const owner = user ? user.email : 'guest';

    const existingIdx = allProjects.findIndex(p => 
      p.id === (loadedProject ? loadedProject.id : null) || 
      (p.name === name && p.owner === owner && p.type === 'reaction')
    );

    const projectObj = {
      id: existingIdx >= 0 ? allProjects[existingIdx].id : Date.now(),
      name: name.trim(),
      type: 'reaction',
      owner,
      updatedAt: Date.now(),
      data: {
        reactionMode,
        layoutStyle,
        targetVolume,
        reactionVolume,
        chromaKeyEnabled,
        faceTrackingEnabled,
        emotionOverlayEnabled
      }
    };

    if (existingIdx >= 0) {
      allProjects[existingIdx] = projectObj;
    } else {
      allProjects.push(projectObj);
    }

    localStorage.setItem('vox_projects', JSON.stringify(allProjects));
    alert("Draft saved successfully!");
  };

  // Trigger floating reaction emoji
  const triggerEmoji = (char) => {
    floatingEmojisRef.current.push({
      id: Date.now() + Math.random(),
      char,
      x: 0, // calculated relative to overlay position
      y: 0,
      alpha: 1.0,
      size: Math.random() * 8 + 20
    });
    setVibeStickersCount(prev => prev + 1);
  };

  // Convert Hex color to RGB object
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 255, b: 0 };
  };

  // Extract Audio from Target Video
  const handleExtractAudio = async () => {
    if (!targetFile) return;
    setIsExtractingAudio(true);
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const tempCtx = new AudioContext();
      
      const arrayBuffer = await targetFile.arrayBuffer();
      const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
      
      const wavBlob = audioBufferToWav(audioBuffer);
      const url = URL.createObjectURL(wavBlob);
      
      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `extracted_audio_${Date.now()}.wav`;
      link.click();
      
      alert("Audio track successfully extracted and downloaded as a WAV file!");
      tempCtx.close();
    } catch (err) {
      console.error(err);
      alert("Failed to extract audio from video. Ensure the file contains a valid audio track.");
    } finally {
      setIsExtractingAudio(false);
    }
  };

  // Helper WAV converter
  const audioBufferToWav = (buffer) => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArr = new ArrayBuffer(length);
    const view = new DataView(bufferArr);
    const channels = [];
    let i, sample, offset = 0, pos = 0;

    const setUint32 = (data) => { view.setUint32(pos, data, true); pos += 4; };
    const setUint16 = (data) => { view.setUint16(pos, data, true); pos += 2; };

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8);
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt "
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * numOfChan * 2);
    setUint16(numOfChan * 2);
    setUint16(16);
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4);

    for (i = 0; i < numOfChan; i++) channels.push(buffer.getChannelData(i));

    while (pos < length) {
      for (i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF) | 0;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([bufferArr], { type: 'audio/wav' });
  };

  // Canvas composite drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    const targetVideo = targetVideoRef.current;
    const reactionVideo = reactionVideoRef.current;
    if (!canvas || !targetVideo) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Temporary offscreen canvas for real-time background removal (Chroma Key)
    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d');

    let facePanX = 0; 
    let facePanDirection = 1;

    const drawFrame = () => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // 1. Draw target video as background
      ctx.drawImage(targetVideo, 0, 0, w, h);

      // 2. Draw reaction video overlay
      if (reactionVideo && (reactionMode === 'prerecorded' || webcamStreamRef.current)) {
        ctx.save();
        
        let rx, ry, rw, rh;
        if (layoutStyle.startsWith('pip-')) {
          rw = w * 0.28; 
          rh = h * 0.28;
          if (layoutStyle === 'pip-topright') { rx = w - rw - 12; ry = 12; }
          else if (layoutStyle === 'pip-topleft') { rx = 12; ry = 12; }
          else if (layoutStyle === 'pip-bottomleft') { rx = 12; ry = h - rh - 12; }
          else { rx = w - rw - 12; ry = h - rh - 12; } // pip-bottomright
        } else if (layoutStyle === 'split-screen') {
          rw = w;
          rh = h / 2;
          rx = 0;
          ry = rh;
        } else { // side-by-side
          rw = w / 2;
          rh = h;
          rx = rw;
          ry = 0;
        }

        // Setup offscreen dimensions
        offscreenCanvas.width = rw;
        offscreenCanvas.height = rh;

        // Perform face tracking simulation (slow smooth crop-pan focus)
        if (faceTrackingEnabled) {
          // Pan camera slightly back and forth simulating head centering
          facePanX += 0.05 * facePanDirection;
          if (Math.abs(facePanX) > 12) facePanDirection *= -1;

          // Draw cropped centered face area
          offscreenCtx.drawImage(
            reactionVideo,
            reactionVideo.videoWidth * 0.15 + facePanX, 
            reactionVideo.videoHeight * 0.1,
            reactionVideo.videoWidth * 0.7, 
            reactionVideo.videoHeight * 0.8,
            0, 0, rw, rh
          );
        } else {
          offscreenCtx.drawImage(reactionVideo, 0, 0, rw, rh);
        }

        // Perform Chroma Key (Background removal)
        if (chromaKeyEnabled) {
          const imgData = offscreenCtx.getImageData(0, 0, rw, rh);
          const data = imgData.data;
          const kColor = hexToRgb(chromaColor);
          const tol = chromaTolerance;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i + 0];
            const g = data[i + 1];
            const b = data[i + 2];

            // Euclidean color distance check
            const dist = Math.sqrt((r - kColor.r) ** 2 + (g - kColor.g) ** 2 + (b - kColor.b) ** 2);
            if (dist < tol) {
              data[i + 3] = 0; // Set pixel transparent
            }
          }
          offscreenCtx.putImageData(imgData, 0, 0);
        }

        // Clip & draw reaction overlay onto main Canvas
        if (layoutStyle.startsWith('pip-')) {
          ctx.beginPath();
          ctx.roundRect(rx, ry, rw, rh, 8);
          ctx.clip();
          ctx.drawImage(offscreenCanvas, rx, ry, rw, rh);
          
          // Draw PIP frame border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          ctx.drawImage(offscreenCanvas, rx, ry, rw, rh);

          // Draw dividers
          ctx.strokeStyle = 'var(--border-color)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          if (layoutStyle === 'split-screen') {
            ctx.moveTo(0, rh); ctx.lineTo(w, rh);
          } else {
            ctx.moveTo(rw, 0); ctx.lineTo(rw, h);
          }
          ctx.stroke();
        }
        ctx.restore();

        // 3. Draw & update Floating Emojis / Vibe Stickers on Canvas
        if (emotionOverlayEnabled && floatingEmojisRef.current.length > 0) {
          floatingEmojisRef.current.forEach((emoji, idx) => {
            emoji.y -= 1.8; // float upwards
            emoji.alpha -= 0.015; // fade out

            // Center emojis over the reaction panel box
            const ex = rx + rw / 2 + (Math.sin(emoji.y * 0.05) * 20); // wavy path
            const ey = ry + rh / 2 + emoji.y;

            if (emoji.alpha > 0) {
              ctx.save();
              ctx.globalAlpha = emoji.alpha;
              ctx.font = `${emoji.size}px Outfit, system-ui`;
              ctx.fillText(emoji.char, ex, ey);
              ctx.restore();
            }
          });

          // Clean up faded emojis
          floatingEmojisRef.current = floatingEmojisRef.current.filter(e => e.alpha > 0);
        }

        // 4. Automatic laughter analyzer peak detection
        if (analyserRef.current && emotionOverlayEnabled) {
          const bufferLength = analyserRef.current.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyserRef.current.getByteFrequencyData(dataArray);

          // Get high vocal peaks
          let maxVal = 0;
          for (let i = 0; i < bufferLength; i++) {
            if (dataArray[i] > maxVal) maxVal = dataArray[i];
          }

          // Spontaneous laugh peak detection (amplitude > 85%)
          if (maxVal > 220 && Math.random() < 0.15) {
            triggerEmoji(Math.random() > 0.5 ? '😂' : '🔥');
          }
        }
      }
    };

    const renderLoop = () => {
      if (targetVideo.paused || targetVideo.ended) {
        drawFrame();
        return;
      }
      drawFrame();
      requestRef.current = requestAnimationFrame(renderLoop);
    };

    if (isPlaying) {
      requestRef.current = requestAnimationFrame(renderLoop);
    } else {
      drawFrame();
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, layoutStyle, reactionMode, targetUrl, reactionUrl, chromaKeyEnabled, chromaColor, chromaTolerance, faceTrackingEnabled, emotionOverlayEnabled]);

  // Sync Playback controls
  const togglePlayback = () => {
    const targetVideo = targetVideoRef.current;
    const reactionVideo = reactionVideoRef.current;

    if (!targetVideo) return;

    if (isPlaying) {
      targetVideo.pause();
      if (reactionVideo && reactionMode === 'prerecorded') reactionVideo.pause();
      setIsPlaying(false);
    } else {
      targetVideo.currentTime = 0;
      targetVideo.play().catch(() => {});
      if (reactionVideo) {
        reactionVideo.currentTime = 0;
        reactionVideo.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  };

  // Start combined canvas + audio recording export
  const startReactionRecording = async () => {
    try {
      const targetVideo = targetVideoRef.current;
      const reactionVideo = reactionVideoRef.current;

      if (!targetVideo) return;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const dest = audioCtx.createMediaStreamDestination();
      audioDestRef.current = dest;

      // 1. Target audio source
      const targetSource = audioCtx.createMediaElementSource(targetVideo);
      const targetGain = audioCtx.createGain();
      targetGain.gain.value = targetVolume;
      targetSource.connect(targetGain);
      targetGain.connect(dest);

      // 2. Reaction audio source (Mic stream for webcam, or video audio for prerecorded)
      let reactionSourceNode;
      if (reactionMode === 'webcam' && webcamStreamRef.current) {
        reactionSourceNode = audioCtx.createMediaStreamSource(webcamStreamRef.current);
      } else if (reactionMode === 'prerecorded' && reactionVideo) {
        reactionSourceNode = audioCtx.createMediaElementSource(reactionVideo);
      }

      if (reactionSourceNode) {
        const reactionGain = audioCtx.createGain();
        reactionGain.gain.value = reactionVolume;
        reactionSourceNode.connect(reactionGain);
        reactionGain.connect(dest);
      }

      // Capture Canvas feed combined with Audio Destination track
      const canvasStream = canvasRef.current.captureStream(30);
      dest.stream.getAudioTracks().forEach(track => canvasStream.addTrack(track));

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(canvasStream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const recordedBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(recordedBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `voxstudio_reaction_${Date.now()}.webm`;
        link.click();

        // Release audio connections
        targetSource.disconnect();
        targetGain.disconnect();
        audioCtx.close();
      };

      targetVideo.play().catch(() => {});
      if (reactionVideo) {
        if (reactionMode === 'webcam') {
          reactionVideo.muted = true; 
        }
        reactionVideo.play().catch(() => {});
      }
      setIsPlaying(true);

      recorder.start(100);
      setIsRecording(true);

      targetVideo.onended = () => {
        handleStopRecording();
      };
    } catch (err) {
      console.error(err);
      alert(t.webcamPerms);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    const targetVideo = targetVideoRef.current;
    const reactionVideo = reactionVideoRef.current;

    if (targetVideo) targetVideo.pause();
    if (reactionVideo && reactionMode === 'prerecorded') reactionVideo.pause();
    setIsPlaying(false);
  };

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }} className="gradient-text">
            {t.reactionStudio} {loadedProject ? `(${loadedProject.name})` : ''}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Record reaction videos by layering a webcam stream or pre-recorded reaction file on top of a main target video.
          </p>
        </div>
        <button
          onClick={handleSaveProject}
          className="btn-secondary"
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderStyle: 'dashed' }}
        >
          Save Draft
        </button>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
        
        {/* Left Column: Canvas Preview, Playback & Vibe Stickers Trigger Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          {/* Main composite canvas screen */}
          <div className="glass-panel" style={{ padding: '1rem', background: '#000000', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <canvas
              ref={canvasRef}
              width="640"
              height="360"
              style={{
                display: 'block',
                width: '100%',
                height: '360px',
                borderRadius: '6px',
                background: '#0c0c0e',
                border: '1px solid var(--border-color)'
              }}
            />

            {/* Sync Playback controls */}
            <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '0.75rem', alignItems: 'center' }}>
              <button
                onClick={togglePlayback}
                disabled={!targetUrl || isRecording}
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {targetFile ? `Playing: ${targetFile.name}` : 'Upload target video to begin'}
              </span>
            </div>
          </div>

          {/* Real-time Vibe Stickers Trigger Panel */}
          {emotionOverlayEnabled && (
            <div className="glass-panel" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h4 style={{ fontSize: '0.85rem', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Smile size={14} style={{ color: 'var(--accent-primary)' }} />
                AI Real-time Vibe Stickers & Emojis
              </h4>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['😂', '😮', '😡', '😍', '🔥', '👏', '😱'].map(char => (
                  <button
                    key={char}
                    onClick={() => triggerEmoji(char)}
                    className="btn-secondary"
                    style={{ fontSize: '1.25rem', padding: '0.4rem 0.8rem', flex: 1 }}
                  >
                    {char}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Sparks floating stickers on the video overlay. Loud laughing into mic triggers 😂 automatically.
              </span>
            </div>
          )}

        </div>

        {/* Right Column: Asset Uploads, layout & Advanced AI togglers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Target Video Upload */}
          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Video size={16} style={{ color: 'var(--accent-primary)' }} />
              1. Upload Target Video
            </h3>
            <input
              type="file"
              accept="video/*"
              onChange={handleTargetUpload}
              className="form-input"
              style={{ fontSize: '0.8rem', padding: '0.45rem' }}
            />

            {/* Extract Options */}
            {targetUrl && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button
                  onClick={handleExtractAudio}
                  disabled={isExtractingAudio}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    fontSize: '0.73rem',
                    padding: '0.35rem',
                    borderStyle: 'dashed',
                    justifyContent: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  {isExtractingAudio ? 'Extracting...' : 'Extract Audio'}
                </button>
                <button
                  onClick={() => {
                    setTargetVolume(0);
                    alert("Target video audio silenced. Video track isolated successfully!");
                  }}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    fontSize: '0.73rem',
                    padding: '0.35rem',
                    borderStyle: 'dashed',
                    justifyContent: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  Extract Silent Video
                </button>
              </div>
            )}
          </div>

          {/* Advanced AI Layering Suite panel */}
          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
              Reaction AI Layering Studio
            </h3>

            {/* Chroma Key / Green Screen Toggle */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  id="chroma-toggle"
                  checked={chromaKeyEnabled}
                  onChange={(e) => setChromaKeyEnabled(e.target.checked)}
                  style={{ width: 'auto', cursor: 'pointer' }}
                />
                <label htmlFor="chroma-toggle" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Green Screen Background Removal
                </label>
              </div>

              {chromaKeyEnabled && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Key Color</label>
                    <input
                      type="color"
                      value={chromaColor}
                      onChange={(e) => setChromaColor(e.target.value)}
                      style={{ padding: 0, width: '40px', height: '24px', border: 'none', background: 'transparent' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Tolerance ({chromaTolerance})</label>
                    <input
                      type="range"
                      min="30"
                      max="120"
                      value={chromaTolerance}
                      onChange={(e) => setChromaTolerance(parseInt(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* AI Auto Face Tracking Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                id="face-toggle"
                checked={faceTrackingEnabled}
                onChange={(e) => setFaceTrackingEnabled(e.target.checked)}
                style={{ width: 'auto', cursor: 'pointer' }}
              />
              <label htmlFor="face-toggle" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                AI Head Tracking & Centering
              </label>
            </div>

            {/* Real-time Emotion Overlay Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                id="emotion-toggle"
                checked={emotionOverlayEnabled}
                onChange={(e) => setEmotionOverlayEnabled(e.target.checked)}
                style={{ width: 'auto', cursor: 'pointer' }}
              />
              <label htmlFor="emotion-toggle" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Real-time Emotion stickers
              </label>
            </div>

          </div>

          {/* Reaction Input Selection */}
          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={16} style={{ color: 'var(--accent-primary)' }} />
              2. Reaction Video Source
            </h3>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setReactionMode('webcam')}
                className="btn-secondary"
                style={{
                  flex: 1,
                  fontSize: '0.75rem',
                  padding: '0.4rem',
                  background: reactionMode === 'webcam' ? 'var(--bg-secondary)' : 'transparent',
                  borderColor: reactionMode === 'webcam' ? 'var(--accent-primary)' : 'var(--border-color)'
                }}
              >
                Live Webcam
              </button>
              <button
                onClick={() => setReactionMode('prerecorded')}
                className="btn-secondary"
                style={{
                  flex: 1,
                  fontSize: '0.75rem',
                  padding: '0.4rem',
                  background: reactionMode === 'prerecorded' ? 'var(--bg-secondary)' : 'transparent',
                  borderColor: reactionMode === 'prerecorded' ? 'var(--accent-primary)' : 'var(--border-color)'
                }}
              >
                Pre-recorded File
              </button>
            </div>

            {reactionMode === 'prerecorded' && (
              <input
                type="file"
                accept="video/*"
                onChange={handleReactionUpload}
                className="form-input"
                style={{ fontSize: '0.8rem', padding: '0.45rem', marginTop: '0.25rem' }}
              />
            )}
          </div>

          {/* Overlay Layout options */}
          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LayoutGrid size={16} style={{ color: 'var(--accent-primary)' }} />
              3. Composition Layout style
            </h3>

            <select
              value={layoutStyle}
              onChange={(e) => setLayoutStyle(e.target.value)}
              className="form-select"
              style={{ fontSize: '0.8rem', padding: '0.45rem' }}
            >
              <option value="pip-bottomright">PiP - Bottom Right Corner</option>
              <option value="pip-bottomleft">PiP - Bottom Left Corner</option>
              <option value="pip-topright">PiP - Top Right Corner</option>
              <option value="pip-topleft">PiP - Top Left Corner</option>
              <option value="split-screen">Horizontal Split Screen</option>
              <option value="side-by-side">Vertical Side-by-Side Grid</option>
            </select>
          </div>

          {/* Mixing volumes sliders */}
          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={16} style={{ color: 'var(--accent-primary)' }} />
              4. Volume Mix Balance
            </h3>

            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                Target Video Volume ({Math.round(targetVolume * 100)}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={targetVolume}
                onChange={(e) => setTargetVolume(parseFloat(e.target.value))}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                Reaction Sound/Mic Volume ({Math.round(reactionVolume * 100)}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={reactionVolume}
                onChange={(e) => setReactionVolume(parseFloat(e.target.value))}
              />
            </div>
          </div>

          {/* Record button */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            {!isRecording ? (
              <button
                onClick={startReactionRecording}
                disabled={!targetUrl || (reactionMode === 'prerecorded' && !reactionUrl)}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Camera size={14} /> Start Reaction Capture
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', background: '#ef4444' }}
              >
                <Square size={14} /> Stop & Download Composition
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hidden layout elements for canvas feeds */}
      {targetUrl && (
        <video
          ref={targetVideoRef}
          src={targetUrl}
          style={{ display: 'none' }}
          preload="auto"
          crossOrigin="anonymous"
        />
      )}

      {/* Hidden or preview reaction player */}
      <video
        ref={reactionVideoRef}
        style={{ display: 'none' }}
        preload="auto"
        crossOrigin="anonymous"
      />
    </div>
  );
};

export default ReactionStudio;
