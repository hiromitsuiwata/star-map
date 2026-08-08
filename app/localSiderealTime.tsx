'use client';

import React, { useState, useEffect } from 'react';

// 東京の経度 (東経139.7514度)
const TOKYO_LON = 139.7514;

/**
 * ミリ秒（UTC）からユリウス日（JD）を計算
 */
function getJulianDate(ms: number): number {
  return (ms / 86400000) + 2440587.5;
}

/**
 * 地方恒星時 (LST) を計算する（戻り値：時間単位の数値）
 */
function calculateLST(ms: number, longitude: number): number {
  const jd = getJulianDate(ms);
  const d = jd - 2451545.0; // J2000.0からの経過日数

  // グリニッジ平均恒星時 (GMST) の簡略計算式 (時間単位)
  let gmst = 18.697374558 + 24.06570982441908 * d;
  gmst = gmst % 24;
  if (gmst < 0) gmst += 24;

  // 地方恒星時 (LST) = GMST + (経度 / 15)
  let lst = gmst + (longitude / 15);
  lst = lst % 24;
  if (lst < 0) lst += 24;

  return lst;
}

/**
 * 時間の数値を「時:分:秒」の文字列にフォーマット
 */
function formatTime(hoursNum: number): string {
  const h = Math.floor(hoursNum);
  const m = Math.floor((hoursNum * 60) % 60);
  const s = Math.floor((hoursNum * 3600) % 60);

  const pad = (num: number) => String(num).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function TokyoSiderealClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const lstHours = calculateLST(now.getTime(), TOKYO_LON);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '400px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h3>東京 地方恒星時クロック</h3>
      <strong>現在時刻 (JST):</strong> {now.toLocaleString('ja-JP')}<br />
      <strong>地方恒星時 (LST hours):</strong> {lstHours}
    </div>
  );
}
