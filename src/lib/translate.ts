import { Language, MultiLangText } from '@/types';

export async function translateText(text: string, currentLang: Language): Promise<MultiLangText | null> {
  if (!text.trim()) return null;

  try {
    // Do not translate the text into the current language, so that whatever the user types 
    // (even if it's English in Japanese mode) is preserved exactly as is for their current language setting.
    const targetLangs: Language[] = ['ja', 'en', 'th'].filter(l => l !== currentLang) as Language[];
    
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        targetLangs,
      }),
    });

    if (!response.ok) {
      throw new Error('Translation failed');
    }

    const data = await response.json();
    
    if (data.translations) {
      return {
        ja: currentLang === 'ja' ? text : (data.translations.ja || text),
        en: currentLang === 'en' ? text : (data.translations.en || text),
        th: currentLang === 'th' ? text : (data.translations.th || text),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Translation API error:', error);
    return null;
  }
}
