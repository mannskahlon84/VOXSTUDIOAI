import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import PoetryStudio from './modules/PoetryStudio';
import VideoEditor from './modules/VideoEditor';
import ReactionStudio from './modules/ReactionStudio';
import AIAudioLab from './modules/AIAudioLab';
import AuthModal from './components/AuthModal';
import ProjectManager from './components/ProjectManager';
import ProjectTimelineDrawer from './components/ProjectTimelineDrawer';
import { saveBlob, getBlob } from './utils/db';
import { safeStorage, safeJsonParse } from './utils/storage';
import { loadGoogleFont } from './assets/fontLoader';
import { Menu, Globe, Palette, Type, LogOut, User, FolderOpen, ChevronDown } from 'lucide-react';
import { translations } from './assets/translations';

function App() {
  const [activeModule, setActiveModule] = useState('ai-lab');
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState('classic-dark');
  const [fontFamily, setFontFamily] = useState('Outfit');

  // Authentication & Projects states
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [loadedProject, setLoadedProject] = useState(null);
  
  // Unified Project State Variables
  const [activeProject, setActiveProject] = useState(null);
  const [projectsList, setProjectsList] = useState([]);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [tourStep, setTourStep] = useState(null);

  // Settings dropdown state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef(null);

  const t = translations[language] || translations.en;

  const availableLanguages = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी (Hindi)' },
    { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' },
    { code: 'bn', label: 'বাংলা (Bengali)' },
    { code: 'ne', label: 'नेपाली (Nepali)' },
    { code: 'de', label: 'Deutsch' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'ar', label: 'العربية' },
    { code: 'zh', label: '中文' }
  ];

  const themes = [
    { id: 'classic-dark', name: 'Classic Dark' },
    { id: 'theme-cyberpunk', name: 'Cyberpunk Neon' },
    { id: 'theme-midnight', name: 'Midnight Ocean' },
    { id: 'theme-solarized', name: 'Solarized Amber' },
    { id: 'theme-forest', name: 'Forest Emerald' },
    { id: 'theme-rose', name: 'Sunset Rose' },
    { id: 'theme-light', name: 'Minimalist Light' }
  ];

  const fontOptions = [
    { name: 'Outfit' },
    { name: 'Space Grotesk' },
    { name: 'Inter' },
    { name: 'Poppins' },
    { name: 'Roboto' },
    { name: 'Noto Sans Devanagari (Hindi/Nepali)' },
    { name: 'Noto Sans Bengali (Bangla)' },
    { name: 'Noto Sans Gurmukhi (Punjabi)' },
    { name: 'Cinzel (Elegant)' },
    { name: 'Bungee (Playful Bold)' }
  ];

  // Close settings dropdown on clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check for active user session on startup
  useEffect(() => {
    const savedSession = safeStorage.getItem('vox_user_session');
    if (savedSession) {
      setUser(safeJsonParse(savedSession, null));
    }
  }, []);

  // Onboarding tour check on load
  useEffect(() => {
    const tourSeen = safeStorage.getItem('vox_tour_seen');
    if (!tourSeen) {
      const timer = setTimeout(() => {
        setTourStep(0);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Sync theme changes with body class list
  useEffect(() => {
    const body = document.body;
    body.className = '';
    if (theme !== 'classic-dark') {
      body.classList.add(theme);
    }
  }, [theme]);

  // Sync font changes
  useEffect(() => {
    loadGoogleFont(fontFamily);

    const fontStacks = {
      'Outfit': "'Outfit', sans-serif",
      'Space Grotesk': "'Space Grotesk', sans-serif",
      'Inter': "'Inter', sans-serif",
      'Poppins': "'Poppins', sans-serif",
      'Roboto': "'Roboto', sans-serif",
      'Noto Sans Devanagari (Hindi/Nepali)': "'Noto Sans Devanagari', sans-serif",
      'Noto Sans Bengali (Bangla)': "'Noto Sans Bengali', sans-serif",
      'Noto Sans Gurmukhi (Punjabi)': "'Noto Sans Gurmukhi', sans-serif",
      'Cinzel (Elegant)': "'Cinzel', serif",
      'Bungee (Playful Bold)': "'Bungee', sans-serif"
    };

    const targetStack = fontStacks[fontFamily] || "'Outfit', sans-serif";
    document.documentElement.style.setProperty('--font-body', targetStack);
  }, [fontFamily]);

  // Handle Login session
  const handleLogin = (userData) => {
    setUser(userData);
    safeStorage.setItem('vox_user_session', JSON.stringify(userData));
  };

  // Handle Logout session
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      setUser(null);
      safeStorage.removeItem('vox_user_session');
    }
  };

  // Load projects from local storage
  const loadProjectsList = () => {
    const list = safeJsonParse(safeStorage.getItem('vox_global_projects'), []);
    const owner = user ? user.email : 'guest';
    setProjectsList(list.filter(p => p.owner === owner).sort((a, b) => b.updatedAt - a.updatedAt));
  };

  useEffect(() => {
    loadProjectsList();
  }, [user]);

  // Project Creation Callback
  const handleCreateProject = (name) => {
    const newProj = {
      id: 'proj_' + Math.random().toString(36).substring(2, 9),
      name,
      owner: user ? user.email : 'guest',
      updatedAt: Date.now(),
      assets: [],
      history: [],
      // unified state parameters
      lyricsText: '',
      musicPrompt: 'sad melancholic piano for a shayari',
      voiceSourceMode: 'tts',
      selectedVoice: '',
      speechRate: 1,
      speechPitch: 1,
      emotiveTone: 'dramatic',
      clonedVoiceUrl: '',
      copyVoiceAndSongStyle: true,
      soundscape: 'none',
      soundscapeVolume: 0.25,
      generatedSongUrl: '',
      selectedEffect: 'none',
      voiceEnhancement: false,
      coverSongUrl: '',
      coverInstrumentalUrl: '',
      coverRecordedUrl: '',
      poetryLyrics: '',
      poetryPrompt: '',
      poetryBackdropUrl: '',
      poetryBackdropType: 'image',
      visualFontTemplate: 'elegant',
      videoUrl: '',
      mediaType: 'video',
      cues: [],
      subtitleLang: 'en-US',
      bgVolume: 0.2,
      videoVolume: 0.8,
      vocalVolume: 1.0,
      bgMusicUrl: '',
      recordedVocalUrl: '',
      visualTemplate: 'none',
      trimMode: 'none',
      targetUrl: '',
      reactionUrl: '',
      layoutStyle: 'pip-bottomright',
      targetVolume: 0.5,
      reactionVolume: 0.8
    };

    const list = safeJsonParse(safeStorage.getItem('vox_global_projects'), []);
    list.push(newProj);
    safeStorage.setItem('vox_global_projects', JSON.stringify(list));
    setActiveProject(newProj);
    loadProjectsList();
  };

  // Project Deletion Callback
  const handleDeleteProject = (id) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    const list = safeJsonParse(safeStorage.getItem('vox_global_projects'), []);
    const filtered = list.filter(p => p.id !== id);
    safeStorage.setItem('vox_global_projects', JSON.stringify(filtered));
    if (activeProject && activeProject.id === id) {
      setActiveProject(null);
    }
    loadProjectsList();
  };

  // Project Loading Callback
  const handleLoadProject = (proj) => {
    setActiveProject(proj);
    // Auto restore active tab based on project configuration (optional fallback)
    setIsTimelineOpen(false);
  };

  // Update Project States & Checkpoint timeline
  const handleUpdateProjectState = (diff, historyDesc) => {
    if (!activeProject) return;

    setActiveProject(prev => {
      const updated = { ...prev, ...diff, updatedAt: Date.now() };

      if (historyDesc) {
        const newHistoryEntry = {
          id: 'rev_' + Math.random().toString(36).substring(2, 9),
          description: historyDesc,
          timestamp: Date.now(),
          snapshot: { ...prev } // saves a complete snapshot of modules states
        };
        updated.history = [...(prev.history || []), newHistoryEntry];
      }

      // Sync back to local storage list
      const list = safeJsonParse(safeStorage.getItem('vox_global_projects'), []);
      const idx = list.findIndex(p => p.id === prev.id);
      if (idx !== -1) {
        list[idx] = updated;
      } else {
        list.push(updated);
      }
      safeStorage.setItem('vox_global_projects', JSON.stringify(list));
      return updated;
    });
  };

  // Add a generated or uploaded file to Project assets list
  const handleAddProjectAsset = async (name, type, blobOrText) => {
    if (!activeProject) return null;

    const assetId = 'asset_' + Math.random().toString(36).substring(2, 9);
    let assetUrl = '';

    if (blobOrText instanceof Blob) {
      const dbKey = `${activeProject.id}_${assetId}`;
      await saveBlob(dbKey, blobOrText);
      assetUrl = URL.createObjectURL(blobOrText);
    } else {
      assetUrl = blobOrText;
    }

    const newAsset = {
      id: assetId,
      name,
      type,
      url: assetUrl,
      createdAt: Date.now()
    };

    handleUpdateProjectState({
      assets: [...(activeProject.assets || []), newAsset]
    }, `Added file asset: ${name}`);

    return newAsset;
  };

  // Revert / Rollback to a specific revision checkpoint
  const handleRevertToRevision = (entry) => {
    if (!activeProject || !entry.snapshot) return;

    const restored = {
      ...activeProject,
      ...entry.snapshot,
      updatedAt: Date.now()
    };

    // Push rollback notification inside history timeline
    restored.history = [...(activeProject.history || []), {
      id: 'rev_' + Math.random().toString(36).substring(2, 9),
      description: `Reverted back to: ${entry.description}`,
      timestamp: Date.now(),
      snapshot: { ...activeProject }
    }];

    setActiveProject(restored);

    const list = safeJsonParse(safeStorage.getItem('vox_global_projects'), []);
    const idx = list.findIndex(p => p.id === activeProject.id);
    if (idx !== -1) {
      list[idx] = restored;
    }
    safeStorage.setItem('vox_global_projects', JSON.stringify(list));
    alert(`Project successfully reverted: "${entry.description}"`);
  };

  // Guided Tour overlay component
  const renderTourOverlay = () => {
    if (tourStep === null) return null;

    const tourSteps = [
      {
        title: "📁 Step 1: Create or Load a Project",
        text: "Before starting, open the '📁 Project Studio' in the top bar to create a project (e.g. 'My Song A'). This acts as your workspace folder, automatically saving all your audio stems, backing tracks, video files, and edit histories in one place.",
        actionLabel: "Next Step"
      },
      {
        title: "🎵 Step 2: Create AI Songs & Voice Clones",
        text: "In the 'AI Audio Lab' tab, paste your lyrics/Shayari. Choose a voice style (or upload a 10-second reference file to clone your own voice!). Describe your musical style (e.g. 'lofi guitar, sad beat') and click 'Generate AI Song' to build a complete track.",
        actionLabel: "Next Step"
      },
      {
        title: "📖 Step 3: Mix Video Backdrops & Teleprompter",
        text: "Switch to 'Shayri/Poetry Studio' to upload scrolling lyrics, select visual image/video backdrops (walking reels, aesthetic loops), and hit record to capture a cinematic lyric video overlaid with your vocals!",
        actionLabel: "Next Step"
      },
      {
        title: "✂️ Step 4: Extract Stems & Record Cover Songs",
        text: "Use the 'Stem Separator' to extract clean vocal and instrumental tracks from any song. Then, go to the 'Cover Creator' to replace the singer's voice with your own cloned voice style for a custom cover mix!",
        actionLabel: "Next Step"
      },
      {
        title: "🕒 Step 5: Revert check-points & Delete changes",
        text: "Every edit is recorded as a checkpoint in your timeline. Open the 'Project Studio' drawer to view your history. You can revert the entire project back in time or delete a single voiceover you disliked without affecting the rest!",
        actionLabel: "Finish Tour"
      }
    ];

    const currentStep = tourSteps[tourStep];

    return (
      <div style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.65)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(3px)'
      }}>
        <div className="glass-panel" style={{
          width: '450px',
          padding: '2rem',
          position: 'relative',
          border: '1px solid var(--accent-primary)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.3s ease'
        }}>
          {/* Progress bar */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '4px',
            width: `${((tourStep + 1) / tourSteps.length) * 100}%`,
            background: 'linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
            transition: 'width 0.3s ease'
          }} />

          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: 'var(--accent-glow)',
              color: 'var(--accent-primary)',
              padding: '0.2rem 0.6rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              {tourStep + 1} / {tourSteps.length}
            </span>
            {currentStep.title}
          </h3>
          
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            {currentStep.text}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setTourStep(null)}
              className="btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              Skip
            </button>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {tourStep > 0 && (
                <button
                  onClick={() => setTourStep(prev => prev - 1)}
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  Back
                </button>
              )}
              <button
                onClick={() => {
                  if (tourStep === tourSteps.length - 1) {
                    setTourStep(null);
                    safeStorage.setItem('vox_tour_seen', 'true');
                  } else {
                    setTourStep(prev => prev + 1);
                  }
                }}
                className="btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}
              >
                {currentStep.actionLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Delete a history entry
  const handleDeleteRevision = (revId) => {
    if (!activeProject) return;
    const filteredHistory = (activeProject.history || []).filter(h => h.id !== revId);
    handleUpdateProjectState({
      history: filteredHistory
    }, "Removed timeline history log");
  };

  // Save Checkpoint manually
  const handleSaveManualSnapshot = (desc) => {
    handleUpdateProjectState({}, desc);
  };

  // Handle Project Selection from Dashboard
  const handleSelectProject = (project) => {
    setIsProjectsOpen(false);
    setActiveModule(project.type);
    setLoadedProject(project);
  };

  // Reset loaded project when switching tabs manually
  const handleModuleChange = (module) => {
    setActiveModule(module);
  };

  // Render active module
  const renderModule = () => {
    const commonProps = {
      language,
      theme,
      user,
      loadedProject,
      activeProject,
      onUpdateProjectState: handleUpdateProjectState,
      onAddProjectAsset: handleAddProjectAsset
    };

    switch (activeModule) {
      case 'poetry':
        return <PoetryStudio {...commonProps} />;
      case 'video':
        return <VideoEditor {...commonProps} />;
      case 'reaction':
        return <ReactionStudio {...commonProps} />;
      case 'ai-lab':
        return <AIAudioLab {...commonProps} />;
      default:
        return <AIAudioLab {...commonProps} />;
    }
  };

  const getModuleTitle = (mod) => {
    switch (mod) {
      case 'poetry': return 'Shayri/Poetry Studio';
      case 'video': return t.videoEditor;
      case 'reaction': return t.reactionStudio;
      case 'ai-lab': return 'AI Audio Lab';
      default: return 'AI Audio Lab';
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeModule={activeModule}
        setActiveModule={handleModuleChange}
        language={language}
        onStartTour={() => setTourStep(0)}
      />

      {/* Main Container including Top Header & Studio Viewport */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Top Header Bar */}
        <header style={{
          height: '64px',
          background: 'rgba(13, 13, 16, 0.4)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          zIndex: 90
        }}>
          {/* Active Tool Label Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: 'var(--accent-glow)',
              color: 'var(--accent-primary)',
              padding: '0.3rem 0.8rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
              border: '1px solid rgba(139, 92, 246, 0.2)'
            }}>
              {getModuleTitle(activeModule).toUpperCase()}
            </span>
          </div>

          {/* Right Header Navigation Panel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            
            {/* Language Selector Selector (Pill Style) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '2px 8px 2px 4px' }}>
              <Globe size={14} style={{ color: 'var(--text-secondary)', marginLeft: '4px' }} />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="form-select"
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  padding: '2px 14px 2px 2px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: 'auto',
                  boxShadow: 'none'
                }}
              >
                {availableLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.label}</option>
                ))}
              </select>
            </div>

            {/* My Projects Button / Indicator */}
            <button
              onClick={() => setIsTimelineOpen(true)}
              className="btn-secondary"
              style={{
                padding: '0.45rem 0.9rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: activeProject ? 'var(--accent-glow)' : 'transparent',
                borderColor: activeProject ? 'var(--accent-primary)' : 'var(--border-color)',
                color: activeProject ? 'var(--text-primary)' : 'var(--text-secondary)'
              }}
            >
              <FolderOpen size={14} style={{ color: activeProject ? 'var(--accent-primary)' : 'var(--text-secondary)' }} />
              <span>{activeProject ? `Project: ${activeProject.name}` : '📁 Project Studio'}</span>
            </button>

            {/* User Auth state Toggle button */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* User avatar profile preview */}
                <div
                  title={`Logged in as ${user.email}`}
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px var(--accent-glow)'
                  }}
                >
                  {user.email.substring(0, 2).toUpperCase()}
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-secondary"
                  style={{
                    padding: '0.45rem',
                    borderRadius: '50%',
                    borderColor: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444'
                  }}
                  title="Logout"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="btn-primary"
                style={{
                  padding: '0.45rem 1.1rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: '20px'
                }}
              >
                Sign In / Sign Up
              </button>
            )}

            {/* Settings Hamburger Toggle Button */}
            <div style={{ position: 'relative' }} ref={settingsRef}>
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="btn-secondary"
                style={{
                  padding: '0.5rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Settings"
              >
                <Menu size={16} />
              </button>

              {/* Hamburger Settings dropdown popover */}
              {isSettingsOpen && (
                <div style={{
                  position: 'absolute',
                  top: '42px',
                  right: 0,
                  width: '240px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1rem',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  animation: 'fadeIn 0.2s ease',
                  zIndex: 99
                }}>
                  <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 0.25rem 0' }}>
                    Quick Settings
                  </h3>

                  {/* App Theme selector */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.4rem' }}>
                      <Palette size={12} /> {t.theme}
                    </label>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="form-select"
                      style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                    >
                      {themes.map((th) => (
                        <option key={th.id} value={th.id}>{th.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* App Font Selector */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.4rem' }}>
                      <Type size={12} /> {t.appFont}
                    </label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="form-select"
                      style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                    >
                      {fontOptions.map((font) => (
                        <option key={font.name} value={font.name}>{font.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Logout option directly inside Settings Popover */}
                  {user && (
                    <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                      <button
                        onClick={() => {
                          setIsSettingsOpen(false);
                          handleLogout();
                        }}
                        className="btn-secondary"
                        style={{
                          width: '100%',
                          padding: '0.45rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          justifyContent: 'center',
                          borderColor: 'rgba(239, 68, 68, 0.2)',
                          color: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <LogOut size={12} />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Main Studio Viewport */}
        <main className="main-content" style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          {renderModule()}
        </main>
      </div>

      {/* Authentication Modal Popup */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={handleLogin}
        language={language}
      />

      {/* Project Drafts Dashboard Popup */}
      <ProjectManager
        isOpen={isProjectsOpen}
        onClose={() => setIsProjectsOpen(false)}
        onSelectProject={handleSelectProject}
        userEmail={user ? user.email : null}
        language={language}
      />

      {/* Unified Project Studio timeline Drawer */}
      <ProjectTimelineDrawer
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        activeProject={activeProject}
        projectsList={projectsList}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
        onLoadProject={handleLoadProject}
        onRevertToRevision={handleRevertToRevision}
        onDeleteRevision={handleDeleteRevision}
        onSaveManualSnapshot={handleSaveManualSnapshot}
        language={language}
      />

      {/* Guided Walkthrough Overlay */}
      {renderTourOverlay()}
    </div>
  );
}

export default App;
