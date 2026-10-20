# ProjectHub — スタッフのタスク・会社運営の進捗ダッシュボード

ログイン画面はありません。URL を開いて **自分の名前をタップするだけ** で使えます（パスワード不要）。
選んだ名前はブラウザに記憶されるので、次回からはすぐにダッシュボードが開きます。
名前を変えたいときは右上のアイコン →「名前を切り替える」。一覧に自分の名前が無いときは「自分の名前がない（新しく追加）」から追加できます。

## 初回セットアップ（Supabase 側・1 回だけ）

アプリは Supabase Auth を使わず、公開 anon キーだけでデータを読み書きします。
Supabase の SQL Editor で `supabase/no_login_access.sql` を一度実行して、行レベルセキュリティ (RLS) を「誰でも読み書き可」にしてください。
実行していないと、画面は開けますがタスクの保存時に「保存できませんでした」と表示されます。

- 必要な環境変数（Vercel に設定済み）: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 注意: URL を知っている人は誰でも編集できる設定です。社内でリンクを共有する前提で使ってください。
- 管理者メニュー（アカウント管理）は、名前または権限が管理者のユーザーで名前を選ぶと表示されます。メンバーの追加は「名前と権限」だけです。

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
