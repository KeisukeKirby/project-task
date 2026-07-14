import { NextResponse } from 'next/server';
import translate from 'google-translate-api-x';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, targetLangs } = body;

    if (!text || !targetLangs || !Array.isArray(targetLangs)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const translations: Record<string, string> = {};

    // Translate sequentially to avoid rate limiting on Vercel
    for (const lang of targetLangs) {
      try {
        const res = await translate(text, { to: lang }) as any;
        translations[lang] = res.text;
      } catch (err) {
        console.error(`Google Translate failed for ${lang}:`, err);
        // Fallback to MyMemory API if google-translate-api-x gets blocked by Vercel
        try {
          const fallbackRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${lang}`);
          const fallbackData = await fallbackRes.json();
          if (fallbackData.responseData && fallbackData.responseData.translatedText) {
            translations[lang] = fallbackData.responseData.translatedText;
          } else {
            translations[lang] = text;
          }
        } catch (fallbackErr) {
          console.error(`Fallback translation failed for ${lang}:`, fallbackErr);
          translations[lang] = text;
        }
      }
    }

    return NextResponse.json({ translations });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
