// Google Fonts are fetched lazily: boot only loads Inter/Outfit/Playfair/JetBrains Mono (see index.html).
const FONT_QUERY: Record<string, string> = {
  'plus-jakarta': 'Plus+Jakarta+Sans:ital,wght@0,400..800;1,400..800',
  lora: 'Lora:ital,wght@0,400..700;1,400..700',
  merriweather: 'Merriweather:ital,wght@0,300;0,400;0,700;1,300',
  'space-grotesk': 'Space+Grotesk:wght@300..700',
  syncopate: 'Syncopate:wght@400;700',
  syne: 'Syne:wght@400..800',
  cormorant: 'Cormorant+Garamond:ital,wght@0,400..700;1,400..700',
  cinzel: 'Cinzel:wght@400..800',
};

export const ensureFontLoaded = (id: string) => {
  const family = FONT_QUERY[id];
  if (!family || document.getElementById(`font-${id}`)) return;
  const link = document.createElement('link');
  link.id = `font-${id}`;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
  document.head.appendChild(link);
};
