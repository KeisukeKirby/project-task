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

    // Translate to all requested languages
    // To optimize, we can use Promise.all
    const promises = targetLangs.map(async (lang) => {
      // Map 'ja', 'en', 'th' to google translate codes if necessary (they are identical)
      const res = await translate(text, { to: lang }) as any;
      translations[lang] = res.text;
    });

    await Promise.all(promises);

    return NextResponse.json({ translations });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
