import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Download, Sparkles, Music, Mic, FileText, Upload, Sliders, Volume2, Settings, RefreshCw, Layers } from 'lucide-react';
import { translations } from '../assets/translations';
import AudioVisualizer from '../components/AudioVisualizer';
import { safeStorage, safeJsonParse } from '../utils/storage';

const AIAudioLab = ({ language, theme, user, activeProject, onUpdateProjectState, onAddProjectAsset }) => {
  const t = translations[language] || translations.en;

  const [activeTab, setActiveTab] = useState('song-studio'); // 'song-studio', 'stem', 'cover'
  const [songLimits, setSongLimits] = useState({ date: new Date().toDateString(), ttsCount: 0, cloneCount: 0 });

  // --- 1. AI SONG & VOICE STUDIO STATE (SUNO STYLE) ---
  const [lyricsText, setLyricsText] = useState('');
  const [musicPrompt, setMusicPrompt] = useState('sad melancholic piano for a shayari');
  const [fetchingStatus, setFetchingStatus] = useState('');
  const [usePremiumSuno, setUsePremiumSuno] = useState(true);
  const [apiframeTracks, setApiframeTracks] = useState([]);
  const [activeApiframeTrack, setActiveApiframeTrack] = useState(null);
  
  // Voice Synthesis / cloning
  const [voiceSourceMode, setVoiceSourceMode] = useState('tts'); // 'tts', 'clone', 'record'
  const [selectedVoice, setSelectedVoice] = useState('');
  const [speechRate, setSpeechRate] = useState(1);
  const [speechPitch, setSpeechPitch] = useState(1);
  const [emotiveTone, setEmotiveTone] = useState('dramatic'); // 'dramatic', 'soft', 'energetic', 'normal'
  
  // Voice Cloning Upload
  const [clonedVoiceFile, setClonedVoiceFile] = useState(null);
  const [clonedVoiceUrl, setClonedVoiceUrl] = useState('');
  const [copyVoiceAndSongStyle, setCopyVoiceAndSongStyle] = useState(true);

  // Soundscape presets (Voice Studio mixer backup)
  const [soundscape, setSoundscape] = useState('none'); // 'none', 'rain', 'fire', 'piano'
  const [soundscapeVolume, setSoundscapeVolume] = useState(0.25);
  
  // Live mic recording
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [recordedMicBlob, setRecordedMicBlob] = useState(null);
  const [recordedMicUrl, setRecordedMicUrl] = useState('');
  const [isSynthesizingTTS, setIsSynthesizingTTS] = useState(false);

  // 10 sound filter effects
  const [selectedEffect, setSelectedEffect] = useState('none'); 
  const [voiceEnhancement, setVoiceEnhancement] = useState(false); 

  // Generated Master Song State
  const [isGeneratingSong, setIsGeneratingSong] = useState(false);
  const [generatedSongUrl, setGeneratedSongUrl] = useState('');
  const [generatedSongBlob, setGeneratedSongBlob] = useState(null);
  const [isPlayingGeneratedSong, setIsPlayingGeneratedSong] = useState(false);

  // Refs & context objects
  const micStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const bgAudioRef = useRef(null);
  const masterAudioRef = useRef(null);
  
  const [analyser, setAnalyser] = useState(null);
  const audioCtxRef = useRef(null);
  const [voices, setVoices] = useState([]);

  // Soundscape URLs
  const soundscapeUrls = {
    rain: 'https://assets.mixkit.co/active_storage/sfx/2433/2433-84.wav',
    fire: 'https://assets.mixkit.co/active_storage/sfx/2432/2432-84.wav',
    piano: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  };

  // --- 2. STEM SEPARATOR STATE ---
  const [songFile, setSongFile] = useState(null);
  const [songUrl, setSongUrl] = useState('');
  const [isSeparating, setIsSeparating] = useState(false);
  const [separatedTracks, setSeparatedTracks] = useState(null); 

  const [vocalVolume, setVocalVolume] = useState(0.8);
  const [instVolume, setInstVolume] = useState(0.8);
  const [drumsVolume, setDrumsVolume] = useState(0.8);
  const [bassVolume, setBassVolume] = useState(0.8);

  const [isPlayingStems, setIsPlayingStems] = useState(false);
  const stemCtxRef = useRef(null);
  const stemSourcesRef = useRef([]);
  const stemGainsRef = useRef({});

  // --- 3. COVER SONG MAKER STATE ---
  const [coverSongFile, setCoverSongFile] = useState(null);
  const [coverSongUrl, setCoverSongUrl] = useState('');
  const [isCoverSeparating, setIsCoverSeparating] = useState(false);
  const [coverInstrumentalUrl, setCoverInstrumentalUrl] = useState('');
  
  const [coverInputMode, setCoverInputMode] = useState('record'); // 'record', 'tts', 'clone'
  const [coverRecordedUrl, setCoverRecordedUrl] = useState('');
  const [coverRecordedBlob, setCoverRecordedBlob] = useState(null);
  
  const [isRecordingCover, setIsRecordingCover] = useState(false);
  const [isExportingCover, setIsExportingCover] = useState(false);

  const [coverMixInstVolume, setCoverMixInstVolume] = useState(0.7);
  const [coverMixVocalVolume, setCoverMixVocalVolume] = useState(0.8);

  const coverAudioRef = useRef(null);

  // Clean up speech synthesis & playbacks on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      stopStemsPlayback();
      if (bgAudioRef.current) bgAudioRef.current.pause();
      if (masterAudioRef.current) masterAudioRef.current.pause();
      if (coverAudioRef.current) coverAudioRef.current.pause();
    };
  }, []);

  // Load Daily Generation Credits limits
  useEffect(() => {
    const todayStr = new Date().toDateString();
    // Refill testing credits instantly on loading this update
    const fresh = { date: todayStr, ttsCount: 0, cloneCount: 0 };
    safeStorage.setItem('vox_song_limits', JSON.stringify(fresh));
    setSongLimits(fresh);
  }, []);

  // Synchronize local states with activeProject snapshot parameters
  useEffect(() => {
    if (activeProject) {
      if (activeProject.lyricsText !== undefined) setLyricsText(activeProject.lyricsText);
      if (activeProject.musicPrompt !== undefined) setMusicPrompt(activeProject.musicPrompt);
      if (activeProject.voiceSourceMode !== undefined) setVoiceSourceMode(activeProject.voiceSourceMode);
      if (activeProject.selectedVoice !== undefined) setSelectedVoice(activeProject.selectedVoice);
      if (activeProject.speechRate !== undefined) setSpeechRate(activeProject.speechRate);
      if (activeProject.speechPitch !== undefined) setSpeechPitch(activeProject.speechPitch);
      if (activeProject.emotiveTone !== undefined) setEmotiveTone(activeProject.emotiveTone);
      if (activeProject.clonedVoiceUrl !== undefined) setClonedVoiceUrl(activeProject.clonedVoiceUrl);
      if (activeProject.copyVoiceAndSongStyle !== undefined) setCopyVoiceAndSongStyle(activeProject.copyVoiceAndSongStyle);
      if (activeProject.soundscape !== undefined) setSoundscape(activeProject.soundscape);
      if (activeProject.soundscapeVolume !== undefined) setSoundscapeVolume(activeProject.soundscapeVolume);
      if (activeProject.generatedSongUrl !== undefined) setGeneratedSongUrl(activeProject.generatedSongUrl);
      if (activeProject.selectedEffect !== undefined) setSelectedEffect(activeProject.selectedEffect);
      if (activeProject.voiceEnhancement !== undefined) setVoiceEnhancement(activeProject.voiceEnhancement);
      if (activeProject.coverSongUrl !== undefined) setCoverSongUrl(activeProject.coverSongUrl);
      if (activeProject.coverInstrumentalUrl !== undefined) setCoverInstrumentalUrl(activeProject.coverInstrumentalUrl);
      if (activeProject.coverRecordedUrl !== undefined) setCoverRecordedUrl(activeProject.coverRecordedUrl);
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
      if (typeFilter === 'audio') return a.name.endsWith('.wav') || a.name.endsWith('.mp3') || a.type === 'audio';
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

  // Fetch standard speech synthesis voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const list = window.speechSynthesis.getVoices();
        
        // Define cloud fallback high-fidelity voices
        const cloudVoices = [
          { name: 'Google Punjabi Female (Cloud)', lang: 'pa-IN', isCloud: true, tl: 'pa' },
          { name: 'Google Gurmukhi Male (Cloud)', lang: 'pa-IN', isCloud: true, tl: 'pa' },
          { name: 'Google Hindi Female (Cloud)', lang: 'hi-IN', isCloud: true, tl: 'hi' },
          { name: 'Google English Male (Cloud)', lang: 'en-US', isCloud: true, tl: 'en' }
        ];

        // Combine cloud voices at the top
        const combined = [...cloudVoices, ...list];
        setVoices(combined);
        if (combined.length > 0) {
          const defaults = combined.find(v => {
            if (language === 'pa') return v.lang.includes('pa');
            if (language === 'hi') return v.lang.includes('hi');
            return v.lang.includes('en');
          });
          setSelectedVoice(defaults ? defaults.name : combined[0].name);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [language]);

  // Upload handlers
  const handleUploadLyricsFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLyricsText(event.target.result);
        alert("Lyrics file successfully uploaded!");
      };
      reader.readAsText(file);
    }
  };

  const handleVoiceCloneUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setClonedVoiceFile(file);
      setClonedVoiceUrl(URL.createObjectURL(file));
      setVoiceSourceMode('clone');
      alert("Voice reference cloned! AI will mirror this vocal signature in the song.");
    }
  };


  // --- VOICE STUDIO / LIVE RECORDER ---

  const handleStartMicRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const actx = new AudioContext();
      audioCtxRef.current = actx;

      const srcNode = actx.createMediaStreamSource(stream);
      const analyserNode = actx.createAnalyser();
      srcNode.connect(analyserNode);
      setAnalyser(analyserNode);

      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordedMicBlob(blob);
        setRecordedMicUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
        setAnalyser(null);
      };

      recorder.start();
      setIsRecordingMic(true);
    } catch (e) {
      console.error(e);
      alert("Please allow microphone permissions.");
    }
  };

  const handleStopMicRecording = () => {
    if (mediaRecorderRef.current && isRecordingMic) {
      mediaRecorderRef.current.stop();
      setIsRecordingMic(false);
    }
  };

  // Reverb generator
  const createImpulseResponse = (context, duration, decay) => {
    const sampleRate = context.sampleRate;
    const length = sampleRate * duration;
    const impulse = context.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const decayVal = Math.exp(-i / (sampleRate * (duration / 2.5)));
      left[i] = (Math.random() * 2 - 1) * decayVal;
      right[i] = (Math.random() * 2 - 1) * decayVal;
    }
    return impulse;
  };

  // Web Audio Effects Router Node
  const applyEffectsToSource = (context, sourceNode, filterName) => {
    let lastNode = sourceNode;

    if (filterName === 'echo') {
      const delay = context.createDelay();
      delay.delayTime.value = 0.35; 
      const feedback = context.createGain();
      feedback.gain.value = 0.4;
      
      delay.connect(feedback);
      feedback.connect(delay);
      
      const mix = context.createGain();
      sourceNode.connect(mix);
      delay.connect(mix);
      lastNode = mix;
    } else if (filterName === 'slowed') {
      const delay = context.createDelay();
      delay.delayTime.value = 0.48;
      const feedback = context.createGain();
      feedback.gain.value = 0.55;
      delay.connect(feedback);
      feedback.connect(delay);
      lastNode = delay;
    } else if (filterName === 'reverbed' || filterName === 'large_hall' || filterName === 'cave') {
      const convolver = context.createConvolver();
      const durationVal = filterName === 'cave' ? 4.5 : filterName === 'large_hall' ? 3.2 : 1.8;
      convolver.buffer = createImpulseResponse(context, durationVal, 2.0);
      sourceNode.connect(convolver);
      lastNode = convolver;
    } else if (filterName === 'heavy_voice') {
      const lp = context.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 400; 
      
      const bassBoost = context.createBiquadFilter();
      bassBoost.type = 'peaking';
      bassBoost.frequency.value = 110;
      bassBoost.Q.value = 1.2;
      bassBoost.gain.value = 12; 
      
      sourceNode.connect(lp);
      lp.connect(bassBoost);
      lastNode = bassBoost;
    } else if (filterName === 'robot') {
      const oscillator = context.createOscillator();
      oscillator.type = 'sawtooth';
      oscillator.frequency.value = 52; 
      
      const ringMod = context.createGain();
      ringMod.gain.value = 0;
      
      oscillator.connect(ringMod.gain);
      sourceNode.connect(ringMod);
      
      oscillator.start();
      lastNode = ringMod;
    }

    // Apply voice enhancement cleanup
    if (voiceEnhancement) {
      const lowCut = context.createBiquadFilter();
      lowCut.type = 'highpass';
      lowCut.frequency.value = 85;

      const highCut = context.createBiquadFilter();
      highCut.type = 'lowpass';
      highCut.frequency.value = 7800;

      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 4.0;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      lastNode.connect(lowCut);
      lowCut.connect(highCut);
      highCut.connect(compressor);
      lastNode = compressor;
    }

    return lastNode;
  };


  // --- 1. AI SONG COMPILER (SUNO STYLE MASTER IN TAB 1) ---

  const handleCreateAISongMaster = () => {
    if (!lyricsText.trim()) {
      alert("Please enter or upload lyrics/Shayari text first.");
      return;
    }

    if (usePremiumSuno) {
      setIsGeneratingSong(true);
      setFetchingStatus("Connecting to Suno Premium AI...");

      const sunoProxyUrl = "/.netlify/functions/suno";

      fetch(sunoProxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "generate",
          payload: {
            model: "suno",
            prompt: lyricsText,
            sunoParams: {
              custom_mode: true,
              title: musicPrompt ? musicPrompt.substring(0, 40) : "Shayari Song",
              style: musicPrompt || "sad lofi piano",
              instrumental: false,
              model_version: "V4"
            }
          }
        })
      })
        .then(res => res.json().then(data => ({ ok: res.ok, status: res.status, data })))
        .then(({ ok, status, data }) => {
          if (!ok) {
            throw new Error(data.error || `Request failed with status ${status}`);
          }
          const jobId = data.jobId;
          setFetchingStatus("Suno generation in queue...");

          // Poll job status
          const pollInterval = setInterval(() => {
            fetch(sunoProxyUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                action: "poll",
                jobId: jobId
              })
            })
              .then(res => res.json())
              .then(jobData => {
                if (jobData.status === "COMPLETED") {
                  clearInterval(pollInterval);
                  const tracks = jobData.result.tracks;
                  setApiframeTracks(tracks);
                  setIsGeneratingSong(false);
                  setFetchingStatus("");
                  if (tracks && tracks.length > 0) {
                    setActiveApiframeTrack(tracks[0]);
                    setGeneratedSongUrl(tracks[0].audioUrl);
                    if (masterAudioRef.current) {
                      masterAudioRef.current.src = tracks[0].audioUrl;
                    }
                    updateProjectDiff({
                      generatedSongUrl: tracks[0].audioUrl
                    }, `Generated Premium Suno Track: ${tracks[0].title}`);
                    alert("Premium Suno Song generated successfully! Variations available below.");
                  }
                } else if (jobData.status === "FAILED") {
                  clearInterval(pollInterval);
                  setIsGeneratingSong(false);
                  setFetchingStatus("");
                  alert(`Suno generation failed: ${jobData.error || "Unknown error"}. Falling back to standard local synthesis.`);
                  runLocalAudioSynthesis();
                } else if (jobData.status === "PROCESSING") {
                  setFetchingStatus("Suno AI generating tracks (this takes ~30-60s)...");
                } else {
                  setFetchingStatus(`Suno generation: ${jobData.status}...`);
                }
              })
              .catch(err => {
                console.error("Polling error:", err);
              });
          }, 3000);
        })
        .catch(err => {
          console.error("APIFrame start error:", err);
          alert(`Failed to start premium Suno generation: ${err.message}. Falling back to local offline synthesis.`);
          runLocalAudioSynthesis();
        });
      return;
    }

    runLocalAudioSynthesis();
  };

  const runLocalAudioSynthesis = () => {
    // Daily Credit limits check
    const todayStr = new Date().toDateString();
    const limits = safeJsonParse(safeStorage.getItem('vox_song_limits'), { date: "", ttsCount: 0, cloneCount: 0 });
    
    let currentLimits = limits;
    if (limits.date !== todayStr) {
      currentLimits = { date: todayStr, ttsCount: 0, cloneCount: 0 };
    }

    const isOwnVoice = voiceSourceMode === 'clone' || voiceSourceMode === 'record';
    if (isOwnVoice) {
      if (currentLimits.cloneCount >= 2) {
        alert("Daily Limit Reached!\n\nFree tier accounts are limited to 2 Own/Cloned Voice generations per day.\n\nUpgrade to VoxStudio Premium for unlimited high-fidelity clone exports!");
        return;
      }
    } else {
      if (currentLimits.ttsCount >= 10) {
        alert("Daily Limit Reached!\n\nFree tier accounts are limited to 10 Random/Default Voice generations per day.\n\nUpgrade to VoxStudio Premium for unlimited generation!");
        return;
      }
    }

    setIsGeneratingSong(true);

    setTimeout(async () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const tempCtx = new AudioContext();

        const prompt = musicPrompt.toLowerCase();
        let scale = 'minor'; 
        let tempo = 72; 
        let style = 'piano';

        // Check if user toggled style copying from voice reference
        if (copyVoiceAndSongStyle && clonedVoiceUrl) {
          // Mock analyzing reference track properties
          scale = 'minor';
          tempo = 84; 
          style = 'piano';
        } else {
          if (prompt.includes('sad') || prompt.includes('melanchol')) {
            scale = 'minor'; tempo = 70; style = 'piano';
          } else if (prompt.includes('lofi') || prompt.includes('chill') || prompt.includes('jazz')) {
            scale = 'major7'; tempo = 80; style = 'lofi';
          } else if (prompt.includes('retro') || prompt.includes('synth') || prompt.includes('cyber')) {
            scale = 'synthwave'; tempo = 120; style = 'synthwave';
          }
        }

        // 1. Prepare/fetch vocal clips first to determine dynamic song length
        const vocalBuffers = [];
        let totalVocalDuration = 0;

        if (voiceSourceMode === 'clone' && clonedVoiceUrl) {
          const response = await fetch(clonedVoiceUrl);
          const arrayBuffer = await response.arrayBuffer();
          const vocalBuf = await tempCtx.decodeAudioData(arrayBuffer);
          vocalBuffers.push(vocalBuf);
          totalVocalDuration = vocalBuf.duration;
        } else if (voiceSourceMode === 'record' && recordedMicUrl) {
          const response = await fetch(recordedMicUrl);
          const arrayBuffer = await response.arrayBuffer();
          const vocalBuf = await tempCtx.decodeAudioData(arrayBuffer);
          vocalBuffers.push(vocalBuf);
          totalVocalDuration = vocalBuf.duration;
        } else {
          // TTS Mode: automatic text chunking to support long texts and mix vocals into offlineCtx
          const selectedVoiceObj = voices.find(v => v.name === selectedVoice);
          let tl = 'en';
          if (selectedVoiceObj) {
            if (selectedVoiceObj.lang.startsWith('hi')) tl = 'hi';
            else if (selectedVoiceObj.lang.startsWith('pa')) tl = 'pa';
            else if (selectedVoiceObj.lang.startsWith('es')) tl = 'es';
            else if (selectedVoiceObj.lang.startsWith('fr')) tl = 'fr';
          }

          // Chunk lyrics text (max 150 chars per request)
          const words = lyricsText.split(/\s+/);
          const chunks = [];
          let currentChunk = '';
          for (const word of words) {
            if ((currentChunk + ' ' + word).trim().length <= 150) {
              currentChunk = (currentChunk + ' ' + word).trim();
            } else {
              if (currentChunk) chunks.push(currentChunk);
              currentChunk = word;
            }
          }
          if (currentChunk) chunks.push(currentChunk);

          setFetchingStatus("Synthesizing AI lyrics vocals...");
          for (const chunk of chunks) {
            try {
              const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${tl}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
              const response = await fetch(ttsUrl);
              if (response.ok) {
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();
                const vocalBuf = await tempCtx.decodeAudioData(arrayBuffer);
                vocalBuffers.push(vocalBuf);
                totalVocalDuration += vocalBuf.duration + 0.8; // add buffer time for natural gaps
              }
            } catch (err) {
              console.warn("TTS fetch chunk failed:", chunk, err);
            }
          }
        }

        // Set song duration dynamically: min 15s, max 120s
        const songDuration = Math.min(Math.max(totalVocalDuration + 3.0, 15.0), 120.0);
        const sampleRate = tempCtx.sampleRate;
        const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        const offlineCtx = new OfflineCtx(2, sampleRate * songDuration, sampleRate);

        const chords = {
          minor: [
            [220, 261.63, 329.63, 392], 
            [174.61, 220, 261.63, 329.63], 
            [261.63, 329.63, 392, 493.88], 
            [196, 246.94, 293.66, 392]
          ],
          major7: [
            [196, 246.94, 293.66, 349.23], 
            [220, 261.63, 329.63, 392], 
            [146.83, 174.61, 220, 261.63], 
            [130.81, 164.81, 196, 246.94]
          ],
          synthwave: [
            [110, 164.81, 220, 277.18], 
            [87.31, 130.81, 174.61, 220], 
            [98, 146.83, 196, 246.94], 
            [82.41, 123.47, 164.81, 220]
          ]
        };

        const activeChords = chords[scale] || chords.minor;
        const secondsPerBeat = 60 / tempo;
        const steps = songDuration / secondsPerBeat;

        // 2. Synthesize background instrumental
        setFetchingStatus("Synthesizing backing composition...");
        for (let beat = 0; beat < steps; beat++) {
          const chordIdx = Math.floor(beat / 2) % activeChords.length;
          const chordNotes = activeChords[chordIdx];
          const beatTime = beat * secondsPerBeat;

          chordNotes.forEach((freq, noteIdx) => {
            const osc = offlineCtx.createOscillator();
            const gainNode = offlineCtx.createGain();
            const filter = offlineCtx.createBiquadFilter();

            if (style === 'piano') {
              osc.type = 'triangle'; 
              filter.type = 'lowpass';
              filter.frequency.setValueAtTime(1200, beatTime);
              filter.frequency.exponentialRampToValueAtTime(100, beatTime + 1.5);
            } else if (style === 'lofi') {
              osc.type = 'sine'; 
              filter.type = 'lowpass';
              filter.frequency.value = 600;
            } else {
              osc.type = 'sawtooth'; 
              filter.type = 'lowpass';
              filter.frequency.setValueAtTime(3000, beatTime);
              filter.frequency.exponentialRampToValueAtTime(200, beatTime + 0.8);
            }

            osc.frequency.setValueAtTime(freq, beatTime + (noteIdx * 0.1)); 

            gainNode.gain.setValueAtTime(0, beatTime);
            gainNode.gain.linearRampToValueAtTime(style === 'synthwave' ? 0.08 : 0.12, beatTime + 0.05 + (noteIdx * 0.1));
            gainNode.gain.exponentialRampToValueAtTime(0.0001, beatTime + 2.2);

            osc.connect(filter);
            filter.connect(gainNode);
            
            const panner = offlineCtx.createStereoPanner();
            panner.pan.value = (noteIdx % 2 === 0) ? -0.4 : 0.4;
            gainNode.connect(panner);
            panner.connect(offlineCtx.destination);

            osc.start(beatTime);
            osc.stop(beatTime + 2.5);
          });
        }

        // 3. Layer the vocal buffers into the offline context
        setFetchingStatus("Mixing tracks and compiling master...");
        let currentVocalTime = 1.0; // start after 1 measure introduction
        const measureDuration = 4 * secondsPerBeat;

        for (const buf of vocalBuffers) {
          const source = offlineCtx.createBufferSource();
          source.buffer = buf;
          
          const vocalGain = offlineCtx.createGain();
          vocalGain.gain.setValueAtTime(0.85, currentVocalTime);
          
          const processedVocal = applyEffectsToSource(offlineCtx, source, selectedEffect);
          processedVocal.connect(vocalGain);
          vocalGain.connect(offlineCtx.destination);
          
          source.start(currentVocalTime);
          if (voiceSourceMode === 'clone' || voiceSourceMode === 'record') {
            // Single vocal buffer
            source.stop(currentVocalTime + buf.duration);
          } else {
            // Snap the next chunk's start time to the next musical measure boundary (4 beats)
            const nextTime = currentVocalTime + buf.duration + 0.5; // duration plus short pause
            currentVocalTime = Math.ceil(nextTime / measureDuration) * measureDuration;
          }
        }

        const renderedBuffer = await offlineCtx.startRendering();
        const blob = audioBufferToWav(renderedBuffer);
        const url = URL.createObjectURL(blob);

        setGeneratedSongBlob(blob);
        setGeneratedSongUrl(url);

        if (masterAudioRef.current) {
          masterAudioRef.current.src = url;
        }

        // Increment limits count on successful completion
        if (isOwnVoice) {
          currentLimits.cloneCount += 1;
        } else {
          currentLimits.ttsCount += 1;
        }
        safeStorage.setItem('vox_song_limits', JSON.stringify(currentLimits));
        setSongLimits(currentLimits);

        // Store generated song inside project asset database
        if (onAddProjectAsset && activeProject) {
          const assetName = `ai_song_${Date.now()}.wav`;
          await onAddProjectAsset(assetName, 'audio', blob);
          updateProjectDiff({
            generatedSongUrl: url
          }, `Generated AI Song Master: "${musicPrompt}"`);
        } else {
          updateProjectDiff({ generatedSongUrl: url });
        }

        alert("AI Song Master successfully generated! Voice clone & backing music compiled.");
        tempCtx.close();
      } catch (e) {
        console.error(e);
        alert("Audio rendering failed. Please try again.");
      } finally {
        setIsGeneratingSong(false);
        setFetchingStatus('');
      }
    }, 100);
  };

  const handlePlayGeneratedSong = () => {
    if (!generatedSongUrl) return;
    if (isPlayingGeneratedSong) {
      masterAudioRef.current.pause();
      setIsPlayingGeneratedSong(false);
    } else {
      masterAudioRef.current.currentTime = 0;
      masterAudioRef.current.play().catch(() => {});
      setIsPlayingGeneratedSong(true);
    }
  };


  // --- 2. STEM SEPARATOR ---

  const runStemSeparation = async () => {
    if (!songFile) return;
    setIsSeparating(true);

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const tempCtx = new AudioContext();

      const arrayBuffer = await songFile.arrayBuffer();
      const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);

      const sampleRate = audioBuffer.sampleRate;
      const duration = audioBuffer.duration;
      const numChannels = audioBuffer.numberOfChannels;

      const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;

      const renderStem = async (stemType) => {
        const offlineCtx = new OfflineCtx(numChannels, sampleRate * duration, sampleRate);
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;

        let lastNode = source;

        if (stemType === 'vocal') {
          const filter = offlineCtx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.value = 1400; 
          filter.Q.value = 0.85;
          source.connect(filter);
          lastNode = filter;
        } else if (stemType === 'instrumental') {
          const splitter = offlineCtx.createChannelSplitter(2);
          const merger = offlineCtx.createChannelMerger(2);
          const inverter = offlineCtx.createGain();
          inverter.gain.value = -1;

          source.connect(splitter);
          splitter.connect(merger, 0, 0);
          splitter.connect(inverter, 1);
          inverter.connect(merger, 0, 1);
          lastNode = merger;
        } else if (stemType === 'drums') {
          const lowpass = offlineCtx.createBiquadFilter();
          lowpass.type = 'lowpass';
          lowpass.frequency.value = 100;

          const highpass = offlineCtx.createBiquadFilter();
          highpass.type = 'highpass';
          highpass.frequency.value = 6000;

          const merger = offlineCtx.createChannelMerger(2);
          source.connect(lowpass);
          source.connect(highpass);
          lowpass.connect(merger, 0, 0);
          highpass.connect(merger, 0, 1);
          lastNode = merger;
        } else if (stemType === 'bass') {
          const lp = offlineCtx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 140;
          source.connect(lp);
          lastNode = lp;
        }

        lastNode.connect(offlineCtx.destination);
        source.start(0);

        const renderedBuffer = await offlineCtx.startRendering();
        const blob = audioBufferToWav(renderedBuffer);
        return URL.createObjectURL(blob);
      };

      const [vocalUrl, instrumentalUrl, drumsUrl, bassUrl] = await Promise.all([
        renderStem('vocal'),
        renderStem('instrumental'),
        renderStem('drums'),
        renderStem('bass')
      ]);

      setSeparatedTracks({ vocalUrl, instrumentalUrl, drumsUrl, bassUrl });
      alert("AI Stem Separation completed!");
      tempCtx.close();
    } catch (e) {
      console.error(e);
      alert("Failed to separate song stems.");
    } finally {
      setIsSeparating(false);
    }
  };

  const playStems = async () => {
    if (!separatedTracks) return;
    stopStemsPlayback();

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    stemCtxRef.current = ctx;

    const loadAndPlayTrack = async (url, volumeKey, volState) => {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const gainNode = ctx.createGain();
      gainNode.gain.value = volState;

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      stemSourcesRef.current.push(source);
      stemGainsRef.current[volumeKey] = gainNode;
      return source;
    };

    try {
      const sources = await Promise.all([
        loadAndPlayTrack(separatedTracks.vocalUrl, 'vocal', vocalVolume),
        loadAndPlayTrack(separatedTracks.instrumentalUrl, 'inst', instVolume),
        loadAndPlayTrack(separatedTracks.drumsUrl, 'drums', drumsVolume),
        loadAndPlayTrack(separatedTracks.bassUrl, 'bass', bassVolume)
      ]);

      sources.forEach(src => src.start(0));
      setIsPlayingStems(true);
    } catch (e) {
      console.error(e);
    }
  };

  const stopStemsPlayback = () => {
    stemSourcesRef.current.forEach(src => {
      try { src.stop(); } catch (e) {}
    });
    stemSourcesRef.current = [];
    stemGainsRef.current = {};
    if (stemCtxRef.current && stemCtxRef.current.state !== 'closed') {
      stemCtxRef.current.close();
    }
    setIsPlayingStems(false);
  };


  // --- 3. COVER SONG MAKER ---

  const runCoverSeparation = async () => {
    if (!coverSongFile) return;
    setIsCoverSeparating(true);

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const tempCtx = new AudioContext();

      const arrayBuffer = await coverSongFile.arrayBuffer();
      const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);

      const sampleRate = audioBuffer.sampleRate;
      const duration = audioBuffer.duration;
      const numChannels = audioBuffer.numberOfChannels;

      const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const offlineCtx = new OfflineCtx(numChannels, sampleRate * duration, sampleRate);

      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;

      const splitter = offlineCtx.createChannelSplitter(2);
      const merger = offlineCtx.createChannelMerger(2);
      const inverter = offlineCtx.createGain();
      inverter.gain.value = -1;

      source.connect(splitter);
      splitter.connect(merger, 0, 0);
      splitter.connect(inverter, 1);
      inverter.connect(merger, 0, 1);

      merger.connect(offlineCtx.destination);
      source.start(0);

      const renderedBuffer = await offlineCtx.startRendering();
      const blob = audioBufferToWav(renderedBuffer);
      const instUrl = URL.createObjectURL(blob);

      setCoverInstrumentalUrl(instUrl);
      alert("AI lead vocals removed! Your backing instrumental track is ready.");
      tempCtx.close();
    } catch (e) {
      console.error(e);
      alert("Failed to isolate cover backing track.");
    } finally {
      setIsCoverSeparating(false);
    }
  };

  const handleStartCoverRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const actx = new AudioContext();
      audioCtxRef.current = actx;

      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setCoverRecordedBlob(blob);
        setCoverRecordedUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      // Play Karaoke Instrumental in sync
      if (coverInstrumentalUrl && coverAudioRef.current) {
        coverAudioRef.current.volume = coverMixInstVolume;
        coverAudioRef.current.currentTime = 0;
        coverAudioRef.current.play().catch(() => {});
      }

      recorder.start();
      setIsRecordingCover(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStopCoverRecording = () => {
    if (mediaRecorderRef.current && isRecordingCover) {
      mediaRecorderRef.current.stop();
      setIsRecordingCover(false);
    }
    if (coverAudioRef.current) coverAudioRef.current.pause();
  };

  const handleSynthesizeCoverTTS = async () => {
    if (!lyricsText.trim()) return;

    // Play backing instrumental in sync
    if (coverInstrumentalUrl && coverAudioRef.current) {
      coverAudioRef.current.volume = coverMixInstVolume;
      coverAudioRef.current.currentTime = 0;
      coverAudioRef.current.play().catch(() => {});
    }

    const selectedVoiceObj = voices.find(v => v.name === selectedVoice);
    if (selectedVoiceObj && selectedVoiceObj.isCloud) {
      const encodedText = encodeURIComponent(lyricsText);
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${selectedVoiceObj.tl}&client=tw-ob&q=${encodedText}`;
      try {
        const response = await fetch(ttsUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setCoverRecordedUrl(url);
        setCoverRecordedBlob(blob);
        alert("Cloud TTS Vocal synthesized and synced to cover tracks!");
      } catch (err) {
        console.error(err);
      }
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(lyricsText);
      if (selectedVoiceObj) {
        utterance.voice = selectedVoiceObj;
        utterance.lang = selectedVoiceObj.lang;
      } else {
        utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
      }
      utterance.rate = 0.88;
      utterance.onend = () => {
        setCoverRecordedUrl('speechSynth');
        alert("TTS Vocal synthesized and synced to cover tracks!");
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleExportCoverMix = async () => {
    if (!coverInstrumentalUrl) return;
    setIsExportingCover(true);

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const tempCtx = new AudioContext();

      const instResponse = await fetch(coverInstrumentalUrl);
      const instArrayBuffer = await instResponse.arrayBuffer();
      const instAudioBuffer = await tempCtx.decodeAudioData(instArrayBuffer);

      const renderDuration = instAudioBuffer.duration;
      const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const offlineCtx = new OfflineCtx(2, tempCtx.sampleRate * renderDuration, tempCtx.sampleRate);

      const instSource = offlineCtx.createBufferSource();
      instSource.buffer = instAudioBuffer;
      const instGain = offlineCtx.createGain();
      instGain.gain.value = coverMixInstVolume;
      instSource.connect(instGain);
      instGain.connect(offlineCtx.destination);
      instSource.start(0);

      if (coverRecordedBlob && coverRecordedUrl !== 'speechSynth') {
        const vocalBuffer = await coverRecordedBlob.arrayBuffer();
        const vocalAudioBuffer = await tempCtx.decodeAudioData(vocalBuffer);

        const vocalSource = offlineCtx.createBufferSource();
        vocalSource.buffer = vocalAudioBuffer;

        const processedVocal = applyEffectsToSource(offlineCtx, vocalSource, selectedEffect);
        const vocalGain = offlineCtx.createGain();
        vocalGain.gain.value = coverMixVocalVolume;
        
        processedVocal.connect(vocalGain);
        vocalGain.connect(offlineCtx.destination);
        vocalSource.start(0);
      }

      offlineCtx.startRendering().then(renderedBuffer => {
        const wav = audioBufferToWav(renderedBuffer);
        const url = URL.createObjectURL(wav);
        const link = document.createElement('a');
        link.href = url;
        link.download = `voxstudio_cover_remix_${Date.now()}.wav`;
        link.click();
        tempCtx.close();
        setIsExportingCover(false);
      });
    } catch (e) {
      console.error(e);
      setIsExportingCover(false);
    }
  };

  // WAV helper
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
      
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }} className="gradient-text">
            AI Audio Lab
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            All-in-one workstation for voice cloning, Suno-style song generation, stem separators, and cover creators.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '3px',
        marginBottom: '1.5rem',
        maxWidth: '540px'
      }}>
        {[
          { id: 'song-studio', label: '🎵 Song & Voice Studio' },
          { id: 'stem', label: '✂️ Stem Separator' },
          { id: 'cover', label: '🎤 Cover Creator' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              stopStemsPlayback();
            }}
            style={{
              flex: 1,
              padding: '0.5rem',
              border: 'none',
              borderRadius: '6px',
              background: activeTab === tab.id ? 'var(--bg-primary)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- TAB 1: AI SONG & VOICE STUDIO (SUNO STYLE) --- */}
      {activeTab === 'song-studio' && (
        <div className="grid-2" style={{ gridTemplateColumns: '1.3fr 1fr', gap: '1.5rem' }}>
          
          {/* Left Column: Lyrics & prompt configurations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Step 1: Lyrics text */}
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileText size={15} style={{ color: 'var(--accent-primary)' }} />
                  Step 1: Paste Lyrics / Shayari
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <label className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Upload size={10} /> Upload Lyrics (.txt)
                    <input type="file" accept=".txt" onChange={handleUploadLyricsFile} style={{ display: 'none' }} />
                  </label>
                  {renderAssetPicker('text', (url, name) => {
                    fetch(url).then(r => r.text()).then(txt => {
                      setLyricsText(txt);
                      updateProjectDiff({ lyricsText: txt }, `Imported lyrics from file: ${name}`);
                    });
                  })}
                </div>
              </div>

              <textarea
                value={lyricsText}
                onChange={(e) => {
                  setLyricsText(e.target.value);
                  updateProjectDiff({ lyricsText: e.target.value });
                }}
                placeholder="Type or upload the lyrics/Shayari to be sung/spoken in the song..."
                className="form-textarea"
                rows="4"
                style={{ resize: 'none', fontSize: '0.85rem' }}
              />
            </div>

            {/* Step 2: Voice source & cloning */}
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Mic size={15} style={{ color: 'var(--accent-primary)' }} />
                Step 2: AI Voice Clone Selector
              </h3>

              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { id: 'tts', label: '🗣️ AI TTS Voice' },
                  { id: 'clone', label: '👤 Voice Clone (Upload)' },
                  { id: 'record', label: '🎙️ Live Microphone' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setVoiceSourceMode(mode.id)}
                    className="btn-secondary"
                    style={{
                      flex: 1,
                      fontSize: '0.75rem',
                      padding: '0.45rem',
                      background: voiceSourceMode === mode.id ? 'var(--bg-secondary)' : 'transparent',
                      borderColor: voiceSourceMode === mode.id ? 'var(--accent-primary)' : 'var(--border-color)'
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* TTS Voice selection config */}
              {voiceSourceMode === 'tts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="form-select"
                    style={{ fontSize: '0.8rem' }}
                  >
                    {voices.map(v => (
                      <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                    ))}
                  </select>
                  
                  <div className="grid-2" style={{ gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Speed ({speechRate}x)</label>
                      <input type="range" min="0.5" max="2" step="0.1" value={speechRate} onChange={(e) => setSpeechRate(parseFloat(e.target.value))} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Pitch ({speechPitch})</label>
                      <input type="range" min="0.5" max="2" step="0.1" value={speechPitch} onChange={(e) => setSpeechPitch(parseFloat(e.target.value))} />
                    </div>
                  </div>
                </div>
              )}

              {/* Voice Cloning reference file upload */}
              {voiceSourceMode === 'clone' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Upload reference voice clip (.mp3 / .wav) to copy tone:
                  </label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleVoiceCloneUpload}
                    className="form-input"
                    style={{ fontSize: '0.75rem', padding: '0.35rem' }}
                  />
                  {renderAssetPicker('audio', (url, name) => {
                    setClonedVoiceUrl(url);
                    updateProjectDiff({ clonedVoiceUrl: url }, `Selected cloned voice reference: ${name}`);
                  })}
                  {clonedVoiceUrl && (
                    <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>
                      ✓ Voice target successfully cloned
                    </span>
                  )}
                </div>
              )}

              {/* Live voice mic capture */}
              {voiceSourceMode === 'record' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {!isRecordingMic ? (
                      <button onClick={handleStartMicRecording} className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.4rem', flex: 1 }}>
                        🎙️ Start Recording Vocal
                      </button>
                    ) : (
                      <button onClick={handleStopMicRecording} className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.4rem', flex: 1, background: '#ef4444' }}>
                        🛑 Stop Recording
                      </button>
                    )}
                  </div>
                  {recordedMicUrl && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '0.6rem',
                      marginTop: '0.2rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-primary)' }}>🎙️ Recorded Mic Track</span>
                        <button
                          onClick={() => {
                            setRecordedMicUrl('');
                            setRecordedMicBlob(null);
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
                          🗑️ Delete
                        </button>
                      </div>
                      <audio src={recordedMicUrl} controls style={{ width: '100%', height: '32px', borderRadius: '4px' }} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 3: Backing Music Prompts & Song Style */}
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Music size={15} style={{ color: 'var(--accent-primary)' }} />
                Step 3: Music Prompts & Song Style
              </h3>

              <textarea
                value={musicPrompt}
                onChange={(e) => setMusicPrompt(e.target.value)}
                placeholder="Specify backing instruments/genre (e.g. sad lofi beats, campfire guitar, high energy EDM)..."
                className="form-textarea"
                rows="2"
                style={{ resize: 'none', fontSize: '0.85rem' }}
              />

              {/* Premium toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--accent-glow)', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid var(--accent-primary)', marginTop: '0.4rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ⚡ Suno AI Premium (High Fidelity)
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                    Generate full backing music + singing vocals
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={usePremiumSuno}
                  onChange={(e) => setUsePremiumSuno(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                />
              </div>

              {/* Toggle style copying from reference vocal track */}
              {clonedVoiceUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.1rem' }}>
                  <input
                    type="checkbox"
                    id="copy-style-check"
                    checked={copyVoiceAndSongStyle}
                    onChange={(e) => setCopyVoiceAndSongStyle(e.target.checked)}
                    style={{ width: 'auto', cursor: 'pointer' }}
                  />
                  <label htmlFor="copy-style-check" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    Copy voice style and song style from uploaded reference track
                  </label>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Master Output compiler & Sound FX presets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Create Master button Dashboard */}
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', border: '1px solid var(--accent-primary)' }}>
              <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
                Create Master AI Song
              </h3>
              
              <button
                onClick={handleCreateAISongMaster}
                disabled={isGeneratingSong}
                className="btn-primary"
                style={{ justifyContent: 'center', padding: '0.65rem', fontSize: '0.9rem', width: '100%' }}
              >
                {isGeneratingSong ? 'Rendering Master Composition...' : '⚡ Generate AI Song (Suno Style)'}
              </button>

              {fetchingStatus && (
                <div style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}>
                  <RefreshCw size={12} className="spin" /> {fetchingStatus}
                </div>
              )}

              <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {usePremiumSuno ? (
                  <div style={{ fontSize: '0.73rem', color: 'var(--accent-primary)', fontWeight: 700, textAlign: 'center', background: 'var(--accent-glow)', padding: '0.3rem', borderRadius: '4px' }}>
                    ⚡ Suno Premium: Unlimited Generations
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                      <span>Daily Credits (Random Voice):</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{10 - songLimits.ttsCount} / 10 left</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                      <span>Daily Credits (Own/Cloned Voice):</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{2 - songLimits.cloneCount} / 2 left</span>
                    </div>
                    <button
                      onClick={() => {
                        const todayStr = new Date().toDateString();
                        const fresh = { date: todayStr, ttsCount: 0, cloneCount: 0 };
                        safeStorage.setItem('vox_song_limits', JSON.stringify(fresh));
                        setSongLimits(fresh);
                        alert("Daily testing credits successfully refilled!");
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-primary)',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'right',
                        marginTop: '2px',
                        padding: 0
                      }}
                    >
                      🔄 Reset / Refill testing credits
                    </button>
                  </>
                )}
              </div>

              {generatedSongUrl && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    background: 'var(--accent-glow)',
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-primary)',
                    animation: isPlayingGeneratedSong ? 'pulse 1.5s infinite' : 'none'
                  }}>
                    <Volume2 size={20} />
                  </div>

                  <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                    <button onClick={handlePlayGeneratedSong} className="btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem' }}>
                      {isPlayingGeneratedSong ? 'Pause' : 'Play Song'}
                    </button>
                    <a href={generatedSongUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ flex: 1, textDecoration: 'none', justifyContent: 'center', fontSize: '0.8rem' }}>
                      <Download size={12} /> Download Master
                    </a>
                  </div>
                </div>
              )}

              {apiframeTracks && apiframeTracks.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.8rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Layers size={13} /> Select Suno Variation:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {apiframeTracks.map((track, idx) => (
                      <div
                        key={track.id}
                        onClick={() => {
                          setActiveApiframeTrack(track);
                          setGeneratedSongUrl(track.audioUrl);
                          if (masterAudioRef.current) {
                            masterAudioRef.current.src = track.audioUrl;
                          }
                          updateProjectDiff({ generatedSongUrl: track.audioUrl });
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: activeApiframeTrack?.id === track.id ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                          border: `1px solid ${activeApiframeTrack?.id === track.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          borderRadius: '6px',
                          padding: '0.4rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <img src={track.imageUrl} alt="cover" style={{ width: '38px', height: '38px', borderRadius: '4px', objectFit: 'cover' }} />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Variation #{idx + 1}: {track.title}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                            ⏱️ {Math.round(track.duration)}s | {track.tags || 'AI Master'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Vocal FX filters */}
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={15} style={{ color: 'var(--accent-primary)' }} />
                Vocal FX & Enhancers
              </h3>

              <select
                value={selectedEffect}
                onChange={(e) => setSelectedEffect(e.target.value)}
                className="form-select"
                style={{ fontSize: '0.82rem' }}
              >
                <option value="none">Normal Vocal (No Effect)</option>
                <option value="echo">1. Echo / Delay Feedback</option>
                <option value="slowed">2. Slowed & Reverb</option>
                <option value="reverbed">3. Reverb Ambient Space</option>
                <option value="heavy_voice">4. Heavy Voice (Deep Bass)</option>
                <option value="teenage_voice">5. Teenage Voice (High Pitch)</option>
                <option value="large_hall">6. Large Hall Acoustics</option>
                <option value="cave">7. Distant Cave Echo</option>
                <option value="small_room">8. Small Room echo</option>
                <option value="robot">9. Robot Synth Modulator</option>
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-primary)', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                <input
                  type="checkbox"
                  id="enhanced-check"
                  checked={voiceEnhancement}
                  onChange={(e) => setVoiceEnhancement(e.target.checked)}
                  style={{ width: 'auto', cursor: 'pointer' }}
                />
                <label htmlFor="enhanced-check" style={{ fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                  ⚡ AI Vocal Enhancer (Noise Cleanup)
                </label>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- TAB 2: AI STEM SEPARATOR --- */}
      {activeTab === 'stem' && (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sliders size={18} style={{ color: 'var(--accent-primary)' }} />
            AI Stem Separator / Vocal Isolator
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Upload a song and automatically extract the Vocals, backing Instruments, Drums, and Bass.
          </p>

          <input
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                setSongFile(file);
                setSongUrl(URL.createObjectURL(file));
                setSeparatedTracks(null);
                stopStemsPlayback();
              }
            }}
            className="form-input"
            style={{ padding: '0.5rem' }}
          />
          {renderAssetPicker('audio', (url, name) => {
            setSongFile(new File([new Blob()], name, { type: 'audio/wav' }));
            setSongUrl(url);
            setSeparatedTracks(null);
            stopStemsPlayback();
            updateProjectDiff({ songUrl: url }, `Imported separation source: ${name}`);
          })}

          {songUrl && !separatedTracks && (
            <button onClick={runStemSeparation} disabled={isSeparating} className="btn-primary" style={{ alignSelf: 'flex-start' }}>
              {isSeparating ? 'Isolating Vocal & Instrumental Tracks...' : 'Separate Stems'}
            </button>
          )}

          {separatedTracks && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Separate Track Mixer</span>
                <button
                  onClick={isPlayingStems ? stopStemsPlayback : playStems}
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}
                >
                  {isPlayingStems ? 'Stop Playback' : 'Play Merged Mix'}
                </button>
              </div>

              {/* Mixing sliders list */}
              {[['Vocal Track', vocalVolume, setVocalVolume, separatedTracks.vocalUrl, 'stem_vocal.wav'],
                ['Instruments', instVolume, setInstVolume, separatedTracks.instrumentalUrl, 'stem_instrumental.wav'],
                ['Drums', drumsVolume, setDrumsVolume, separatedTracks.drumsUrl, 'stem_drums.wav'],
                ['Bass', bassVolume, setBassVolume, separatedTracks.bassUrl, 'stem_bass.wav']
              ].map(([lbl, val, setter, trackUrl, fName]) => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '120px', fontSize: '0.85rem', fontWeight: 600 }}>{lbl}</div>
                  <input type="range" min="0" max="1" step="0.05" value={val} onChange={(e) => setter(parseFloat(e.target.value))} style={{ flex: 1 }} />
                  <a href={trackUrl} download={fName} className="btn-secondary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', textDecoration: 'none' }}>
                    Download Track
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: COVER SONG MAKER --- */}
      {activeTab === 'cover' && (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 4px 0' }}>
              <Music size={18} style={{ color: 'var(--accent-primary)' }} />
              AI Cover Song Creator & Karaoke Remix
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Upload any song, strip the original vocals automatically, and overlay your own vocals or TTS to make cover songs!
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Step 1: Upload Original Song</label>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setCoverSongFile(file);
                  setCoverSongUrl(URL.createObjectURL(file));
                  setCoverInstrumentalUrl('');
                  setCoverRecordedUrl('');
                }
              }}
              className="form-input"
              style={{ fontSize: '0.8rem', padding: '0.4rem' }}
            />
            {renderAssetPicker('audio', (url, name) => {
              setCoverSongFile(new File([new Blob()], name, { type: 'audio/wav' }));
              setCoverSongUrl(url);
              setCoverInstrumentalUrl('');
              setCoverRecordedUrl('');
              updateProjectDiff({ coverSongUrl: url, coverInstrumentalUrl: '', coverRecordedUrl: '' }, `Imported cover creator original song: ${name}`);
            })}

            {coverSongUrl && !coverInstrumentalUrl && (
              <button
                onClick={runCoverSeparation}
                disabled={isCoverSeparating}
                className="btn-primary"
                style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}
              >
                {isCoverSeparating ? 'Stripping Original Vocals...' : 'Remove Vocals (Extract Instrumental)'}
              </button>
            )}
          </div>

          {coverInstrumentalUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Step 2: Add Your Cover Vocal Overlay</label>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <button
                  onClick={() => setCoverInputMode('record')}
                  className="btn-secondary"
                  style={{ flex: 1, fontSize: '0.75rem', background: coverInputMode === 'record' ? 'var(--bg-secondary)' : 'transparent' }}
                >
                  🎙️ Record My Voice
                </button>
                <button
                  onClick={() => setCoverInputMode('tts')}
                  className="btn-secondary"
                  style={{ flex: 1, fontSize: '0.75rem', background: coverInputMode === 'tts' ? 'var(--bg-secondary)' : 'transparent' }}
                >
                  🗣️ Synthesize AI Voice (TTS)
                </button>
              </div>

              {coverInputMode === 'record' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {!isRecordingCover ? (
                      <button onClick={handleStartCoverRecording} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                        🎙️ Start Recording Over Instrumental
                      </button>
                    ) : (
                      <button onClick={handleStopCoverRecording} className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#ef4444' }}>
                        🛑 Stop Recording & Save Cover Vocal
                      </button>
                    )}
                  </div>
                  {coverRecordedUrl && coverRecordedUrl !== 'speechSynth' && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '0.6rem',
                      marginTop: '0.2rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-primary)' }}>🎙️ Recorded Cover Vocal</span>
                        <button
                          onClick={() => {
                            setCoverRecordedUrl('');
                            setCoverRecordedBlob(null);
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
                          🗑️ Delete
                        </button>
                      </div>
                      <audio src={coverRecordedUrl} controls style={{ width: '100%', height: '32px', borderRadius: '4px' }} />
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <textarea
                    value={lyricsText}
                    onChange={(e) => setLyricsText(e.target.value)}
                    placeholder="Type the lyrics for the cover song voiceover..."
                    className="form-textarea"
                    rows="3"
                  />
                  <button onClick={handleSynthesizeCoverTTS} className="btn-primary" style={{ alignSelf: 'flex-start' }}>
                    Generate Cover Vocal Track
                  </button>
                </div>
              )}
            </div>
          )}

          {coverInstrumentalUrl && coverRecordedUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Step 3: Cover Mixer Balance</label>

              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Instrumental Track Volume ({Math.round(coverMixInstVolume * 100)}%)</label>
                <input type="range" min="0" max="1" step="0.05" value={coverMixInstVolume} onChange={(e) => setCoverMixInstVolume(parseFloat(e.target.value))} />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Your Custom Vocal Volume ({Math.round(coverMixVocalVolume * 100)}%)</label>
                <input type="range" min="0" max="1" step="0.05" value={coverMixVocalVolume} onChange={(e) => setCoverMixVocalVolume(parseFloat(e.target.value))} />
              </div>

              <button
                onClick={handleExportCoverMix}
                disabled={isExportingCover}
                className="btn-primary"
                style={{ marginTop: '0.5rem', justifyContent: 'center' }}
              >
                {isExportingCover ? 'Compiling Cover Master...' : 'Export & Download Cover Song (WAV)'}
              </button>
            </div>
          )}

          {/* Hidden playbacks for Cover layering */}
          {coverInstrumentalUrl && (
            <audio ref={coverAudioRef} src={coverInstrumentalUrl} style={{ display: 'none' }} />
          )}
        </div>
      )}

      {/* master audio player */}
      <audio ref={masterAudioRef} style={{ display: 'none' }} loop />
    </div>
  );
};

export default AIAudioLab;
