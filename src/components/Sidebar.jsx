import { Download, Mic, Film, BookOpen, Tv, Sparkles } from 'lucide-react';
import { translations } from '../assets/translations';

const Sidebar = ({
  activeModule,
  setActiveModule,
  language,
  onStartTour
}) => {
  const t = translations[language] || translations.en;

  const menuItems = [
    { id: 'ai-lab', label: 'AI Audio Lab', icon: Mic },
    { id: 'poetry', label: 'Shayri/Poetry Studio', icon: BookOpen }, 
    { id: 'video', label: t.videoEditor, icon: Film },
    { id: 'reaction', label: t.reactionStudio, icon: Tv }
  ];

  return (
    <div className="glass-panel" style={{
      width: '280px',
      height: '100vh',
      borderRadius: '0',
      borderLeft: 'none',
      borderTop: 'none',
      borderBottom: 'none',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      zIndex: 10,
      padding: '2rem 1.5rem'
    }}>
      <div>
        {/* App Title Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <img
            src="./logo.png"
            alt="VoxStudio Logo"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              boxShadow: '0 4px 12px var(--accent-glow)',
              objectFit: 'cover'
            }}
          />
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.5px' }}>{t.title}</h1>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '-3px' }}>
              {t.subtitle}
            </span>
          </div>
        </div>

        {/* Tab Module Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  width: '100%',
                  padding: '0.85rem 1.2rem',
                  border: 'none',
                  borderRadius: '8px',
                  background: isActive ? 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 12px var(--accent-glow)' : 'none'
                }}
              >
                <Icon size={18} style={{ opacity: isActive ? 1 : 0.7 }} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        {/* Help Tour button */}
        <button
          onClick={onStartTour}
          className="btn-secondary"
          style={{
            width: '100%',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '0.78rem',
            padding: '0.55rem',
            marginBottom: '1rem',
            borderColor: 'var(--accent-primary)',
            background: 'rgba(255, 111, 0, 0.05)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          💡 Help Guide & Tour
        </button>

        {/* Localized APK download button */}
        {(() => {
          const getDownloadText = (lang) => {
            switch(lang) {
              case 'hi': return "एंड्रॉइड ऐप डाउनलोड करें";
              case 'ne': return "एन्ड्रोइड एप डाउनलोड गर्नुहोस्";
              case 'bn': return "অ্যান্ড্রয়েড অ্যাপ ডাউনলোড করুন";
              case 'pa': return "ਐਂਡਰੌਇਡ ਐਪ ਡਾਊਨਲੋਡ ਕਰੋ";
              case 'de': return "Android-App herunterladen";
              case 'es': return "Descargar App de Android";
              case 'fr': return "Télécharger l'App Android";
              case 'ar': return "تحميل تطبيق أندرويد";
              case 'zh': return "下载安卓应用";
              default: return "Download Android App";
            }
          };

          return (
            <a
              href="/voxstudio.apk"
              download="VoxStudio.apk"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.8rem 1rem',
                border: '1px dashed var(--accent-primary)',
                borderRadius: '8px',
                background: 'var(--accent-glow)',
                color: 'var(--text-primary)',
                textDecoration: 'none',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '0.85rem',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 10px var(--accent-glow)',
                textAlign: 'center'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.background = 'var(--accent-primary)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'var(--accent-glow)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
            >
              <Download size={16} />
              <span>{getDownloadText(language)}</span>
            </a>
          );
        })()}
      </div>
    </div>
  );
};

export default Sidebar;
