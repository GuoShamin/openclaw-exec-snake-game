(() => {
  'use strict';
  const meta = document.getElementById('meta');
  const canvas = document.getElementById('game');
  if (meta) {
    meta.textContent = 'Gemini CLI 版本：当前由于账号需要 Verify（Google account alert），暂未能生成代码。';
  }
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = 'rgba(0,0,0,.06)';
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = 'rgba(0,0,0,.65)';
      ctx.font = '16px ui-sans-serif, system-ui, -apple-system';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Gemini CLI pending verification', rect.width / 2, rect.height / 2);
    }
  }
})();
