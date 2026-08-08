// src/app/page.tsx
'use client';

import { useEffect, useRef } from 'react';
import { STAR_CATALOG } from './data/stars';

export default function StarMapPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const rMax = canvas.width / 2 - 20; // 地平線の半径

    // 東京の緯度と仮の地方恒星時
    const lat = 35.6 * Math.PI / 180;
    const lst = 18.5;

    // 描画エリアのクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 背景の円と十字線（地平線・方位線）の描画
    ctx.strokeStyle = '#1e272c';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, rMax, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - rMax); ctx.lineTo(cx, cy + rMax); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - rMax, cy); ctx.lineTo(cx + rMax, cy); ctx.stroke();

    // 方位ラベル
    ctx.fillStyle = '#576574';
    ctx.font = '14px sans-serif';
    ctx.fillText('北', cx - 7, cy - rMax - 8);
    ctx.fillText('南', cx - 7, cy + rMax + 20);
    ctx.fillText('東', cx - rMax - 22, cy + 5);
    ctx.fillText('西', cx + rMax + 10, cy + 5);

    // 2. 星の位置計算とCanvasへのプロット
    STAR_CATALOG.forEach(star => {
      const ha = (lst - star.ra) * 15 * Math.PI / 180;
      const decRad = star.dec * Math.PI / 180;

      // 天体座標から地平座標への計算
      const sinAlt = Math.sin(decRad) * Math.sin(lat) + Math.cos(decRad) * Math.cos(lat) * Math.cos(ha);
      const alt = Math.asin(sinAlt);

      // 地平線の下にある星は描画しない
      if (alt < 0) return;

      const cosAz = (Math.sin(decRad) - Math.sin(alt) * Math.sin(lat)) / (Math.cos(alt) * Math.cos(lat));
      let az = Math.acos(Math.min(1, Math.max(-1, cosAz)));
      if (Math.sin(ha) > 0) az = Math.PI * 2 - az;

      // 正距方位図法による画面上のXYマッピング
      const r = rMax * (1 - alt / (Math.PI / 2));
      const x = cx + r * Math.sin(az);
      const y = cy - r * Math.cos(az);

      // 等級に応じた星のドットサイズ
      const size = Math.max(1, 5 - star.mag);

      // 星のドットを描画
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();

      // 日本語の星の名前を描画
      ctx.fillStyle = '#48dbfb';
      ctx.font = '11px sans-serif';
      ctx.fillText(star.name, x + 6, y + 4);
    });
  }, []);

  return (
    <div style={{ backgroundColor: '#0c0f1d', color: 'white', minHeight: '100vh', textAlign: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Next.js 2Dプラネタリウム星図</h1>
      <p style={{ color: '#888' }}>内部のモジュールデータからローカルセキュリティ制限なしで直接描画しています</p>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
        <canvas
          ref={canvasRef}
          width={500}
          height={500}
          style={{ backgroundColor: '#000000', borderRadius: '50%', boxShadow: '0 0 25px rgba(255,255,255,0.1)', border: '3px solid #2c3e50' }}
        />
      </div>
    </div>
  );
}
