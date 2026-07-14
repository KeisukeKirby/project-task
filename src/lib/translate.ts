import { Language, MultiLangText } from '@/types';

export async function translateText(text: string, currentLang: Language): Promise<MultiLangText | null> {
  if (!text.trim()) return null;

  try {
    // Always translate to all supported languages.
    // This ensures that if a user types Japanese while the UI is in English mode,
    // the English field will correctly receive the English translation.
    const targetLangs: Language[] = ['ja', 'en', 'th'];
    
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
