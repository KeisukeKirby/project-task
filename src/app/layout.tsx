import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProjectHub — プロジェクト進捗管理ダッシュボード",
  description: "複数プロジェクトの進捗を一元管理。締切逆算スケジューリング、ガントチャート、カンバン、リードタイム分析を備えた統合ダッシュボード。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+JP:wght@300;400;500;600;700&family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📊</text></svg>" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
