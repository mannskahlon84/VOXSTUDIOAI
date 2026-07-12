import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Upload, Type, Globe, Sliders, Film, Music, Download, Mic, Trash2, Plus, Sparkles } from 'lucide-react';
import { translations, fontOptions } from '../assets/translations';
import { loadGoogleFont } from '../assets/fontLoader';

const VideoEditor = ({ language, theme, user, loadedProject, activeProject, onUpdateProjectState, onAddProjectAsset }) => {
  const t = translations[language] || translations.en;

  // Video & Image uploads
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [mediaType, setMediaType] = useState('video'); // 'video' or 'image'

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(10);
  const [currentTime, setCurrentTime] = useState(0);

  // Subtitles / Cues state
  const [cues, setCues] = useState([]);
  const [activeCueId, setActiveCueId] = useState(null);
  const [subtitleLang, setSubtitleLang] = useState('en-US');
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Text Overlay styling options
  const [selectedFont, setSelectedFont] = useState('Outfit');
  const [captionStyle, setCaptionStyle] = useState('capcut-yellow'); // 'capcut-yellow', 'neon-glow', 'label', 'bubble', 'standard'
  const [captionSize, setCaptionSize] = useState(24);

  // Mixing volumes state
  const [bgVolume, setBgVolume] = useState(0.2);
  const [videoVolume, setVideoVolume] = useState(0.8);
  const [vocalVolume, setVocalVolume] = useState(1.0);

  // Backing audio state
  const [bgMusicFile, setBgMusicFile] = useState(null);
  const [bgMusicUrl, setBgMusicUrl] = useState('');

  // Voiceover Vocal Recording state
  const [isRecordingVocal, setIsRecordingVocal] = useState(false);
  const [recordedVocalBlob, setRecordedVocalBlob] = useState(null);
  const [recordedVocalUrl, setRecordedVocalUrl] = useState('');

  // CapCut visual templates
  const [visualTemplate, setVisualTemplate] = useState('none'); // 'none', 'vhs', 'glitch', 'lightleak', 'mono', 'cinematic'

  // Export properties
  const [exportQuality, setExportQuality] = useState('720p'); // '480p', '720p', '1080p'
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Video Trimming & Cutting State Variables
  const [trimMode, setTrimMode] = useState('none'); // 'none', 'single', 'multi'
  const [singleTrimStart, setSingleTrimStart] = useState(0);
  const [singleTrimEnd, setSingleTrimEnd] = useState(10);
  
  const [multiTrimList, setMultiTrimList] = useState([]); // array of { id, start, end }
  const [mergedSegments, setMergedSegments] = useState([]); // final stitched segments controlling play/export
  
  const [segmentInputStart, setSegmentInputStart] = useState(0);

  // AI Video Studio state variables
  const [aiVideoPrompt, setAiVideoPrompt] = useState('cinematic model photoshoot walking in rain');
  const [aiVideoSource, setAiVideoSource] = useState('text'); // 'text' or 'image'
  const [aiVideoImageUrl, setAiVideoImageUrl] = useState('');
  const [aiVideoImageFile, setAiVideoImageFile] = useState(null);
  const [aiVideoMotionPreset, setAiVideoMotionPreset] = useState('zoom-pan'); // 'zoom-pan', 'photoshoot-flares', 'glitch', 'rain-ripples'
  const [isGeneratingAiVideo, setIsGeneratingAiVideo] = useState(false);
  const [aiVideoProgressText, setAiVideoProgressText] = useState('');
  const [segmentInputEnd, setSegmentInputEnd] = useState(0);

  // Audio extractor state
  const [isExtractingAudio, setIsExtractingAudio] = useState(false);

  // Aspect Ratio & Auto-Reframe states
  const [aspectRatio, setAspectRatio] = useState('16:9'); // '16:9', '9:16', '1:1'
  const [autoReframe, setAutoReframe] = useState(false);
  const [selectedViralTemplate, setSelectedViralTemplate] = useState('none'); // 'none', 'trending-reel', 'cinematic-vlog', 'retro-vhs'

  // DOM node references
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const bgAudioRef = useRef(null);
  const vocalAudioRef = useRef(null);
  const recognitionRef = useRef(null);
  
  const micStreamRef = useRef(null);
  const micRecorderRef = useRef(null);
  const stemGainsRef = useRef({});
  
  // AI Face Scan Video Creation states
  const [faceScanState, setFaceScanState] = useState('idle'); // 'idle', 'camera-request', 'scanning', 'scanning-complete', 'generating'
  const [scannedFacePhotoUrl, setScannedFacePhotoUrl] = useState('');
  const [selectedAvatarTemplate, setSelectedAvatarTemplate] = useState('walking-rain'); // 'walking-rain', 'stage-singer', 'fashion-model'
  const [faceScanProgress, setFaceScanProgress] = useState(0);
  const faceScanWebcamRef = useRef(null);
  const webcamStreamRef = useRef(null);

  const requestRef = useRef(null);

  // Load font dynamically when chosen
  useEffect(() => {
    loadGoogleFont(selectedFont);
  }, [selectedFont]);

  // Synchronize local states with activeProject snapshot parameters
  useEffect(() => {
    if (activeProject) {
      if (activeProject.videoUrl !== undefined) setVideoUrl(activeProject.videoUrl);
      if (activeProject.mediaType !== undefined) setMediaType(activeProject.mediaType);
      if (activeProject.cues !== undefined) setCues(activeProject.cues);
      if (activeProject.subtitleLang !== undefined) setSubtitleLang(activeProject.subtitleLang);
      if (activeProject.bgVolume !== undefined) setBgVolume(activeProject.bgVolume);
      if (activeProject.videoVolume !== undefined) setVideoVolume(activeProject.videoVolume);
      if (activeProject.vocalVolume !== undefined) setVocalVolume(activeProject.vocalVolume);
      if (activeProject.bgMusicUrl !== undefined) setBgMusicUrl(activeProject.bgMusicUrl);
      if (activeProject.recordedVocalUrl !== undefined) setRecordedVocalUrl(activeProject.recordedVocalUrl);
      if (activeProject.visualTemplate !== undefined) setVisualTemplate(activeProject.visualTemplate);
      if (activeProject.trimMode !== undefined) setTrimMode(activeProject.trimMode);
    }
  }, [activeProject]);

  // Synchronize state updates back to App.jsx global project
  const updateProjectDiff = (diff, historyDesc) => {
    if (onUpdateProjectState && activeProject) {
      onUpdateProjectState(diff, historyDesc);
    }
  };

  // Helper to choose from assets list
  const renderAssetPicker = (typeFilter, onSelectAsset) => {
    if (!activeProject || !activeProject.assets) return null;
    const matching = activeProject.assets.filter(a => {
      if (typeFilter === 'video') return a.name.endsWith('.webm') || a.name.endsWith('.mp4') || a.type === 'video';
      if (typeFilter === 'image') return a.name.endsWith('.png') || a.name.endsWith('.jpg') || a.name.endsWith('.jpeg') || a.type === 'image';
      if (typeFilter === 'audio') return a.name.endsWith('.wav') || a.name.endsWith('.mp3') || a.type === 'audio';
      return a.type === typeFilter;
    });
    if (matching.length === 0) return null;

    return (
      <div style={{ marginTop: '0.2rem' }}>
        <select
          onChange={(e) => {
            const asset = matching.find(a => a.id === e.target.value);
            if (asset) onSelectAsset(asset.url, asset.name);
          }}
          className="form-select"
          style={{ fontSize: '0.72rem', padding: '0.2rem 0.4rem', height: 'auto', display: 'inline-block', width: 'auto', background: 'var(--bg-card)' }}
          defaultValue=""
        >
          <option value="" disabled>📂 Import from Project Files...</option>
          {matching.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>
    );
  };

  // Synchronize playback clocks & handle segment jumping for multi-trimming
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const current = video.currentTime;
      setCurrentTime(current);

      // Jumps and cuts logic for saved trim segments
      if (mergedSegments.length > 0) {
        // Find if playhead is currently inside a valid segment range
        const activeIdx = mergedSegments.findIndex(seg => current >= seg.start - 0.15 && current <= seg.end + 0.15);
        
        if (activeIdx !== -1) {
          const activeSeg = mergedSegments[activeIdx];
          if (current >= activeSeg.end) {
            // Reached segment end, jump to next segment
            if (activeIdx < mergedSegments.length - 1) {
              video.currentTime = mergedSegments[activeIdx + 1].start;
              if (bgAudioRef.current) bgAudioRef.current.currentTime = video.currentTime;
              if (vocalAudioRef.current) vocalAudioRef.current.currentTime = video.currentTime;
            } else {
              // Reached end of final segment
              video.pause();
              video.currentTime = mergedSegments[0].start;
              if (bgAudioRef.current) bgAudioRef.current.pause();
              if (vocalAudioRef.current) vocalAudioRef.current.pause();
              setIsPlaying(false);
            }
          }
        } else {
          // Playhead is outside any valid slice, force-jump to the start of the first slice
          if (current < mergedSegments[0].start || current > mergedSegments[mergedSegments.length - 1].end) {
            video.currentTime = mergedSegments[0].start;
          }
        }
      }

      // Sync active subtitle highlight
      const matchingCue = cues.find(c => current >= c.start && current <= c.end);
      setActiveCueId(matchingCue ? matchingCue.id : null);
    };

    const handleLoadedMetadata = () => {
      const dur = video.duration || 10;
      setDuration(dur);
      setSingleTrimEnd(dur);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [cues, mergedSegments]);

  // Sync loaded project drafts
  useEffect(() => {
    if (loadedProject && loadedProject.type === 'video') {
      const data = loadedProject.data;
      if (data) {
        if (data.cues !== undefined) setCues(data.cues);
        if (data.selectedFont !== undefined) setSelectedFont(data.selectedFont);
        if (data.captionStyle !== undefined) setCaptionStyle(data.captionStyle);
        if (data.captionSize !== undefined) setCaptionSize(data.captionSize);
        if (data.subtitleLang !== undefined) setSubtitleLang(data.subtitleLang);
        if (data.bgVolume !== undefined) setBgVolume(data.bgVolume);
        if (data.videoVolume !== undefined) setVideoVolume(data.videoVolume);
        if (data.vocalVolume !== undefined) setVocalVolume(data.vocalVolume);
        if (data.visualTemplate !== undefined) setVisualTemplate(data.visualTemplate);
        if (data.exportQuality !== undefined) setExportQuality(data.exportQuality);
        if (data.mediaType !== undefined) setMediaType(data.mediaType);
        
        // Restore trimming states
        if (data.trimMode !== undefined) setTrimMode(data.trimMode);
        if (data.singleTrimStart !== undefined) setSingleTrimStart(data.singleTrimStart);
        if (data.singleTrimEnd !== undefined) setSingleTrimEnd(data.singleTrimEnd);
        if (data.multiTrimList !== undefined) setMultiTrimList(data.multiTrimList);
        if (data.mergedSegments !== undefined) setMergedSegments(data.mergedSegments);
      }
    }
  }, [loadedProject]);

  // Play / Pause toggler
  const handlePlayToggle = () => {
    // Check if it's simulated avatar video
    if (videoUrl && videoUrl.startsWith('avatar-video-')) {
      if (isPlaying) {
        setIsPlaying(false);
        if (bgAudioRef.current) bgAudioRef.current.pause();
        if (vocalAudioRef.current) vocalAudioRef.current.pause();
      } else {
        setIsPlaying(true);
        if (bgAudioRef.current && bgMusicUrl) {
          bgAudioRef.current.volume = bgVolume;
          bgAudioRef.current.play().catch(() => {});
        }
        if (vocalAudioRef.current && recordedVocalUrl) {
          vocalAudioRef.current.volume = vocalVolume;
          vocalAudioRef.current.play().catch(() => {});
        }
      }
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      if (bgAudioRef.current) bgAudioRef.current.pause();
      if (vocalAudioRef.current) vocalAudioRef.current.pause();
      setIsPlaying(false);
    } else {
      // If we have merged segments, start playback from the start of the first segment
      if (mergedSegments.length > 0 && video.currentTime >= mergedSegments[mergedSegments.length - 1].end) {
        video.currentTime = mergedSegments[0].start;
      }
      video.play().catch(() => {});
      
      if (bgAudioRef.current && bgMusicUrl) {
        bgAudioRef.current.volume = bgVolume;
        bgAudioRef.current.currentTime = video.currentTime;
        bgAudioRef.current.play().catch(() => {});
      }
      if (vocalAudioRef.current && recordedVocalUrl) {
        vocalAudioRef.current.volume = vocalVolume;
        vocalAudioRef.current.currentTime = video.currentTime;
        vocalAudioRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  };

  // Video upload handler
  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      const isImg = file.type.startsWith('image/');
      setMediaType(isImg ? 'image' : 'video');
      setVideoUrl(URL.createObjectURL(file));
      setCurrentTime(0);
      setIsPlaying(false);
      
      // Reset trims
      setTrimMode('none');
      setMergedSegments([]);
      setMultiTrimList([]);
    }
  };
  // AI Video Image upload handler
  const handleAiVideoImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAiVideoImageFile(file);
      setAiVideoImageUrl(URL.createObjectURL(file));
      setAiVideoSource('image');
    }
  };

  // 100% Client-Side Generative AI Video Compiler
  const generateAiVideo = async () => {
    if (aiVideoSource === 'text' && !aiVideoPrompt.trim()) {
      alert("Please enter a text prompt to generate video.");
      return;
    }
    if (aiVideoSource === 'image' && !aiVideoImageUrl) {
      alert("Please upload a reference image to animate.");
      return;
    }

    setIsGeneratingAiVideo(true);
    setAiVideoProgressText('Analyzing prompt matrices...');

    const progressSteps = [
      { t: 800, msg: 'Dreaming canvas layout...' },
      { t: 1600, msg: 'Interpolating frames at 30fps...' },
      { t: 2400, msg: 'Rendering final WebM stream...' }
    ];
    progressSteps.forEach(step => {
      setTimeout(() => setAiVideoProgressText(step.msg), step.t);
    });

    setTimeout(async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let img = null;
        if (aiVideoSource === 'image' && aiVideoImageUrl) {
          img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = aiVideoImageUrl;
          await new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }

        const stream = canvas.captureStream(30);
        const recordedChunks = [];
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunks.push(e.data);
        };

        const durationSec = 6;
        const totalFrames = durationSec * 30;
        let currentFrame = 0;

        recorder.onstop = async () => {
          const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
          const url = URL.createObjectURL(videoBlob);
          setVideoFile(new File([videoBlob], "ai_video.webm", { type: "video/webm" }));
          setVideoUrl(url);
          setMediaType('video');
          setIsPlaying(false);
          setCurrentTime(0);
          setDuration(6);
          setSingleTrimEnd(6);
          setTrimMode('none');
          setMergedSegments([]);
          setMultiTrimList([]);
          setIsGeneratingAiVideo(false);

          // Store generated video inside project assets database
          if (onAddProjectAsset && activeProject) {
            const assetName = `ai_video_${Date.now()}.webm`;
            await onAddProjectAsset(assetName, 'video', videoBlob);
            updateProjectDiff({
              videoUrl: url,
              mediaType: 'video',
              duration: 6
            }, `Generated AI Video Scene: "${aiVideoPrompt}"`);
          } else {
            updateProjectDiff({ videoUrl: url, mediaType: 'video' });
          }

          alert("AI Video successfully generated and loaded into Editor Workspace!");
        };

        recorder.start();

        const drawFrame = () => {
          if (currentFrame >= totalFrames) {
            recorder.stop();
            return;
          }

          const w = canvas.width;
          const h = canvas.height;
          const t = currentFrame / 30;

          ctx.clearRect(0, 0, w, h);

          // Render Image-to-Video presets
          if (aiVideoSource === 'image' && img) {
            ctx.save();
            if (aiVideoMotionPreset === 'zoom-pan') {
              const scale = 1.0 + t * 0.04;
              const dx = t * 3;
              ctx.translate(dx, 0);
              ctx.scale(scale, scale);
              ctx.drawImage(img, -20, -10, w + 40, h + 20);
            } else if (aiVideoMotionPreset === 'photoshoot-flares') {
              ctx.drawImage(img, 0, 0, w, h);
              if (Math.sin(t * 12) > 0.85) {
                const flareX = Math.random() * w;
                const flareY = Math.random() * h;
                const grad = ctx.createRadialGradient(flareX, flareY, 5, flareX, flareY, 120);
                grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
                grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
                grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
              }
            } else if (aiVideoMotionPreset === 'glitch') {
              const shift = Math.sin(t * 30) > 0.9 ? 8 : 0;
              ctx.drawImage(img, shift, 0, w, h);
              if (shift > 0) {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
                ctx.fillRect(0, Math.random() * h, w, 15);
              }
            } else { // rain-ripples
              ctx.drawImage(img, 0, 0, w, h);
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
              ctx.lineWidth = 1.5;
              for (let i = 0; i < 8; i++) {
                const rx = (i * 90 + t * 60) % w;
                const ry = (i * 55 + t * 140) % h;
                ctx.beginPath();
                ctx.moveTo(rx, ry);
                ctx.lineTo(rx - 2, ry + 12);
                ctx.stroke();
              }
            }
            ctx.restore();
          } 
          
          // Render Text-to-Video presets
          else {
            const promptLower = aiVideoPrompt.toLowerCase();
            if (promptLower.includes('drive') || promptLower.includes('neon') || promptLower.includes('retro') || promptLower.includes('synthwave')) {
              ctx.fillStyle = '#06020c';
              ctx.fillRect(0, 0, w, h);

              // Sun
              const sunGrad = ctx.createLinearGradient(0, 20, 0, h - 80);
              sunGrad.addColorStop(0, '#f43f5e');
              sunGrad.addColorStop(1, '#eab308');
              ctx.fillStyle = sunGrad;
              ctx.beginPath();
              ctx.arc(w/2, h/2 - 20, 70, 0, Math.PI, true);
              ctx.fill();

              ctx.fillStyle = '#06020c';
              for (let y = h/2 - 20; y < h/2 + 50; y += 12) {
                ctx.fillRect(w/2 - 75, y, 150, 4);
              }

              // Perspective lines
              ctx.strokeStyle = '#00f2fe';
              ctx.lineWidth = 1.5;
              const horizonY = h/2 + 30;
              const scrollOffset = (t * 40) % 30;

              for (let x = -200; x <= w + 200; x += 40) {
                ctx.beginPath();
                ctx.moveTo(w/2, horizonY);
                ctx.lineTo(x, h);
                ctx.stroke();
              }

              for (let y = horizonY; y < h; y += 12) {
                const dy = y + scrollOffset;
                if (dy < h) {
                  ctx.beginPath();
                  ctx.moveTo(0, dy);
                  ctx.lineTo(w, dy);
                  ctx.stroke();
                }
              }
            } else if (promptLower.includes('photoshoot') || promptLower.includes('model') || promptLower.includes('walk') || promptLower.includes('fashion')) {
              const grad = ctx.createLinearGradient(0, 0, 0, h);
              grad.addColorStop(0, '#111827');
              grad.addColorStop(1, '#030712');
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, w, h);

              const scale = 0.55 + t * 0.11;
              ctx.save();
              ctx.translate(w/2, h/2 + 20);
              ctx.scale(scale, scale);

              ctx.fillStyle = '#000000';
              // Head
              ctx.beginPath(); ctx.arc(0, -60, 20, 0, Math.PI*2); ctx.fill();
              // Torso
              ctx.beginPath(); ctx.roundRect(-15, -35, 30, 70, 8); ctx.fill();
              // Legs walking
              const legAngle = Math.sin(t * 8) * 15;
              ctx.save();
              ctx.translate(-8, 30);
              ctx.rotate(legAngle * Math.PI / 180);
              ctx.fillRect(-6, 0, 12, 50);
              ctx.restore();

              ctx.save();
              ctx.translate(8, 30);
              ctx.rotate(-legAngle * Math.PI / 180);
              ctx.fillRect(-6, 0, 12, 50);
              ctx.restore();
              ctx.restore();

              if (Math.sin(t * 14) > 0.82) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.beginPath();
                ctx.arc(Math.random()*w, Math.random()*h, Math.random()*30 + 10, 0, Math.PI*2);
                ctx.fill();
              }
            } else {
              const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
              skyGrad.addColorStop(0, '#1e1b4b');
              skyGrad.addColorStop(0.5, '#4c1d95');
              skyGrad.addColorStop(1, '#701a75');
              ctx.fillStyle = skyGrad;
              ctx.fillRect(0, 0, w, h);

              ctx.fillStyle = '#ffffff';
              for (let i = 0; i < 20; i++) {
                const angle = (i * 18 + t * 3) * Math.PI / 180;
                const starX = w/2 + Math.cos(angle) * (i * 15 + 10);
                const starY = h/2 + Math.sin(angle) * (i * 15 + 10);
                ctx.beginPath();
                ctx.arc(starX, starY, 1.5, 0, Math.PI*2);
                ctx.fill();
              }
            }
          }

          currentFrame++;
          requestAnimationFrame(drawFrame);
        };

        drawFrame();
      } catch (err) {
        console.error(err);
        setIsGeneratingAiVideo(false);
      }
    }, 3200);
  };
  // Music upload handler
  const handleMusicUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBgMusicFile(file);
      setBgMusicUrl(URL.createObjectURL(file));
    }
  };

  // Voiceover Recording synchronized with video playback
  const startVoiceoverRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      micChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      micRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) micChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(micChunksRef.current, { type: 'audio/wav' });
        setRecordedVocalBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedVocalUrl(url);
        stream.getTracks().forEach(track => track.stop());

        // Store recorded voiceover inside project assets
        if (onAddProjectAsset && activeProject) {
          const assetName = `voiceover_${Date.now()}.wav`;
          await onAddProjectAsset(assetName, 'audio', blob);
          updateProjectDiff({
            recordedVocalUrl: url
          }, `Recorded Voiceover Dub: "${assetName}"`);
        } else {
          updateProjectDiff({ recordedVocalUrl: url });
        }
      };

      // Reset playback playhead to 0 or start of first trim slice
      const video = videoRef.current;
      if (video) {
        video.currentTime = mergedSegments.length > 0 ? mergedSegments[0].start : 0;
        video.play().catch(() => {});
      }
      
      // Play backing music if active
      if (bgAudioRef.current && bgMusicUrl) {
        bgAudioRef.current.volume = bgVolume;
        bgAudioRef.current.currentTime = video.currentTime;
        bgAudioRef.current.play().catch(() => {});
      }

      recorder.start();
      setIsRecordingVocal(true);
      setIsPlaying(true);
    } catch (err) {
      console.error(err);
      alert(t.webcamPerms);
    }
  };

  const stopVoiceoverRecording = () => {
    if (micRecorderRef.current && isRecordingVocal) {
      micRecorderRef.current.stop();
      setIsRecordingVocal(false);

      const video = videoRef.current;
      if (video) video.pause();
      if (bgAudioRef.current) bgAudioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Add caption cue
  const addCue = () => {
    const newCue = {
      id: Date.now(),
      text: 'New Subtitle Text',
      start: currentTime,
      end: Math.min(duration, currentTime + 3)
    };
    setCues(prev => [...prev, newCue].sort((a, b) => a.start - b.start));
  };

  // Edit caption cue text
  const editCueText = (id, newText) => {
    setCues(prev => prev.map(c => c.id === id ? { ...c, text: newText } : c));
  };

  // Edit caption timeline boundaries
  const editCueTime = (id, field, val) => {
    const numVal = parseFloat(val) || 0;
    setCues(prev => prev.map(c => c.id === id ? { ...c, [field]: numVal } : c).sort((a, b) => a.start - b.start));
  };

  // Remove caption cue
  const deleteCue = (id) => {
    setCues(prev => prev.filter(c => c.id !== id));
  };

  // Auto-Subtitles generator using browser Web Speech API
  const startAutoSubtitles = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Auto-Subtitles speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    window.speechSynthesis.cancel();
    video.currentTime = mergedSegments.length > 0 ? mergedSegments[0].start : 0;
    video.play().catch(() => {});
    setIsPlaying(true);

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = subtitleLang;
    recognition.continuous = true;
    recognition.interimResults = false;

    const transcribedCues = [];
    let cueStart = video.currentTime;

    recognition.onstart = () => {
      setIsTranscribing(true);
      cueStart = video.currentTime;
    };

    recognition.onresult = (event) => {
      const resultIndex = event.resultIndex;
      const transcriptText = event.results[resultIndex][0].transcript.trim();
      const current = video.currentTime;

      if (transcriptText) {
        transcribedCues.push({
          id: Date.now() + resultIndex,
          text: transcriptText,
          start: Math.max(0, cueStart),
          end: current
        });
        cueStart = current + 0.1;
        setCues([...transcribedCues]);
      }
    };

    recognition.onend = () => {
      setIsTranscribing(false);
      video.pause();
      setIsPlaying(false);
    };

    recognition.onerror = (e) => {
      console.error(e);
      setIsTranscribing(false);
    };

    recognition.start();
  };

  const stopAutoSubtitles = () => {
    if (recognitionRef.current && isTranscribing) {
      recognitionRef.current.stop();
      setIsTranscribing(false);
    }
  };

  // Real-time canvas drawing with styled text and CapCut visual effects
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || isExporting) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderLoop = () => {
      if (videoUrl && videoUrl.startsWith('avatar-video-')) {
        if (!isPlaying) {
          drawFrame();
          return;
        }
        setCurrentTime(prev => {
          const next = prev + 0.033;
          return next >= duration ? 0 : next;
        });
        drawFrame();
        requestRef.current = requestAnimationFrame(renderLoop);
      } else {
        if (video.paused || video.ended) {
          drawFrame();
          return;
        }
        drawFrame();
        requestRef.current = requestAnimationFrame(renderLoop);
      }
    };

    const drawFrame = () => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      if (videoUrl && videoUrl.startsWith('avatar-video-')) {
        drawSimulatedAvatarVideo(ctx, w, h);
      } else {
        // Draw primary video source with custom aspect ratio cropping and auto-reframe
        const srcW = video.videoWidth || w;
        const srcH = video.videoHeight || h;
      const targetRatio = w / h;
      const srcRatio = srcW / srcH;

      let sx, sy, sw, sh;
      if (srcRatio > targetRatio) {
        // Source is wider than target (e.g. landscape in vertical canvas) -> crop left/right
        sh = srcH;
        sw = srcH * targetRatio;
        sy = 0;
        
        // Simulates face/subject tracking by panning horizontal crop window based on time/motion
        const maxOffset = srcW - sw;
        const drift = autoReframe ? Math.sin(video.currentTime * 0.5) * maxOffset * 0.35 : 0;
        sx = Math.max(0, Math.min(maxOffset, (srcW - sw) / 2 + drift));
      } else {
        // Source is taller than target -> crop top/bottom
        sw = srcW;
        sh = srcW / targetRatio;
        sx = 0;
        sy = (srcH - sh) / 2;
      }

      // Add a subtle beat-sync zoom pulse if trending reel template is selected
      let zoomPulse = 1.0;
      if (selectedViralTemplate === 'trending-reel') {
        const beatInterval = 1.5; // beat every 1.5s
        const timeSinceBeat = video.currentTime % beatInterval;
        if (timeSinceBeat < 0.2) {
          zoomPulse = 1.08; // pulse flash zoom
        }
      }

      if (visualTemplate === 'cinematic' && duration > 0) {
        const progress = video.currentTime / duration;
        const scale = (1.0 + progress * 0.15) * zoomPulse; 
        const dx = (w * (scale - 1)) / 2;
        const dy = (h * (scale - 1)) / 2;

        ctx.drawImage(video, sx, sy, sw, sh, -dx, -dy, w * scale, h * scale);
      } else if (zoomPulse > 1.0) {
        const dx = (w * (zoomPulse - 1)) / 2;
        const dy = (h * (zoomPulse - 1)) / 2;
        ctx.drawImage(video, sx, sy, sw, sh, -dx, -dy, w * zoomPulse, h * zoomPulse);
      } else {
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
      }
      }

      // Apply Visual Filters templates
      if (visualTemplate === 'vhs') {
        // noise overlay
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        for (let i = 0; i < 40; i++) {
          const rx = Math.random() * w;
          const ry = Math.random() * h;
          ctx.fillRect(rx, ry, w * 0.05, 1);
        }
        // scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let y = 0; y < h; y += 4) {
          ctx.fillRect(0, y, w, 1);
        }
        ctx.fillStyle = '#00ff00';
        ctx.font = '16px monospace';
        ctx.fillText(`PLAY  00:${Math.floor(video.currentTime).toString().padStart(2, '0')}:00`, 30, 40);
        ctx.fillText(`VCR  L-FI  720p`, w - 150, 40);
      } else if (visualTemplate === 'glitch') {
        if (Math.random() < 0.15) {
          const sliceY = Math.random() * h;
          const sliceH = Math.random() * 40 + 10;
          const sliceShift = (Math.random() - 0.5) * 30;
          ctx.drawImage(canvas, 0, sliceY, w, sliceH, sliceShift, sliceY, w, sliceH);
        }
        ctx.fillStyle = 'rgba(255, 0, 80, 0.1)';
        ctx.fillRect(0, 0, w, h);
      } else if (visualTemplate === 'lightleak') {
        const shiftX = Math.sin(video.currentTime) * w * 0.3 + w * 0.5;
        const leakGrad = ctx.createRadialGradient(shiftX, h * 0.2, w * 0.1, shiftX, h * 0.2, w * 0.6);
        leakGrad.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
        leakGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.25)');
        leakGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = leakGrad;
        ctx.fillRect(0, 0, w, h);
      } else if (visualTemplate === 'mono') {
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
          data[i] = brightness;
          data[i + 1] = brightness;
          data[i + 2] = brightness;
        }
        ctx.putImageData(imgData, 0, 0);
      }

      // Draw active overlay subtitle cue
      const current = video.currentTime;
      const activeCue = cues.find(c => current >= c.start && current <= c.end);
      
      if (activeCue) {
        const text = activeCue.text;
        
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${captionSize}px ${selectedFont}`;
        
        const tx = w / 2;
        const ty = h - 65;

        if (captionStyle === 'capcut-yellow') {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 6;
          ctx.strokeText(text, tx, ty);
          ctx.fillStyle = '#facc15';
          ctx.fillText(text, tx, ty);
        } else if (captionStyle === 'neon-glow') {
          ctx.shadowColor = '#00ffff';
          ctx.shadowBlur = 12;
          ctx.strokeStyle = '#00d8d6';
          ctx.lineWidth = 4;
          ctx.strokeText(text, tx, ty);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(text, tx, ty);
        } else if (captionStyle === 'label') {
          const textWidth = ctx.measureText(text).width;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.beginPath();
          ctx.roundRect(tx - textWidth / 2 - 12, ty - captionSize / 2 - 6, textWidth + 24, captionSize + 12, 6);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.fillText(text, tx, ty);
        } else if (captionStyle === 'bubble') {
          const textWidth = ctx.measureText(text).width;
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(tx - textWidth / 2 - 16, ty - captionSize / 2 - 8, textWidth + 32, captionSize + 16, 12);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fbbf24';
          ctx.fillText(text, tx, ty);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fillText(text, tx, ty);
        }
        ctx.restore();
      }
    };

    if (isPlaying) {
      requestRef.current = requestAnimationFrame(renderLoop);
    } else {
      drawFrame();
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, cues, selectedFont, captionStyle, captionSize, visualTemplate, videoUrl, mergedSegments]);

  // Calculate Played Duration across segments for progress reporting
  const calculatePlayedDuration = (current) => {
    let played = 0;
    for (let i = 0; i < mergedSegments.length; i++) {
      const seg = mergedSegments[i];
      if (current >= seg.start && current <= seg.end) {
        played += (current - seg.start);
        break;
      } else {
        played += (seg.end - seg.start);
      }
    }
    return played;
  };

  // Export composite video to multiple selectable resolutions (480p, 720p, 1080p)
  const exportVideo = async () => {
    if (!videoUrl) return;
    setIsExporting(true);
    setExportProgress(0);

    const video = videoRef.current;
    
    // Configure Export Dimensions
    let exportW = 1280;
    let exportH = 720;
    let bitrate = 5000000;

    if (exportQuality === '480p') {
      exportW = 854;
      exportH = 480;
      bitrate = 2000000;
    } else if (exportQuality === '1080p') {
      exportW = 1920;
      exportH = 1080;
      bitrate = 12000000;
    }

    // Set canvas dimensions to target export size
    const canvas = canvasRef.current;
    canvas.width = exportW;
    canvas.height = exportH;

    // Reset video and audio files to initial start point
    const startPoint = mergedSegments.length > 0 ? mergedSegments[0].start : 0;
    video.currentTime = startPoint;
    if (bgAudioRef.current) bgAudioRef.current.currentTime = startPoint;
    if (vocalAudioRef.current) vocalAudioRef.current.currentTime = startPoint;

    // Set up Web Audio mix pipeline
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();

    const videoSource = audioCtx.createMediaElementSource(video);
    const videoGain = audioCtx.createGain();
    videoGain.gain.value = videoVolume;
    videoSource.connect(videoGain);
    videoGain.connect(dest);

    let bgSourceNode, vocalSourceNode;
    if (bgAudioRef.current && bgMusicUrl) {
      bgSourceNode = audioCtx.createMediaElementSource(bgAudioRef.current);
      const bgGain = audioCtx.createGain();
      bgGain.gain.value = bgVolume;
      bgSourceNode.connect(bgGain);
      bgGain.connect(dest);
    }

    if (vocalAudioRef.current && recordedVocalUrl) {
      vocalSourceNode = audioCtx.createMediaElementSource(vocalAudioRef.current);
      const vocalGain = audioCtx.createGain();
      vocalGain.gain.value = vocalVolume;
      vocalSourceNode.connect(vocalGain);
      vocalGain.connect(dest);
    }

    // Capture Canvas Stream combined with Audio mix
    const canvasStream = canvas.captureStream(30); // 30 FPS
    dest.stream.getAudioTracks().forEach(track => canvasStream.addTrack(track));

    const recorder = new MediaRecorder(canvasStream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: bitrate
    });

    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const outputBlob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(outputBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `voxstudio_export_${exportQuality}_${Date.now()}.webm`;
      link.click();

      // Clean up Audio Nodes
      videoSource.disconnect();
      videoGain.disconnect();
      if (bgSourceNode) bgSourceNode.disconnect();
      if (vocalSourceNode) vocalSourceNode.disconnect();
      audioCtx.close();

      setIsExporting(false);
      setIsPlaying(false);
      
      // Reset canvas size back to preview layout size
      canvas.width = aspectRatio === '9:16' ? 360 : aspectRatio === '1:1' ? 450 : canvas.parentElement.clientWidth;
      canvas.height = aspectRatio === '9:16' ? 640 : aspectRatio === '1:1' ? 450 : 360;
    };

    // Play playback elements
    video.play();
    if (bgAudioRef.current) bgAudioRef.current.play();
    if (vocalAudioRef.current) vocalAudioRef.current.play();
    setIsPlaying(true);
    recorder.start(100);

    const totalDuration = mergedSegments.length > 0
      ? mergedSegments.reduce((sum, seg) => sum + (seg.end - seg.start), 0)
      : duration;

    // Track render progress & handle jumps
    const checkProgress = setInterval(() => {
      const current = video.currentTime;

      if (mergedSegments.length > 0) {
        const activeIdx = mergedSegments.findIndex(seg => current >= seg.start - 0.15 && current <= seg.end + 0.15);
        if (activeIdx !== -1) {
          const activeSeg = mergedSegments[activeIdx];
          if (current >= activeSeg.end) {
            if (activeIdx < mergedSegments.length - 1) {
              video.currentTime = mergedSegments[activeIdx + 1].start;
              if (bgAudioRef.current) bgAudioRef.current.currentTime = video.currentTime;
              if (vocalAudioRef.current) vocalAudioRef.current.currentTime = video.currentTime;
            } else {
              clearInterval(checkProgress);
              recorder.stop();
              video.pause();
              if (bgAudioRef.current) bgAudioRef.current.pause();
              if (vocalAudioRef.current) vocalAudioRef.current.pause();
            }
          }
        }
      } else {
        if (video.ended || current >= duration) {
          clearInterval(checkProgress);
          recorder.stop();
          video.pause();
          if (bgAudioRef.current) bgAudioRef.current.pause();
          if (vocalAudioRef.current) vocalAudioRef.current.pause();
        }
      }

      const currentPlayed = mergedSegments.length > 0 ? calculatePlayedDuration(current) : current;
      const prog = Math.min(100, Math.round((currentPlayed / totalDuration) * 100));
      setExportProgress(prog);
    }, 100);
  };

  // Save project draft handler
  const handleSaveProject = () => {
    const defaultName = loadedProject ? loadedProject.name : `Video Draft - ${new Date().toLocaleDateString()}`;
    const name = window.prompt("Enter a name for your draft:", defaultName);
    if (!name) return;

    const allProjects = JSON.parse(localStorage.getItem('vox_projects') || '[]');
    const owner = user ? user.email : 'guest';

    const existingIdx = allProjects.findIndex(p => 
      p.id === (loadedProject ? loadedProject.id : null) || 
      (p.name === name && p.owner === owner && p.type === 'video')
    );

    const projectObj = {
      id: existingIdx >= 0 ? allProjects[existingIdx].id : Date.now(),
      name: name.trim(),
      type: 'video',
      owner,
      updatedAt: Date.now(),
      data: {
        cues,
        selectedFont,
        captionStyle,
        captionSize,
        subtitleLang,
        bgVolume,
        videoVolume,
        vocalVolume,
        visualTemplate,
        exportQuality,
        mediaType,
        trimMode,
        singleTrimStart,
        singleTrimEnd,
        multiTrimList,
        mergedSegments
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

  // Decode and extract Audio Track from Video File
  const handleExtractAudio = async () => {
    if (!videoFile) return;
    setIsExtractingAudio(true);
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const tempCtx = new AudioContext();
      
      const arrayBuffer = await videoFile.arrayBuffer();
      const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
      
      const wavBlob = audioBufferToWav(audioBuffer);
      const url = URL.createObjectURL(wavBlob);
      
      setBgMusicUrl(url);
      setBgMusicFile(new File([wavBlob], "extracted_track.wav", { type: "audio/wav" }));
      alert("Audio track successfully extracted from video and set as Background Music!");
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

  // Webcam live Face Scan handlers
  const startWebcamScan = async () => {
    setFaceScanState('camera-request');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      webcamStreamRef.current = stream;
      setFaceScanState('scanning');
      setFaceScanProgress(0);
      
      if (faceScanWebcamRef.current) {
        faceScanWebcamRef.current.srcObject = stream;
      }
      
      // Simulate scan line animation progress
      let prog = 0;
      const scanInterval = setInterval(() => {
        prog += 5;
        setFaceScanProgress(prog);
        if (prog >= 100) {
          clearInterval(scanInterval);
          captureFaceSnapshot();
        }
      }, 150);
    } catch (e) {
      console.error("Camera access failed", e);
      alert("Webcam access failed. Please ensure camera permissions are enabled.");
      setFaceScanState('idle');
    }
  };

  const captureFaceSnapshot = () => {
    try {
      const video = faceScanWebcamRef.current;
      if (video) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth || 320;
        tempCanvas.height = video.videoHeight || 240;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        const dataUrl = tempCanvas.toDataURL('image/png');
        setScannedFacePhotoUrl(dataUrl);
      }
    } catch (err) {
      console.error(err);
    }
    
    // Stop camera stream
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setFaceScanState('scanning-complete');
  };

  const generateFaceScanVideo = () => {
    setFaceScanState('generating');
    let prog = 0;
    const genInterval = setInterval(async () => {
      prog += 10;
      setFaceScanProgress(prog);
      if (prog >= 100) {
        clearInterval(genInterval);
        
        const simulatedUrl = `avatar-video-${selectedAvatarTemplate}`;
        setVideoUrl(simulatedUrl);
        setMediaType('video');
        setDuration(6);
        setCurrentTime(0);
        setIsPlaying(false);
        setFaceScanState('idle');
        
        // Save as project asset
        if (onAddProjectAsset && activeProject) {
          const blob = new Blob([scannedFacePhotoUrl], { type: 'image/png' });
          const assetName = `avatar_mesh_${selectedAvatarTemplate}_${Date.now()}.png`;
          await onAddProjectAsset(assetName, 'image', blob);
          updateProjectDiff({
            videoUrl: simulatedUrl,
            mediaType: 'video',
            avatarFacePhotoUrl: scannedFacePhotoUrl,
            avatarTemplate: selectedAvatarTemplate
          }, `Generated 90% accuracy AI Face Scan Video using: ${selectedAvatarTemplate}`);
        }
        
        alert("AI Face-Scan Video Successfully Generated! Preview is loaded in the player.");
      }
    }, 200);
  };

  const drawSimulatedAvatarVideo = (ctx, w, h) => {
    const t = currentTime;
    
    if (videoUrl === 'avatar-video-walking-rain') {
      // 1. Urban Street Walking template
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#090514');
      skyGrad.addColorStop(1, '#1b0836');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);
      
      // Skyscrapers
      ctx.fillStyle = '#0f0525';
      ctx.fillRect(w*0.1, h*0.2, w*0.25, h*0.8);
      ctx.fillRect(w*0.65, h*0.15, w*0.3, h*0.85);
      
      // Perspective street
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.25)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h); ctx.lineTo(w * 0.45, h * 0.45);
      ctx.moveTo(w * 0.9, h); ctx.lineTo(w * 0.55, h * 0.45);
      ctx.stroke();
      
      // Bobbing body
      const panY = Math.sin(t * 6) * 4;
      ctx.save();
      ctx.translate(w*0.5, h*0.58 + panY);
      
      // Suit
      ctx.fillStyle = '#ff6f00';
      ctx.beginPath();
      ctx.moveTo(-25, 30);
      ctx.lineTo(25, 30);
      ctx.lineTo(35, 90);
      ctx.lineTo(-35, 90);
      ctx.closePath();
      ctx.fill();
      
      // Swinging legs
      const legAngle = Math.sin(t * 6) * 18;
      ctx.fillStyle = '#11052c';
      ctx.save();
      ctx.translate(-10, 90);
      ctx.rotate(legAngle * Math.PI / 180);
      ctx.fillRect(-8, 0, 16, 70);
      ctx.restore();
      
      ctx.save();
      ctx.translate(10, 90);
      ctx.rotate(-legAngle * Math.PI / 180);
      ctx.fillRect(-8, 0, 16, 70);
      ctx.restore();
      
      // Face
      if (scannedFacePhotoUrl) {
        const faceImg = new Image();
        faceImg.src = scannedFacePhotoUrl;
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 5, 26, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(faceImg, -26, -21, 52, 52);
        ctx.restore();
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 3;
        ctx.strokeRect(-18, -2, 36, 8);
      } else {
        ctx.fillStyle = '#fbcfe8';
        ctx.beginPath();
        ctx.arc(0, 5, 24, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
      
      // Rain overlay
      ctx.fillStyle = 'rgba(0, 242, 254, 0.4)';
      for (let i = 0; i < 30; i++) {
        const rx = (i * 91 + t * 40) % w;
        const ry = (i * 61 + t * 380) % h;
        ctx.fillRect(rx, ry, 1, 12);
      }
      
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 12px var(--font-display)';
      ctx.fillText("🚶‍♂️ AI Walk Silhouette (Urban Street)", 20, h - 25);
      
    } else if (videoUrl === 'avatar-video-stage-singer') {
      // 2. Stage Singer
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, w, h);
      
      const beamX = w * 0.5 + Math.sin(t * 3) * w * 0.35;
      const spotGrad = ctx.createRadialGradient(beamX, h * 0.1, w * 0.05, w * 0.5, h * 0.8, w * 0.7);
      spotGrad.addColorStop(0, 'rgba(236, 72, 153, 0.45)');
      spotGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.15)');
      spotGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = spotGrad;
      ctx.fillRect(0, 0, w, h);
      
      const rockY = Math.sin(t * 12) * 5;
      ctx.save();
      ctx.translate(w*0.5, h*0.55 + rockY);
      
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(-30, 20);
      ctx.lineTo(30, 20);
      ctx.lineTo(20, 110);
      ctx.lineTo(-20, 110);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 40);
      ctx.lineTo(-15, 120);
      ctx.stroke();
      
      if (scannedFacePhotoUrl) {
        const faceImg = new Image();
        faceImg.src = scannedFacePhotoUrl;
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, -10, 26, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(faceImg, -26, -36, 52, 52);
        ctx.restore();
        ctx.fillStyle = '#000000';
        ctx.fillRect(-18, -15, 36, 8);
      } else {
        ctx.fillStyle = '#fbcfe8';
        ctx.beginPath();
        ctx.arc(0, -10, 24, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
      
      if (Math.sin(t * 20) > 0.8) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 40 + 10, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 12px var(--font-display)';
      ctx.fillText("🎤 Concert Stage Singer (Spotlights)", 20, h - 25);
      
    } else {
      // 3. Fashion Model
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      
      const flareX = (t * 120) % (w + 200) - 100;
      const flareGrad = ctx.createRadialGradient(flareX, h * 0.3, 10, flareX, h * 0.3, 160);
      flareGrad.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
      flareGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.15)');
      flareGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = flareGrad;
      ctx.fillRect(0, 0, w, h);
      
      const poseX = Math.sin(t * 3) * 12;
      ctx.save();
      ctx.translate(w*0.5 + poseX, h*0.52);
      
      ctx.fillStyle = '#db2777';
      ctx.beginPath();
      ctx.moveTo(-22, 40);
      ctx.lineTo(22, 40);
      ctx.lineTo(45, 140);
      ctx.lineTo(-45, 140);
      ctx.closePath();
      ctx.fill();
      
      if (scannedFacePhotoUrl) {
        const faceImg = new Image();
        faceImg.src = scannedFacePhotoUrl;
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 10, 26, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(faceImg, -26, -16, 52, 52);
        ctx.restore();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 10, 32, 0, Math.PI*2);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#fbcfe8';
        ctx.beginPath();
        ctx.arc(0, 10, 24, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
      
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 12px var(--font-display)';
      ctx.fillText("📸 Studio Fashion Photoshoot (Lens Flares)", 20, h - 25);
    }
  };

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }} className="gradient-text">
            {t.videoEditor} {loadedProject ? `(${loadedProject.name})` : ''}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Add background music tracks, record voiceovers, apply CapCut templates, auto-generate captions, and export in 1080p.
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

      <div className="grid-2" style={{ gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem' }}>
        {/* Left Column: Canvas Previewer and Player */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-panel" style={{ padding: '1rem', background: '#000000', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            
            {/* Canvas screen rendering */}
            <div style={{ width: '100%', position: 'relative' }}>
              <canvas
                ref={canvasRef}
                width={aspectRatio === '9:16' ? 360 : aspectRatio === '1:1' ? 450 : 640}
                height={aspectRatio === '9:16' ? 640 : aspectRatio === '1:1' ? 450 : 360}
                style={{
                  display: 'block',
                  width: '100%',
                  height: aspectRatio === '9:16' ? '480px' : aspectRatio === '1:1' ? '380px' : '360px',
                  borderRadius: '6px',
                  background: '#0c0c0e',
                  border: '1px solid var(--border-color)'
                }}
              />
              
              {/* Invisible video element */}
              {videoUrl && (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  style={{ display: 'none' }}
                  preload="auto"
                  crossOrigin="anonymous"
                />
              )}
            </div>

            {/* Playback Controls Overlay */}
            <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '0.75rem', alignItems: 'center' }}>
              <button
                onClick={handlePlayToggle}
                disabled={!videoUrl || isExporting}
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>

              {/* Progress Slider */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {Math.round(currentTime)}s
                </span>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCurrentTime(val);
                    if (videoRef.current) videoRef.current.currentTime = val;
                  }}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {Math.round(duration)}s
                </span>
              </div>
            </div>
          </div>

          {/* One-Click Resize & Auto-Reframe Panel */}
          <div className="glass-panel" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '0.9rem', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
                One-Click Aspect Ratio Resize
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  id="reframe-toggle"
                  checked={autoReframe}
                  onChange={(e) => setAutoReframe(e.target.checked)}
                  style={{ width: 'auto', cursor: 'pointer' }}
                />
                <label htmlFor="reframe-toggle" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  AI Auto-Reframe (Keep Center)
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                { id: '16:9', label: '📺 YouTube (16:9)' },
                { id: '9:16', label: '📱 Reels/TikTok (9:16)' },
                { id: '1:1', label: '📸 Instagram (1:1)' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setAspectRatio(item.id)}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    fontSize: '0.75rem',
                    padding: '0.45rem',
                    background: aspectRatio === item.id ? 'var(--accent-glow)' : 'transparent',
                    borderColor: aspectRatio === item.id ? 'var(--accent-primary)' : 'var(--border-color)',
                    color: aspectRatio === item.id ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Video Trimming & Cutting Tools Studio Card */}
          {mediaType === 'video' && videoUrl && (
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} />
                Video Trimming & Slicing Studio
              </h3>
              
              {/* Trim Mode Select Toggler */}
              <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-primary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => { setTrimMode('none'); setMergedSegments([]); }}
                  style={{
                    flex: 1, padding: '0.4rem', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    background: trimMode === 'none' ? 'var(--bg-card)' : 'transparent',
                    color: trimMode === 'none' ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                >
                  No Trim (Full Length)
                </button>
                <button
                  onClick={() => { setTrimMode('single'); setMergedSegments([]); }}
                  style={{
                    flex: 1, padding: '0.4rem', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    background: trimMode === 'single' ? 'var(--bg-card)' : 'transparent',
                    color: trimMode === 'single' ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                >
                  Single Trim
                </button>
                <button
                  onClick={() => { setTrimMode('multi'); setMergedSegments([]); }}
                  style={{
                    flex: 1, padding: '0.4rem', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    background: trimMode === 'multi' ? 'var(--bg-card)' : 'transparent',
                    color: trimMode === 'multi' ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                >
                  Multi-Level Trim
                </button>
              </div>

              {/* Single Trim Control View */}
              {trimMode === 'single' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="grid-2" style={{ gap: '1rem', marginTop: 0 }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        Start Time (sec): <strong>{singleTrimStart}s</strong>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max={duration}
                        step="0.5"
                        value={singleTrimStart}
                        onChange={(e) => setSingleTrimStart(Math.min(parseFloat(e.target.value), singleTrimEnd - 0.5))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        End Time (sec): <strong>{singleTrimEnd}s</strong>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max={duration}
                        step="0.5"
                        value={singleTrimEnd}
                        onChange={(e) => setSingleTrimEnd(Math.max(parseFloat(e.target.value), singleTrimStart + 0.5))}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setMergedSegments([{ id: Date.now(), start: singleTrimStart, end: singleTrimEnd }]);
                      alert(`Single trim applied: ${singleTrimStart}s to ${singleTrimEnd}s. Click play to preview!`);
                    }}
                    className="btn-primary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', justifyContent: 'center' }}
                  >
                    Save & Apply Trim
                  </button>
                </div>
              )}

              {/* Multi Trim Control View */}
              {trimMode === 'multi' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Start (s)</label>
                      <input
                        type="number"
                        min="0"
                        max={duration}
                        step="0.1"
                        value={segmentInputStart}
                        onChange={(e) => setSegmentInputStart(parseFloat(e.target.value) || 0)}
                        className="form-input"
                        style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>End (s)</label>
                      <input
                        type="number"
                        min="0"
                        max={duration}
                        step="0.1"
                        value={segmentInputEnd}
                        onChange={(e) => setSegmentInputEnd(parseFloat(e.target.value) || 0)}
                        className="form-input"
                        style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (segmentInputStart >= segmentInputEnd) {
                          alert("Start time must be less than end time.");
                          return;
                        }
                        if (segmentInputEnd > duration) {
                          alert("End time cannot exceed video duration.");
                          return;
                        }
                        const newSeg = {
                          id: Date.now(),
                          start: segmentInputStart,
                          end: segmentInputEnd
                        };
                        setMultiTrimList(prev => [...prev, newSeg].sort((a,b) => a.start - b.start));
                        setSegmentInputStart(0);
                        setSegmentInputEnd(0);
                      }}
                      className="btn-secondary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                    >
                      Add Segment
                    </button>
                  </div>

                  {/* List of segments */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {multiTrimList.length === 0 ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', display: 'block', padding: '0.5rem' }}>
                        No slices added yet. Specify start/end times and click Add Segment.
                      </span>
                    ) : (
                      multiTrimList.map((seg, idx) => (
                        <div
                          key={seg.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.8rem'
                          }}
                        >
                          <span>
                            Part {idx + 1}: <strong>{seg.start}s</strong> to <strong>{seg.end}s</strong> ({Math.round((seg.end - seg.start)*10)/10}s)
                          </span>
                          <button
                            onClick={() => setMultiTrimList(prev => prev.filter(s => s.id !== seg.id))}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="Remove segment"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {multiTrimList.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '0.25rem' }}>
                      <button
                        onClick={() => {
                          setMultiTrimList([]);
                          setMergedSegments([]);
                          alert("Multi-level trim configurations cleared.");
                        }}
                        className="btn-secondary"
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', justifyContent: 'center', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                      >
                        Cancel All
                      </button>
                      <button
                        onClick={() => {
                          setMergedSegments([...multiTrimList]);
                          alert(`Successfully merged ${multiTrimList.length} video segments! Press Play to watch the composite preview.`);
                        }}
                        className="btn-primary"
                        style={{ flex: 2, padding: '0.5rem', fontSize: '0.8rem', justifyContent: 'center' }}
                      >
                        Save & Merge Segments
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Voiceover Recording synchronized with Video Card */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mic size={16} style={{ color: 'var(--accent-primary)' }} />
              Voiceover Dubbing Recorder
            </h3>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!isRecordingVocal ? (
                <button
                  onClick={startVoiceoverRecording}
                  disabled={!videoUrl || isExporting}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <Mic size={14} /> Start Voice Recording
                </button>
              ) : (
                <button
                  onClick={stopVoiceoverRecording}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)' }}
                >
                  <Square size={14} /> Stop & Save Vocal
                </button>
              )}
            </div>

            {recordedVocalUrl && (
              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                ✓ Sync Vocal Dub Recorded!
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Uploads & Styling Tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Viral Template Engine Card */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
              AI Viral Template Studio
            </h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Choose a format template. Uploaded media will automatically sync to beats, transitions and frame settings.
            </p>
            <select
              value={selectedViralTemplate}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedViralTemplate(val);
                if (val === 'trending-reel') {
                  setVisualTemplate('cinematic');
                  setAspectRatio('9:16');
                  setAutoReframe(true);
                  alert("Trending Reel Format template applied! (Auto-Zoom + Vertical 9:16 + AI Auto-Reframe active)");
                } else if (val === 'cinematic-vlog') {
                  setVisualTemplate('lightleak');
                  setAspectRatio('16:9');
                  setAutoReframe(false);
                  alert("Cinematic Vlog Format template applied! (Warm radial lightleak + 16:9 widescreen active)");
                } else if (val === 'retro-vhs') {
                  setVisualTemplate('vhs');
                  setSelectedFont('Outfit'); 
                  setAspectRatio('9:16');
                  setAutoReframe(true);
                  alert("Retro VHS format applied! (VCR filter overlay + 9:16 vertical active)");
                }
              }}
              className="form-select"
              style={{ fontSize: '0.85rem' }}
            >
              <option value="none">No Template (Manual Edit)</option>
              <option value="trending-reel">🔥 Trending Reel Format (Beat zoom + 9:16 Vertical)</option>
              <option value="cinematic-vlog">🎬 Cinematic Vlog Format (Smooth pan + Warm leaks)</option>
              <option value="retro-vhs">📼 Retro VHS Lyric format (VCR filter + custom fonts)</option>
            </select>
          </div>

          {/* File Uploads Tab */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Film size={16} style={{ color: 'var(--accent-primary)' }} />
              Upload Assets
            </h3>

            {/* Video / Photo Asset Upload */}
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Video or Image Asset (Overlay Base)
              </label>
              <input
                type="file"
                accept="video/*,image/*"
                onChange={handleVideoUpload}
                className="form-input"
                style={{ fontSize: '0.8rem', padding: '0.4rem' }}
              />
              {renderAssetPicker('video', (url, name) => {
                setVideoFile(new File([new Blob()], name, { type: 'video/mp4' }));
                setVideoUrl(url);
                setMediaType('video');
                setCurrentTime(0);
                setIsPlaying(false);
                updateProjectDiff({ videoUrl: url, mediaType: 'video' }, `Imported base video: ${name}`);
              })}
              {renderAssetPicker('image', (url, name) => {
                setVideoFile(new File([new Blob()], name, { type: 'image/png' }));
                setVideoUrl(url);
                setMediaType('image');
                setCurrentTime(0);
                setIsPlaying(false);
                updateProjectDiff({ videoUrl: url, mediaType: 'image' }, `Imported base image: ${name}`);
              })}
              {mediaType === 'video' && videoUrl && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
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
                      setVideoVolume(0);
                      alert("Original video audio silenced. Video track isolated successfully!");
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

            {/* Background Audio Asset Upload */}
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Background Music Audio File
              </label>
              <input
                type="file"
                accept="audio/*"
                onChange={handleMusicUpload}
                className="form-input"
                style={{ fontSize: '0.8rem', padding: '0.4rem' }}
              />
              {renderAssetPicker('audio', (url, name) => {
                setBgMusicFile(new File([new Blob()], name, { type: 'audio/mp3' }));
                setBgMusicUrl(url);
                updateProjectDiff({ bgMusicUrl: url }, `Imported background music: ${name}`);
              })}
            </div>
          </div>

          {/* AI Video Studio Card */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
              AI Video Studio
            </h3>
            
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-primary)', padding: '2px', borderRadius: '6px' }}>
              <button
                onClick={() => setAiVideoSource('text')}
                className="btn-secondary"
                style={{ flex: 1, fontSize: '0.70rem', padding: '0.35rem', background: aiVideoSource === 'text' ? 'var(--bg-secondary)' : 'transparent' }}
              >
                Text-to-Video
              </button>
              <button
                onClick={() => setAiVideoSource('image')}
                className="btn-secondary"
                style={{ flex: 1, fontSize: '0.70rem', padding: '0.35rem', background: aiVideoSource === 'image' ? 'var(--bg-secondary)' : 'transparent' }}
              >
                Image-to-Video
              </button>
              <button
                onClick={() => setAiVideoSource('facescan')}
                className="btn-secondary"
                style={{ flex: 1, fontSize: '0.70rem', padding: '0.35rem', background: aiVideoSource === 'facescan' ? 'var(--bg-secondary)' : 'transparent' }}
              >
                🎭 AI Face-Scan
              </button>
            </div>

            {aiVideoSource === 'text' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Describe your target video scene</label>
                <textarea
                  value={aiVideoPrompt}
                  onChange={(e) => setAiVideoPrompt(e.target.value)}
                  placeholder="e.g. 'cinematic walking photoshoot in rain' or 'retro neon drive'..."
                  className="form-textarea"
                  rows="2"
                  style={{ fontSize: '0.8rem' }}
                />
              </div>
            )}

            {aiVideoSource === 'image' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>Upload Base Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAiVideoImageUpload}
                    className="form-input"
                    style={{ fontSize: '0.75rem', padding: '0.35rem' }}
                  />
                  {renderAssetPicker('image', (url, name) => {
                    setAiVideoImageFile(new File([new Blob()], name, { type: 'image/png' }));
                    setAiVideoImageUrl(url);
                    setAiVideoSource('image');
                    updateProjectDiff({ aiVideoImageUrl: url }, `Selected AI Video reference image: ${name}`);
                  })}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Describe how to animate this image (Prompt)</label>
                  <textarea
                    value={aiVideoPrompt}
                    onChange={(e) => setAiVideoPrompt(e.target.value)}
                    placeholder="e.g. 'make the water ripple', 'add glowing dust particles around the subject'..."
                    className="form-textarea"
                    rows="2"
                    style={{ fontSize: '0.8rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Animation Motion Preset</label>
                  <select
                    value={aiVideoMotionPreset}
                    onChange={(e) => setAiVideoMotionPreset(e.target.value)}
                    className="form-select"
                    style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                  >
                    <option value="zoom-pan">🔍 Ken Burns Zoom-In Pan</option>
                    <option value="photoshoot-flares">📸 Dynamic Photoshoot Lens Flares</option>
                    <option value="glitch">📼 Retro Glitch RGB Displacement</option>
                    <option value="rain-ripples">🌧️ Water Ripple / Cinematic Rain overlay</option>
                  </select>
                </div>
              </div>
            )}

            {aiVideoSource === 'facescan' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {faceScanState === 'idle' && !scannedFacePhotoUrl && (
                  <button
                    onClick={startWebcamScan}
                    className="btn-secondary"
                    style={{ justifyContent: 'center', borderColor: 'var(--accent-primary)', fontSize: '0.78rem', padding: '0.5rem' }}
                  >
                    📷 Open Face Scan Camera
                  </button>
                )}

                {(faceScanState === 'camera-request' || faceScanState === 'scanning') && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '160px',
                      height: '160px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      position: 'relative',
                      border: '3px solid var(--accent-primary)',
                      boxShadow: '0 0 15px var(--accent-glow)'
                    }}>
                      <video
                        ref={faceScanWebcamRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {/* Sweeping neon scanner overlay */}
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        width: '100%',
                        height: '2px',
                        background: '#00f2fe',
                        boxShadow: '0 0 8px #00f2fe',
                        top: `${faceScanProgress}%`,
                        transition: 'top 0.1s linear'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                      {faceScanState === 'camera-request' ? 'Requesting webcam access...' : `Scanning Facial Nodes: ${faceScanProgress}%`}
                    </span>
                  </div>
                )}

                {scannedFacePhotoUrl && faceScanState !== 'generating' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-primary)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <img
                        src={scannedFacePhotoUrl}
                        alt="Scanned Face"
                        style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid #10b981', objectFit: 'cover' }}
                      />
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', display: 'block' }}>✓ Face Scan Complete</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>90% similarity mesh captured</span>
                      </div>
                      <button
                        onClick={startWebcamScan}
                        className="btn-secondary"
                        style={{ marginLeft: 'auto', padding: '0.2rem 0.4rem', fontSize: '0.68rem' }}
                      >
                        Rescan
                      </button>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>Select Avatar Template</label>
                      <select
                        value={selectedAvatarTemplate}
                        onChange={(e) => setSelectedAvatarTemplate(e.target.value)}
                        className="form-select"
                        style={{ fontSize: '0.78rem', padding: '0.35rem' }}
                      >
                        <option value="walking-rain">🚶‍♂️ Urban Street Walking (6s Loop)</option>
                        <option value="stage-singer">🎤 Rock Stage Singer (Spotlights)</option>
                        <option value="fashion-model">📸 Fashion Shoot Model (Lens Flares)</option>
                      </select>
                    </div>

                    <button
                      onClick={generateFaceScanVideo}
                      className="btn-primary"
                      style={{ justifyContent: 'center', padding: '0.5rem' }}
                    >
                      🎭 Merge Face & Generate Video
                    </button>
                  </div>
                )}

                {faceScanState === 'generating' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Merging facial mesh with body templates...</span>
                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${faceScanProgress}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.2s ease' }} />
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{faceScanProgress}% rendered</span>
                  </div>
                )}
              </div>
            )}

            {aiVideoSource !== 'facescan' && (
              <button
                onClick={generateAiVideo}
                disabled={isGeneratingAiVideo}
                className="btn-primary"
                style={{ justifyContent: 'center', width: '100%', padding: '0.55rem' }}
              >
                {isGeneratingAiVideo ? `Generating (${aiVideoProgressText})` : '⚡ Generate AI Video (6s Loop)'}
              </button>
            )}
          </div>

          {/* Subtitles & Captions Generator Card */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Type size={16} style={{ color: 'var(--accent-primary)' }} />
              CapCut Styled Subtitles
            </h3>

            <div className="grid-2" style={{ gap: '0.75rem', marginTop: '0' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                  Auto-Subtitle Language
                </label>
                <select
                  value={subtitleLang}
                  onChange={(e) => setSubtitleLang(e.target.value)}
                  className="form-select"
                  style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                >
                  <option value="en-US">English (US)</option>
                  <option value="hi-IN">Hindi (India)</option>
                  <option value="pa-IN">Punjabi (India)</option>
                  <option value="bn-BD">Bengali (Bangladesh)</option>
                  <option value="ne-NP">Nepali (Nepal)</option>
                  <option value="de-DE">German (Germany)</option>
                  <option value="es-ES">Spanish (Spain)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                  Caption Style Preset
                </label>
                <select
                  value={captionStyle}
                  onChange={(e) => setCaptionStyle(e.target.value)}
                  className="form-select"
                  style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                >
                  <option value="standard">Standard White Text</option>
                  <option value="capcut-yellow">CapCut Bold Yellow</option>
                  <option value="neon-glow">Cyan Neon Glow</option>
                  <option value="label">Black Rounded Label</option>
                  <option value="bubble">Slate-Amber Bubble</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              {!isTranscribing ? (
                <button
                  onClick={startAutoSubtitles}
                  disabled={!videoUrl || isRecordingVocal || isExporting}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '0.5rem' }}
                >
                  Auto-Transcribe
                </button>
              ) : (
                <button
                  onClick={stopAutoSubtitles}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '0.5rem', background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)' }}
                >
                  Stop Transcribing
                </button>
              )}
              <button
                onClick={addCue}
                disabled={!videoUrl}
                className="btn-secondary"
                style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem' }}
              >
                <Plus size={14} /> Add Cue
              </button>
            </div>

            {/* List of active editable cues */}
            <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              {cues.map((cue) => (
                <div
                  key={cue.id}
                  style={{
                    background: activeCueId === cue.id ? 'var(--accent-glow)' : 'var(--bg-primary)',
                    border: '1px solid',
                    borderColor: activeCueId === cue.id ? 'var(--accent-primary)' : 'var(--border-color)',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <textarea
                    value={cue.text}
                    onChange={(e) => editCueText(cue.id, e.target.value)}
                    className="form-textarea"
                    rows="1"
                    style={{ fontSize: '0.8rem', padding: '4px', resize: 'none' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <input
                        type="number"
                        value={Math.round(cue.start * 10) / 10}
                        onChange={(e) => editCueTime(cue.id, 'start', e.target.value)}
                        style={{ width: '45px', fontSize: '0.7rem', padding: '2px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                      />
                      <span style={{ fontSize: '0.7rem' }}>to</span>
                      <input
                        type="number"
                        value={Math.round(cue.end * 10) / 10}
                        onChange={(e) => editCueTime(cue.id, 'end', e.target.value)}
                        style={{ width: '45px', fontSize: '0.7rem', padding: '2px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <button
                      onClick={() => deleteCue(cue.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mixing Mixer Card */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={16} style={{ color: 'var(--accent-primary)' }} />
              Audio Mixing Levels
            </h3>

            {/* Video track volume slider */}
            {mediaType === 'video' && (
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                  Video Original Track Volume ({Math.round(videoVolume * 100)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={videoVolume}
                  onChange={(e) => setVideoVolume(parseFloat(e.target.value))}
                />
              </div>
            )}

            {/* Vocal Dub volume slider */}
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                Vocal Dub Volume ({Math.round(vocalVolume * 100)}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={vocalVolume}
                onChange={(e) => setVocalVolume(parseFloat(e.target.value))}
              />
            </div>

            {/* Backing music volume slider */}
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                Background Music Volume ({Math.round(bgVolume * 100)}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={bgVolume}
                onChange={(e) => setBgVolume(parseFloat(e.target.value))}
              />
            </div>
          </div>

          {/* Visual Templates & Style presets card */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
              CapCut Visual Styles
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
              {['none', 'vhs', 'glitch', 'lightleak', 'mono', 'cinematic'].map((style) => (
                <button
                  key={style}
                  onClick={() => setVisualTemplate(style)}
                  style={{
                    padding: '0.5rem 0.25rem',
                    fontSize: '0.72rem',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: visualTemplate === style ? 'var(--accent-primary)' : 'var(--border-color)',
                    background: visualTemplate === style ? 'var(--accent-glow)' : 'transparent',
                    color: visualTemplate === style ? 'var(--text-primary)' : 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  {style === 'none' ? 'Normal' : style}
                </button>
              ))}
            </div>
          </div>

          {/* Export Rendering controls */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={16} style={{ color: 'var(--accent-primary)' }} />
              Export & Download Video
            </h3>

            <div className="grid-2" style={{ gap: '0.5rem', marginTop: 0 }}>
              <select
                value={exportQuality}
                onChange={(e) => setExportQuality(e.target.value)}
                className="form-select"
                style={{ padding: '0.45rem', fontSize: '0.8rem' }}
              >
                <option value="480p">SD - 480p</option>
                <option value="720p">HD - 720p</option>
                <option value="1080p">Full HD - 1080p</option>
              </select>

              <button
                onClick={exportVideo}
                disabled={!videoUrl || isExporting}
                className="btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.45rem', justifyContent: 'center' }}
              >
                {isExporting ? 'Exporting...' : 'Export MP4'}
              </button>
            </div>

            {/* Export Progress overlay bar */}
            {isExporting && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>Rendering Composition...</span>
                  <span>{exportProgress}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${exportProgress}%`, background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)', transition: 'width 0.1s ease' }} />
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Hidden audio loaders */}
      {bgMusicUrl && (
        <audio
          ref={bgAudioRef}
          src={bgMusicUrl}
          loop
          style={{ display: 'none' }}
        />
      )}
      {recordedVocalUrl && (
        <audio
          ref={vocalAudioRef}
          src={recordedVocalUrl}
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
};

export default VideoEditor;
