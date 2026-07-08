import { Language, MultiLangText } from '@/types';

export async function translateText(text: string, currentLang: Language): Promise<MultiLangText | null> {
  if (!text.trim()) return null;

  try {
    const targetLangs: Language[] = ['ja', 'en', 'th'];
    // We can also translate to the currentLang just to be safe, or just use the original text for it.
    // For simplicity, let's translate to all 3 languages.
    
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
        ja: data.translations.ja || text,
        en: data.translations.en || text,
        th: data.translations.th || text,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Translation API error:', error);
    return null;
  }
}
