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
        console.error(`Failed to translate to ${lang}:`, err);
        // Fallback to original text if translation fails
        translations[lang] = text;
      }
    }

    return NextResponse.json({ translations });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
