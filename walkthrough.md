# Walkthrough: VoxStudio - Multilingual Free Audio & Video Creator

VoxStudio is a 100% serverless, client-side web application running directly in the browser and compiled into a native Android APK package.

You can launch and access the app locally at: **[http://localhost:5175/](http://localhost:5175/)**

---

## 🚀 Key Features Implemented

### 1. User Authentication & Security
- **Secure Log-in & Sign-up**: Beautiful modal interface allowing email-based registration and Google mock OAuth.
- **Registration CAPTCHA**: Visual math-based CAPTCHA ("\(3 + 8 = ?\)") generated dynamically *only* during registration to prevent bot sign-ups. No CAPTCHA is required during login.
- **Session Persistence**: User authentication states are automatically persisted locally.

### 2. My Projects & Drafts Manager
- **Local-First Database**: Save active compositions, scripts, timelines, volume balances, and overlays as drafts in `localStorage`/`IndexedDB` (completely free, private, offline-first).
- **Dashboard Panel**: Access saved projects from the top menu. Rename, load, or delete drafts individually.
- **Auto-Restore state**: Loading a draft automatically restores all timelines, caption cues, audio filters, volume levels, and options in the active module workspace.

### 3. Voice Studio & 10 Vocal Filters
- **AI Text-To-Speech (Multilingual Fallback)**: Support for Hindi, Punjabi, Bengali, and Nepali natural voices using an online API.
- **10 Sound Filters & Vocal Gender Converter**: Real-time Web Audio API node effect mapping and pitch shifting:
  1. *Normal Voice* (Bypassed)
  2. *Male Vocal* (Pitch shifted down to 0.8x)
  3. *Female Vocal* (Pitch shifted up to 1.3x)
  4. *Teenage Voice* (Pitch shifted up to 1.22x)
  5. *Heavy Voice* (Bass boosted low EQ + low pitch)
  6. *Echo/Delay* (350ms delay loop feedback)
  7. *Slowed & Reverb* (Slowed playback rate + ambient reverb)
  8. *Reverb Space* (1.8s convolution impulse response)
  9. *Large Hall* (Spacious 3.2s convolution reverb with pre-delay)
  10. *Distant Cave* (4.5s long delay + convolution reverb feedback loop)
  11. *Small Room* (Tight 22ms comb-filter echo)
- **Visualizer & Mixer**: Synchronized Canvas waveform visualizer and background music track mix controls.

### 4. Shayri/Poetry & Soundscape Studio
- **Auto-Scrolling Teleprompter**: Read text inputs/poems with adjustable font size and scroll speed.
- **Immersive Soundscape Mixer**: Layer voice recordings with ambient backdrop loops or custom uploaded audio files.

### 5. Video Editor with Single & Multi-Level Trimming
- **Trimming & Cutting Studio**: Upload video/image files (no file size limits, loads movies instantly client-side).
  - *Single Trim*: Set a start and end slider range to cut a single clip.
  - *Multi-Level Trim (Multi-Trim)*: Slice a single video at multiple levels (e.g. 5s from start, 5s from middle, 10s from end).
  - *Stitch & Merge*: Stitches multiple parts together. The canvas and audio mixer dynamically jump over the cut intervals during live preview playback and offline export rendering.
- **Auto-Subtitles**: Speech-to-text transcriber using Web Speech Recognition.
- **CapCut Visual Effects**: Cinematic Ken Burns zoom, Vintage VHS scanlines, Cyber Glitch RGB split, Light Leaks, and Grayscale Mono filters.

### 6. Reaction Video PiP Studio
- Layer live webcam stream or pre-recorded reaction video files on top of a main target video with corner pip layouts, splits, or side-by-side grids.

### 7. Unified Top Header Layout & Hamburger Settings
- **Top Header Menu**: Includes active module badge, language toggler, My Projects dashboard button, and Auth profile avatar.
- **Hamburger Settings Menu (3 Lines)**: Floating popover near the profile avatar containing:
  - *App Theme*: Classic Dark, Cyberpunk, Midnight Ocean, Solarized Amber, Forest Emerald, Sunset Rose, Minimalist Light.
  - *App Font*: Dynamic Google Font typography.
  - *Logout Button*: Appears directly next to themes and fonts.

---

## 🛠️ Codebase Structure Created

- [index.css](file:///C:/Users/hp/.gemini/antigravity/scratch/vox-studio/src/index.css): Core CSS themes and layout grids.
- [translations.js](file:///C:/Users/hp/.gemini/antigravity/scratch/vox-studio/src/assets/translations.js): Translations dictionary for 10 target scripts.
- [fontLoader.js](file:///C:/Users/hp/.gemini/antigravity/scratch/vox-studio/src/assets/fontLoader.js): Dynamic Google Fonts script injection wrapper.
- [AuthModal.jsx](file:///C:/Users/hp/.gemini/antigravity/scratch/vox-studio/src/components/AuthModal.jsx): Login/registration modal featuring Google Mock login and reloadable math CAPTCHA.
- [ProjectManager.jsx](file:///C:/Users/hp/.gemini/antigravity/scratch/vox-studio/src/components/ProjectManager.jsx): Saved projects list drawer overlay.
- [AudioVisualizer.jsx](file:///C:/Users/hp/.gemini/antigravity/scratch/vox-studio/src/components/AudioVisualizer.jsx): Web Audio canvas visualizer.
- [Sidebar.jsx](file:///C:/Users/hp/.gemini/antigravity/scratch/vox-studio/src/components/Sidebar.jsx): Navigation menu containing module tabs (Voice, Shayri/Poetry, Video Editor, Reaction Studio) and Android Download link.
- [App.jsx](file:///C:/Users/hp/.gemini/antigravity/scratch/vox-studio/src/App.jsx): Root controller containing the top header and Hamburger settings popover.
- [VoiceStudio.jsx](file:///C:/Users/hp/.gemini/antigravity/scratch/vox-studio/src/modules/VoiceStudio.jsx): AI TTS (with cloud fallback), mic recording, and 10 voice effects.
- [PoetryStudio.jsx](file:///C:/Users/hp/.gemini/antigravity/scratch/vox-studio/src/modules/PoetryStudio.jsx): Teleprompter Shayri narration workstation.
- [VideoEditor.jsx](file:///C:/Users/hp/.gemini/antigravity/scratch/vox-studio/src/modules/VideoEditor.jsx): Captions timeline, auto-transcribe, single/multi video trimmer, CapCut visual templates, and exporter.
- [ReactionStudio.jsx](file:///C:/Users/hp/.gemini/antigravity/scratch/vox-studio/src/modules/ReactionStudio.jsx): Double video PIP canvas layout recorder.

---

## 🔬 Build & Verification Results

1. **Vite Compile Success**: Production React bundle compiled successfully in `dist/`.
2. **Capacitor Sync Success**: Web assets compiled and successfully synchronized into the native Android Capacitor folder.
3. **Android Gradle Compile Success**: Native debug Android APK compiled successfully in `android/` using Java 21, copied to `public/voxstudio.apk`, and packaged into the final production bundle.
4. **Dev Server Port**: Vite server successfully restarted on port `5175`.
