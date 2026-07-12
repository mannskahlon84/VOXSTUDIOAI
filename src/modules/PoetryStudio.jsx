import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, RotateCcw, Volume2, Upload, FileText, Download, Mic, Sparkles, Music, Film, Video, Image } from 'lucide-react';
import { translations } from '../assets/translations';
import { safeStorage, safeJsonParse } from '../utils/storage';

const PoetryStudio = ({ language, theme, user, loadedProject, activeProject, onUpdateProjectState, onAddProjectAsset }) => {
  const t = translations[language] || translations.en;

  // States
  const [poemText, setPoemText] = useState(
    `Had I the heavens' embroidered cloths,\n` +
    `Enwrought with golden and silver light,\n` +
    `I would spread the cloths under your feet:\n` +
    `But I, being poor, have only my dreams;\n` +
    `I have spread my dreams under your feet;\n` +
    `Tread softly because you tread on my dreams.\n\n` +
    `- W. B. Yeats`
  );

  const [fontSize, setFontSize] = useState(22);
  const [scrollSpeed, setScrollSpeed] = useState(15); 
  const [isScrolling, setIsScrolling] = useState(false);

  // Soundscape backings state
  const [soundscape, setSoundscape] = useState('rain'); // 'rain', 'fire', 'piano', 'none', 'upload'
  const [bgVolume, setBgVolume] = useState(0.4);
  const [customBgUrl, setCustomBgUrl] = useState('');
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState('');

  // AI Shayari Generator State
  const [selectedTheme, setSelectedTheme] = useState('love');
  
  // Emotive TTS Tone State
  const [emotiveTone, setEmotiveTone] = useState('dramatic'); // 'normal', 'dramatic', 'soft', 'energetic'
  const [isSynthesizingTTS, setIsSynthesizingTTS] = useState(false);

  // Lyric Video Rendering & Export
  const [lyricTemplate, setLyricTemplate] = useState('sunset'); // 'sunset', 'neon', 'rainy', 'starry', 'photo'
  const [selectedTextStyle, setSelectedTextStyle] = useState('elegant'); // 'elegant', 'neon', 'retro-tag', 'bubble'
  const [isExportingLyricVideo, setIsExportingLyricVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Photo Backdrop Upload
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoFile, setPhotoFile] = useState(null);

  // Video Backdrop Upload
  const [backdropVideoUrl, setBackdropVideoUrl] = useState('');
  const [backdropVideoFile, setBackdropVideoFile] = useState(null);

  // Recovery trigger on load
  useEffect(() => {
    const savedDraftStr = safeStorage.getItem('vox_autosaved_poetry_draft');
    if (savedDraftStr) {
      const draft = safeJsonParse(savedDraftStr, null);
      if (draft && draft.poemText) {
        const restore = window.confirm("We found an unsaved poetry draft from your last session. Would you like to continue editing it?");
        if (restore) {
          if (draft.poemText !== undefined) setPoemText(draft.poemText);
          if (draft.photoUrl !== undefined) setPhotoUrl(draft.photoUrl);
          if (draft.backdropVideoUrl !== undefined) setBackdropVideoUrl(draft.backdropVideoUrl);
          if (draft.soundscape !== undefined) setSoundscape(draft.soundscape);
          if (draft.bgVolume !== undefined) setBgVolume(draft.bgVolume);
          if (draft.fontSize !== undefined) setFontSize(draft.fontSize);
          if (draft.selectedTextStyle !== undefined) setSelectedTextStyle(draft.selectedTextStyle);
          if (draft.scrollSpeed !== undefined) setScrollSpeed(draft.scrollSpeed);
        } else {
          safeStorage.removeItem('vox_autosaved_poetry_draft');
        }
      }
    }
  }, []);

  // Auto-save draft on state updates
  useEffect(() => {
    if (poemText.trim()) {
      const draftObj = {
        poemText,
        photoUrl,
        backdropVideoUrl,
        soundscape,
        bgVolume,
        fontSize,
        selectedTextStyle,
        scrollSpeed,
        timestamp: Date.now()
      };
      safeStorage.setItem('vox_autosaved_poetry_draft', JSON.stringify(draftObj));
    }
  }, [poemText, photoUrl, backdropVideoUrl, soundscape, bgVolume, fontSize, selectedTextStyle, scrollSpeed]);

  // Synchronize local states with activeProject snapshot parameters
  useEffect(() => {
    if (activeProject) {
      if (activeProject.lyricsText !== undefined) setPoemText(activeProject.lyricsText);
      if (activeProject.poetryBackdropUrl !== undefined) {
        if (activeProject.poetryBackdropType === 'image') {
          setPhotoUrl(activeProject.poetryBackdropUrl);
        } else {
          setBackdropVideoUrl(activeProject.poetryBackdropUrl);
        }
      }
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
      if (typeFilter === 'text') return a.name.endsWith('.txt') || a.type === 'lyrics';
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

  // Refs for scroll and audio
  const scrollerRef = useRef(null);
  const scrollIntervalRef = useRef(null);
  const micStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const bgAudioRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasLoopRef = useRef(null);
  
  const backdropImageRef = useRef(null);
  const backdropVideoRef = useRef(null);

  // Soundscape URLs (free public loop files)
  const soundscapeUrls = {
    rain: 'https://assets.mixkit.co/active_storage/sfx/2433/2433-84.wav', 
    fire: 'https://assets.mixkit.co/active_storage/sfx/2432/2432-84.wav', 
    piano: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 
  };

  // Shayari Database
  const shayariDatabase = {
    love: [
      [
        "Mohabbat ki raahon mein dard toh milega,",
        "Par is dard mein hi jeena ka maza milega.",
        "Tum saath chalne ka vaada toh karo,",
        "Har mod par humara sahara milega."
      ],
      [
        "Tere bina guzar toh jayegi yeh zindagi,",
        "Magar is zindagi mein koi khushi na hogi.",
        "Tu mil jaye toh mil jaye saari duniya,",
        "Warna is dil mein hamesha teri kami rahegi."
      ]
    ],
    friendship: [
      [
        "Dosti ka rishta sabse anokha hota hai,",
        "Yeh dil ke sabse kareeb hota hai.",
        "Dost mile toh mil jati hai khushiyaan saari,",
        "Har mushkil raah mein dosti ka saath hota hai."
      ],
      [
        "Har mod par rishton mein badlaav aata hai,",
        "Par sachhi dosti ka rishta kabhi na toot pata hai.",
        "Dost hi hote hain jo rote huye bhi hasa dete hain,",
        "Har mushkil ghadi mein dosti ka saaya nazar aata hai."
      ]
    ],
    sad: [
      [
        "Tanhaiyon mein rote hain jab yaad teri aati hai,",
        "Zindagi ki har ghadi ab hume satati hai.",
        "Socha tha bhool jayenge tumko magar,",
        "Dil ki dhadkan tere naam se hi dhadakti hai."
      ],
      [
        "Har zakhm dil ka ab gehra lagne laga hai,",
        "Zindagi ka har panna ab khali lagne laga hai.",
        "Mohabbat ke badle mili hai tanhayein aisi,",
        "Ki ab khud ka saaya bhi begana lagne laga hai."
      ]
    ],
    motivation: [
      [
        "Housle ke shiddat se har tufan ruk jayega,",
        "Rakh yakeen khud par tera waqt bhi aayega.",
        "Mushkilein toh aani-jaani hain zindgani mein,",
        "Mehnat ki aag mein kismat ka sona nikhrega."
      ],
      [
        "Manzil unhi ko milti hai jinke sapno mein jaan hoti hai,",
        "Pankhon se kuch nahi hota houslon se udaan hoti hai.",
        "Rakh hausla vo manzar bhi aayega,",
        "Pyaase ke paas chalkar samandar bhi aayega."
      ]
    ]
  };

  // Teleprompter scroll controller
  useEffect(() => {
    if (isScrolling && scrollerRef.current) {
      const el = scrollerRef.current;
      const totalScroll = el.scrollHeight - el.clientHeight;
      if (totalScroll <= 0) return;

      const step = () => {
        el.scrollTop += 0.75; 
        if (el.scrollTop >= totalScroll) {
          setIsScrolling(false);
          if (isRecording) handleStopAll();
        } else {
          scrollIntervalRef.current = requestAnimationFrame(step);
        }
      };

      scrollIntervalRef.current = requestAnimationFrame(step);
    } else {
      if (scrollIntervalRef.current) cancelAnimationFrame(scrollIntervalRef.current);
    }

    return () => {
      if (scrollIntervalRef.current) cancelAnimationFrame(scrollIntervalRef.current);
    };
  }, [isScrolling, isRecording]);

  // Sync loaded project drafts
  useEffect(() => {
    if (loadedProject && loadedProject.type === 'poetry') {
      const data = loadedProject.data;
      if (data) {
        if (data.poemText !== undefined) setPoemText(data.poemText);
        if (data.fontSize !== undefined) setFontSize(data.fontSize);
        if (data.soundscape !== undefined) setSoundscape(data.soundscape);
        if (data.bgVolume !== undefined) setBgVolume(data.bgVolume);
        if (data.emotiveTone !== undefined) setEmotiveTone(data.emotiveTone);
        if (data.lyricTemplate !== undefined) setLyricTemplate(data.lyricTemplate);
        if (data.selectedTextStyle !== undefined) setSelectedTextStyle(data.selectedTextStyle);
      }
    }
  }, [loadedProject]);

  const handleStartScrolling = () => {
    setIsScrolling(true);
  };

  const handlePauseScrolling = () => {
    setIsScrolling(false);
  };

  const handleResetScrolling = () => {
    setIsScrolling(false);
    if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
  };

  // Handle local background track upload
  const handleBgUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCustomBgUrl(URL.createObjectURL(file));
      setSoundscape('upload');
    }
  };

  // Handle Photo Backdrop Upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoUrl(URL.createObjectURL(file));
      setLyricTemplate('photo'); // Switch backdrop template to custom photo
    }
  };

  // Handle Video Backdrop Upload
  const handleBackdropVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBackdropVideoFile(file);
      setBackdropVideoUrl(URL.createObjectURL(file));
      setLyricTemplate('video'); // Switch backdrop template to custom video
    }
  };

  // Handle Text Lyrics File Upload
  const handleLyricsFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPoemText(event.target.result);
        handleResetScrolling();
        alert("Lyrics file successfully uploaded and loaded into Teleprompter!");
      };
      reader.readAsText(file);
    }
  };

  // Get active soundscape URL
  const getActiveBgUrl = () => {
    if (soundscape === 'upload') return customBgUrl;
    return soundscapeUrls[soundscape] || '';
  };

  // Start Sync Recording
  const handleStartAll = async () => {
    try {
      handleResetScrolling();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      // Play Soundscape
      const bgUrl = getActiveBgUrl();
      if (soundscape !== 'none' && bgUrl && bgAudioRef.current) {
        bgAudioRef.current.volume = bgVolume;
        bgAudioRef.current.currentTime = 0;
        bgAudioRef.current.play().catch(() => {});
      }

      // Play Backdrop Video
      if (lyricTemplate === 'video' && backdropVideoRef.current) {
        backdropVideoRef.current.currentTime = 0;
        backdropVideoRef.current.play().catch(() => {});
      }

      recorder.start();
      setIsRecording(true);
      setIsScrolling(true); 
    } catch (err) {
      console.error(err);
      alert(t.webcamPerms);
    }
  };

  // Stop Sync Recording
  const handleStopAll = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    setIsScrolling(false);
    if (bgAudioRef.current) bgAudioRef.current.pause();
    if (backdropVideoRef.current) backdropVideoRef.current.pause();
  };

  // Save current project draft
  const handleSaveProject = () => {
    const defaultName = loadedProject ? loadedProject.name : `Shayari Draft - ${new Date().toLocaleDateString()}`;
    const name = window.prompt("Enter a name for your draft:", defaultName);
    if (!name) return;

    const allProjects = JSON.parse(localStorage.getItem('vox_projects') || '[]');
    const owner = user ? user.email : 'guest';

    const existingIdx = allProjects.findIndex(p => 
      p.id === (loadedProject ? loadedProject.id : null) || 
      (p.name === name && p.owner === owner && p.type === 'poetry')
    );

    const projectObj = {
      id: existingIdx >= 0 ? allProjects[existingIdx].id : Date.now(),
      name: name.trim(),
      type: 'poetry',
      owner,
      updatedAt: Date.now(),
      data: {
        poemText,
        fontSize,
        soundscape,
        bgVolume,
        emotiveTone,
        lyricTemplate,
        selectedTextStyle
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

  // Procedural AI Shayari Generator
  const generateShayari = () => {
    const list = shayariDatabase[selectedTheme] || shayariDatabase.love;
    const randIdx = Math.floor(Math.random() * list.length);
    const verses = list[randIdx];
    
    const formattedText = verses.join('\n') + `\n\n- AI Shayari Creator (${selectedTheme})`;
    setPoemText(formattedText);
    handleResetScrolling();
  };

  // Emotive Voice cloning / TTS Synthesizer
  const synthesizeTTS = () => {
    if (!window.speechSynthesis) {
      alert("Speech Synthesis is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();
    setIsSynthesizingTTS(true);

    const cleanLines = poemText.split('\n').filter(line => line.trim().length > 0 && !line.startsWith('-'));
    const textToSpeak = cleanLines.join(', ');

    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    if (language === 'hi' || language === 'ne' || language === 'bn' || language === 'pa') {
      utterance.lang = 'hi-IN';
    } else {
      utterance.lang = 'en-US';
    }

    // Map emotive tone profiles
    if (emotiveTone === 'dramatic') {
      utterance.rate = 0.72; 
      utterance.pitch = 0.85; 
    } else if (emotiveTone === 'soft') {
      utterance.rate = 0.82; 
      utterance.pitch = 1.05;
    } else if (emotiveTone === 'energetic') {
      utterance.rate = 1.25; 
      utterance.pitch = 1.15; 
    } else {
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
    }

    utterance.onend = () => {
      setIsSynthesizingTTS(false);
    };

    utterance.onerror = () => {
      setIsSynthesizingTTS(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Stop current TTS speech
  const stopTTS = () => {
    window.speechSynthesis.cancel();
    setIsSynthesizingTTS(false);
  };

  // --- LYRIC VIDEO CANVAS DRAWING ENGINE ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particleArray = [];
    const createParticles = () => {
      particleArray = [];
      for (let i = 0; i < 40; i++) {
        particleArray.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 2.5 + 1,
          speedY: Math.random() * 0.4 + 0.1,
          alpha: Math.random() * 0.5 + 0.3
        });
      }
    };
    createParticles();

    let frameCount = 0;
    const drawFrame = () => {
      frameCount++;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // 1. Draw Background (Photo/Video backdrop or preset animations templates)
      if (lyricTemplate === 'video' && backdropVideoUrl && backdropVideoRef.current) {
        ctx.drawImage(backdropVideoRef.current, 0, 0, w, h);
        
        // Draw soft dim overlay to ensure text contrast
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(0, 0, w, h);
      } else if (lyricTemplate === 'photo' && photoUrl && backdropImageRef.current) {
        ctx.drawImage(backdropImageRef.current, 0, 0, w, h);
        
        // Draw soft dim overlay to ensure text contrast
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(0, 0, w, h);
      } else if (lyricTemplate === 'sunset') {
        const grad = ctx.createRadialGradient(w/2, h/2, 20, w/2, h/2, w/2);
        grad.addColorStop(0, '#f97316'); 
        grad.addColorStop(1, '#7f1d1d'); 
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      } else if (lyricTemplate === 'neon') {
        ctx.fillStyle = '#060608';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < w; i += 30) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
        }
        for (let j = 0; j < h; j += 30) {
          ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(w, j); ctx.stroke();
        }
      } else if (lyricTemplate === 'rainy') {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#1e293b'); 
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 15; i++) {
          const rx = (i * 45 + frameCount * 2) % w;
          const ry = (i * 25 + frameCount * 5) % h;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 3, ry + 15);
          ctx.stroke();
        }
      } else { // starry
        ctx.fillStyle = '#020617'; 
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#ffffff';
        particleArray.forEach(p => {
          p.y += p.speedY;
          if (p.y > h) p.y = 0;
          ctx.save();
          ctx.globalAlpha = p.alpha * (0.5 + 0.5 * Math.sin(frameCount * 0.05 + p.x));
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }

      // 2. Draw Lyrics text based on selected TikTok/CapCut layout style
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const lines = poemText.split('\n').filter(l => l.trim().length > 0 && !l.startsWith('-'));
      if (lines.length > 0) {
        const activeIdx = Math.floor(frameCount / 100) % lines.length;

        lines.forEach((line, index) => {
          const offsetIndex = index - activeIdx;
          const lineY = h / 2 + offsetIndex * 48;

          // Only render visible viewport elements
          if (lineY > 20 && lineY < h - 20) {
            const isCurrent = index === activeIdx;

            ctx.save();

            // Set font weight and size based on active template selection
            if (selectedTextStyle === 'elegant') {
              ctx.font = isCurrent ? 'bold 1.15rem Georgia, serif' : '1.0rem Georgia, serif';
              if (isCurrent) {
                // Centered translucent card backdrop behind text
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.beginPath();
                ctx.roundRect(w/2 - 160, lineY - 18, 320, 36, 6);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
              } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
              }
              ctx.fillText(line, w / 2, lineY);
            } 
            
            else if (selectedTextStyle === 'neon') {
              ctx.font = isCurrent ? 'bold 1.22rem system-ui' : '1.0rem system-ui';
              if (isCurrent) {
                ctx.shadowColor = '#06b6d4'; // Cyan neon shadow
                ctx.shadowBlur = 18;
                ctx.fillStyle = '#ec4899'; // Hot pink text
              } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
              }
              ctx.fillText(line, w / 2, lineY);
            } 
            
            else if (selectedTextStyle === 'retro-tag') {
              ctx.font = isCurrent ? 'bold 1.05rem monospace' : '0.92rem monospace';
              if (isCurrent) {
                // Dark typewriter background tag
                ctx.fillStyle = '#1e293b';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(w/2 - 170, lineY - 16, 340, 32, 4);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#10b981'; // Green retro output
              } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
              }
              ctx.fillText(line, w / 2, lineY);
            } 
            
            else if (selectedTextStyle === 'bubble') {
              ctx.font = isCurrent ? 'bold 1.12rem system-ui' : '0.95rem system-ui';
              if (isCurrent) {
                // CapCut style yellow bubble
                ctx.fillStyle = '#fbbf24';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.roundRect(w/2 - 180, lineY - 20, 360, 40, 15);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#000000';
              } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
              }
              ctx.fillText(line, w / 2, lineY);
            }

            ctx.restore();
          }
        });
      }

      canvasLoopRef.current = requestAnimationFrame(drawFrame);
    };

    canvasLoopRef.current = requestAnimationFrame(drawFrame);

    return () => {
      if (canvasLoopRef.current) cancelAnimationFrame(canvasLoopRef.current);
    };
  }, [poemText, lyricTemplate, selectedTextStyle, photoUrl]);

  // Export Dynamic Canvas + Music track as Lyric Video
  const handleExportLyricVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsExportingLyricVideo(true);
    setExportProgress(0);

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();

      const dest = audioCtx.createMediaStreamDestination();
      
      const bgUrl = getActiveBgUrl();
      let bgSource;
      if (soundscape !== 'none' && bgUrl) {
        const response = await fetch(bgUrl);
        const arrayBuf = await response.arrayBuffer();
        const audioBuf = await audioCtx.decodeAudioData(arrayBuf);

        bgSource = audioCtx.createBufferSource();
        bgSource.buffer = audioBuf;
        bgSource.loop = true;

        const bgGain = audioCtx.createGain();
        bgGain.gain.value = bgVolume;

        bgSource.connect(bgGain);
        bgGain.connect(dest);
      }

      const canvasStream = canvas.captureStream(30);
      dest.stream.getAudioTracks().forEach(track => canvasStream.addTrack(track));

      const recordedChunks = [];
      const recorder = new MediaRecorder(canvasStream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };

      recorder.onstop = async () => {
        const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(videoBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `voxstudio_lyrics_${Date.now()}.webm`;
        link.click();

        // Store video asset inside active project
        if (onAddProjectAsset && activeProject) {
          const assetName = `poetry_video_${Date.now()}.webm`;
          await onAddProjectAsset(assetName, 'video', videoBlob);
          updateProjectDiff({
            // visual video backdrop is saved to database
          }, `Exported visual lyric video: ${assetName}`);
        }

        if (bgSource) bgSource.stop();
        audioCtx.close();
        setIsExportingLyricVideo(false);
      };

      if (bgSource) bgSource.start(0);
      recorder.start();

      let prog = 0;
      const progInterval = setInterval(() => {
        prog += 12.5;
        setExportProgress(Math.min(100, Math.round(prog)));
        if (prog >= 100) {
          clearInterval(progInterval);
          recorder.stop();
        }
      }, 1000);

    } catch (e) {
      console.error(e);
      setIsExportingLyricVideo(false);
    }
  };

  const handleDownloadMixed = async () => {
    if (!recordedBlob) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const tempCtx = new AudioContext();

    const micArrayBuffer = await recordedBlob.arrayBuffer();
    const micAudioBuffer = await tempCtx.decodeAudioData(micArrayBuffer);

    const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const renderDuration = micAudioBuffer.duration;
    const offlineCtx = new OfflineCtx(2, tempCtx.sampleRate * renderDuration, tempCtx.sampleRate);

    const vocalSource = offlineCtx.createBufferSource();
    vocalSource.buffer = micAudioBuffer;
    vocalSource.connect(offlineCtx.destination);
    vocalSource.start(0);

    const bgUrl = getActiveBgUrl();
    if (soundscape !== 'none' && bgUrl) {
      try {
        const response = await fetch(bgUrl);
        const bgArrayBuffer = await response.arrayBuffer();
        const bgAudioBuffer = await tempCtx.decodeAudioData(bgArrayBuffer);

        const bgSource = offlineCtx.createBufferSource();
        bgSource.buffer = bgAudioBuffer;
        bgSource.loop = true;

        const bgGain = offlineCtx.createGain();
        bgGain.gain.value = bgVolume;

        bgSource.connect(bgGain);
        bgGain.connect(offlineCtx.destination);
        bgSource.start(0);
      } catch (err) {
        console.warn("Could not download background track for offline render", err);
      }
    }

    offlineCtx.startRendering().then(async (renderedBuffer) => {
      const wavBlob = audioBufferToWav(renderedBuffer);
      const url = URL.createObjectURL(wavBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `voxstudio_poetry_${Date.now()}.wav`;
      link.click();

      // Store audio asset inside active project
      if (onAddProjectAsset && activeProject) {
        const assetName = `poetry_rec_${Date.now()}.wav`;
        await onAddProjectAsset(assetName, 'audio', wavBlob);
        updateProjectDiff({
          // poetry audio mix is saved as asset
        }, `Compiled poetry narration overlay: ${assetName}`);
      }

      tempCtx.close();
    }).catch(err => {
      console.error(err);
      tempCtx.close();
    });
  };

  const audioBufferToWav = (buffer) => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArr = new ArrayBuffer(length);
    const view = new DataView(bufferArr);
    const channels = [];
    let i, sample, offset = 0, pos = 0;

    const setUint32 = (data) => { view.setUint32(pos, data, true); pos += 4; };
    const setUint16 = (data) => { view.setUint16(pos, data, true); pos += 2; };

    setUint32(0x46464952); 
    setUint32(length - 8);
    setUint32(0x45564157); 
    setUint32(0x20746d66); 
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * numOfChan * 2);
    setUint16(numOfChan * 2);
    setUint16(16);
    setUint32(0x61746164); 
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

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }} className="gradient-text">
            Shayri/Poetry Studio {loadedProject ? `(${loadedProject.name})` : ''}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Compose original Shayari using AI, dictate verses with emotional AI voices, and export dynamic visual lyric templates.
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

      <div className="grid-2" style={{ gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem' }}>
        {/* Left Column: Visual Lyric Canvas, Teleprompter, Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Dynamic Lyric Video Canvas Screen with Custom Backdrops and Fonts templates */}
          <div className="glass-panel" style={{ padding: '1rem', background: '#000000', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Video size={14} style={{ color: 'var(--accent-primary)' }} />
              Lyric Video Template Preview
            </h3>
            
            <canvas
              ref={canvasRef}
              width="640"
              height="280"
              style={{
                width: '100%',
                height: '240px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: '#040406'
              }}
            />

            {/* Lyric Styling Templates Gallery (CapCut & TikTok style presets) */}
            <div style={{ width: '100%', marginTop: '0.75rem' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Choose TikTok/CapCut Font Overlay Style Preset:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[
                  { id: 'elegant', label: ' Elegant Serif Card' },
                  { id: 'neon', label: '⚡ Cyber Neon Glow' },
                  { id: 'retro-tag', label: '📼 Retro Typewriter' },
                  { id: 'bubble', label: '💬 Comic Bubble Tag' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedTextStyle(item.id)}
                    className="btn-secondary"
                    style={{
                      flex: 1,
                      fontSize: '0.75rem',
                      padding: '0.4rem',
                      background: selectedTextStyle === item.id ? 'var(--accent-glow)' : 'transparent',
                      borderColor: selectedTextStyle === item.id ? 'var(--accent-primary)' : 'var(--border-color)',
                      color: selectedTextStyle === item.id ? 'var(--text-primary)' : 'var(--text-secondary)'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Backdrop configuration selectors */}
            <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '0.75rem' }}>
              <select
                value={lyricTemplate}
                onChange={(e) => setLyricTemplate(e.target.value)}
                className="form-select"
                style={{ fontSize: '0.8rem', padding: '0.4rem', flex: 1 }}
              >
                <option value="sunset">Sunset Glow Backdrop</option>
                <option value="neon">Neon Retro Grid</option>
                <option value="rainy">Rainy Slate Streaks</option>
                <option value="starry">Twinkling Space Stars</option>
                <option value="photo">🖼️ Custom Photo Backdrop</option>
                <option value="video">🎥 Custom Video Backdrop</option>
              </select>

              <button
                onClick={handleExportLyricVideo}
                disabled={isExportingLyricVideo}
                className="btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}
              >
                {isExportingLyricVideo ? `Exporting (${exportProgress}%)` : 'Export Lyric Video (WebM)'}
              </button>
            </div>

            {/* Custom Photo Backdrop Selector */}
            {lyricTemplate === 'photo' && (
              <div style={{ width: '100%', marginTop: '0.6rem' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="form-input"
                  style={{ fontSize: '0.75rem', padding: '0.35rem' }}
                />
                {renderAssetPicker('image', (url, name) => {
                  setPhotoUrl(url);
                  setPhotoFile(new File([new Blob()], name, { type: 'image/png' }));
                  updateProjectDiff({ poetryBackdropUrl: url, poetryBackdropType: 'image' }, `Imported backdrop photo: ${name}`);
                })}
              </div>
            )}

            {/* Custom Video Backdrop Selector */}
            {lyricTemplate === 'video' && (
              <div style={{ width: '100%', marginTop: '0.6rem' }}>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleBackdropVideoUpload}
                  className="form-input"
                  style={{ fontSize: '0.75rem', padding: '0.35rem' }}
                />
                {renderAssetPicker('video', (url, name) => {
                  setBackdropVideoUrl(url);
                  setBackdropVideoFile(new File([new Blob()], name, { type: 'video/mp4' }));
                  updateProjectDiff({ poetryBackdropUrl: url, poetryBackdropType: 'video' }, `Imported backdrop video: ${name}`);
                })}
              </div>
            )}
          </div>

          {/* Teleprompter Scroll Box with Upload Lyrics Button */}
          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FileText size={16} style={{ color: 'var(--accent-primary)' }} />
                Teleprompter Viewport
              </h3>
              
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {/* Upload Lyrics Option */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <label className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Upload size={12} /> Upload Lyrics (.txt)
                    <input
                      type="file"
                      accept=".txt"
                      onChange={handleLyricsFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {renderAssetPicker('text', (url, name) => {
                    fetch(url).then(r => r.text()).then(txt => {
                      setPoemText(txt);
                      updateProjectDiff({ lyricsText: txt }, `Imported lyrics from project files: ${name}`);
                    });
                  })}
                </div>

                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button onClick={handleStartScrolling} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>Scroll</button>
                  <button onClick={handlePauseScrolling} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>Pause</button>
                  <button onClick={handleResetScrolling} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>Reset</button>
                </div>
              </div>
            </div>

            <textarea
              value={poemText}
              onChange={(e) => {
                setPoemText(e.target.value);
                updateProjectDiff({ lyricsText: e.target.value });
              }}
              className="form-textarea"
              style={{
                height: '180px',
                padding: '0.75rem',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: `${fontSize}px`,
                lineHeight: '1.6',
                textAlign: 'center',
                whiteSpace: 'pre-wrap',
                fontFamily: selectedTextStyle === 'retro-tag' ? 'monospace' : 'system-ui'
              }}
            />

            {/* Font slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Size ({fontSize}px)</label>
              <input
                type="range"
                min="16"
                max="36"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {/* Audio Dub / Mic Recorder */}
          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '0.95rem', margin: '0 0 2px 0' }}>Record Vocal Overlays</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Read in sync with ambient backing tracks.</p>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                {!isRecording ? (
                  <button onClick={handleStartAll} className="btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}>
                    <Mic size={14} /> Record & Scroll
                  </button>
                ) : (
                  <button onClick={handleStopAll} className="btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', background: '#ef4444' }}>
                    <Square size={14} /> Stop
                  </button>
                )}

                {recordedUrl && (
                  <button onClick={handleDownloadMixed} className="btn-secondary" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}>
                    <Download size={14} /> Download Mix
                  </button>
                )}
              </div>
            </div>

            {recordedUrl && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.6rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-primary)' }}>🎙️ Recorded Poetry Vocal</span>
                  <button
                    onClick={() => {
                      setRecordedUrl('');
                      setRecordedBlob(null);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '0.68rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    🗑️ Delete / Re-record
                  </button>
                </div>
                <audio src={recordedUrl} controls style={{ width: '100%', height: '32px', borderRadius: '4px' }} />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Composers & Soundscapes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* AI Shayari Generator Card */}
          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
              AI Shayari Generator
            </h3>
            
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Select Creative Theme</label>
            <select
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
              className="form-select"
              style={{ fontSize: '0.85rem' }}
            >
              <option value="love">Mohabbat (Love)</option>
              <option value="friendship">Dosti (Friendship)</option>
              <option value="sad">Dard / Tanhai (Sadness)</option>
              <option value="motivation">Housla (Motivation)</option>
            </select>

            <button onClick={generateShayari} className="btn-primary" style={{ justifyContent: 'center', width: '100%', marginTop: '0.25rem' }}>
              Compose AI Shayari
            </button>
          </div>

          {/* Emotive TTS voice speaker */}
          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Volume2 size={16} style={{ color: 'var(--accent-primary)' }} />
              AI Voice Narrator (TTS)
            </h3>

            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Narrator Dramatic Tone</label>
            <select
              value={emotiveTone}
              onChange={(e) => setEmotiveTone(e.target.value)}
              className="form-select"
              style={{ fontSize: '0.85rem' }}
            >
              <option value="dramatic">🎭 Dramatic (Slow & Resonant)</option>
              <option value="soft">🤫 Soft Whisper (Warm & Quiet)</option>
              <option value="energetic">⚡ Energetic (Fast & Dynamic)</option>
              <option value="normal">👤 Normal Speech</option>
            </select>

            <div style={{ display: 'flex', gap: '8px', marginTop: '0.25rem' }}>
              {!isSynthesizingTTS ? (
                <button onClick={synthesizeTTS} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  Speak Shayari
                </button>
              ) : (
                <button onClick={stopTTS} className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#ef4444' }}>
                  Stop Reading
                </button>
              )}
            </div>
          </div>

          {/* Soundscape presets */}
          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Music size={16} style={{ color: 'var(--accent-primary)' }} />
              Backing Soundscapes
            </h3>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Sound Loops</label>
              <select
                value={soundscape}
                onChange={(e) => setSoundscape(e.target.value)}
                className="form-select"
                style={{ fontSize: '0.85rem' }}
              >
                <option value="rain">Autumn Rain Loop</option>
                <option value="fire">Campfire Crackle</option>
                <option value="piano">Ambient Piano Melody</option>
                <option value="none">No Soundscape</option>
                <option value="upload">Custom Audio Upload</option>
              </select>
            </div>

            {soundscape === 'upload' && (
              <input
                type="file"
                accept="audio/*"
                onChange={handleBgUpload}
                className="form-input"
                style={{ fontSize: '0.8rem', padding: '0.45rem' }}
              />
            )}

            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                Music Volume ({Math.round(bgVolume * 100)}%)
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

        </div>
      </div>

      {/* Hidden audio element for loop backings */}
      {soundscape !== 'none' && getActiveBgUrl() && (
        <audio
          ref={bgAudioRef}
          src={getActiveBgUrl()}
          loop
          style={{ display: 'none' }}
        />
      )}

      {/* Hidden backdrop image element */}
      {photoUrl && (
        <img
          ref={backdropImageRef}
          src={photoUrl}
          style={{ display: 'none' }}
          alt="Backdrop"
        />
      )}

      {/* Hidden backdrop video element */}
      {backdropVideoUrl && (
        <video
          ref={backdropVideoRef}
          src={backdropVideoUrl}
          loop
          muted
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
};

export default PoetryStudio;
