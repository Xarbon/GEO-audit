export const metadata = {
  title: 'GEO 可见度 · 让 AI 推荐你的跨境店',
  description: '当买家问 ChatGPT，你的店在答案里吗？一键测出 AI 可见度并拿到整改方案。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#FAFAF8', color: '#0E1525' }}>
        {children}
      </body>
    </html>
  );
}
