const translate = require('google-translate-api-x');

async function run() {
  try {
    const text = "[AW]店舗オープンプロモーション";
    console.log("Translating:", text);
    const res = await translate(text, { to: 'en' });
    console.log("Result:", res.text);
  } catch(e) {
    console.error("Error:", e);
  }
}
run();
