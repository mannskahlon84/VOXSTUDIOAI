const fontMap = {
  'Outfit': 'Outfit:wght@300;400;500;600;700;800',
  'Space Grotesk': 'Space+Grotesk:wght@400;500;600;700',
  'Inter': 'Inter:wght@300;400;500;600;700',
  'Poppins': 'Poppins:wght@300;400;500;600;700;800',
  'Roboto': 'Roboto:wght@300;400;500;700',
  'Noto Sans Devanagari (Hindi/Nepali)': 'Noto+Sans+Devanagari:wght@300;400;500;700',
  'Noto Sans Bengali (Bangla)': 'Noto+Sans+Bengali:wght@300;400;500;700',
  'Noto Sans Gurmukhi (Punjabi)': 'Noto+Sans+Gurmukhi:wght@300;400;500;700',
  'Cinzel (Elegant)': 'Cinzel:wght@400;600;700',
  'Bungee (Playful Bold)': 'Bungee'
};

export const loadGoogleFont = (fontName) => {
  const spec = fontMap[fontName];
  if (!spec) return;

  const id = `gfont-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return; // Already loaded

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
  document.head.appendChild(link);
};
