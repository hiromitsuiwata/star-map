"use client";

import { useEffect, useRef, useState } from "react";
import { ParsedStar } from "./data/csvParser";
import { convertEquatorialToHorizontal } from "./data/celestial";

// 東京の経度 (東経139.7414度)
const TOKYO_LON = 139.7414;
// 東京の緯度 (北緯35.6581度)
const TOKYO_LAT = 35.6581;

interface StarCanvasProps {
  stars: ParsedStar[];
  width: number;
  height: number;
}

/**
 * ミリ秒（UTC）からユリウス日（JD）を計算
 */
function getJulianDate(ms: number): number {
  return ms / 86400000 + 2440587.5;
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
  let lst = gmst + longitude / 15;
  lst = lst % 24;
  if (lst < 0) lst += 24;

  return lst;
}

export const StarCanvas: React.FC<StarCanvasProps> = ({
  stars,
  width,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [now, setNow] = useState(new Date());

  // 1分ごとに現在時刻を更新
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const lstHours = calculateLST(now.getTime(), TOKYO_LON);

  // Canvasへの描画処理
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = width / 2;
    const cy = height / 2;
    const rMax = Math.min(width, height) / 2 - 25; // 地平線の半径（余白調整）

    // 東京の緯度（ラジアン）
    const lat = (TOKYO_LAT * Math.PI) / 180;

    // 描画エリアのクリア
    ctx.clearRect(0, 0, width, height);

    // 1. 背景の円と十字線（地平線・方位線）の描画
    ctx.strokeStyle = "#1e272c";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, rMax, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - rMax);
    ctx.lineTo(cx, cy + rMax);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - rMax, cy);
    ctx.lineTo(cx + rMax, cy);
    ctx.stroke();

    // 方位ラベル（見上げ星図：上が北のとき、左が東、右が西）
    ctx.fillStyle = "#576574";
    ctx.font = "14px sans-serif";
    ctx.fillText("北", cx - 7, cy - rMax - 8);
    ctx.fillText("南", cx - 7, cy + rMax + 20);
    ctx.fillText("東", cx - rMax - 22, cy + 5);
    ctx.fillText("西", cx + rMax + 10, cy + 5);

    // --- ここから座標線の描画 ---
    ctx.strokeStyle = "#2c3a47"; // 線の色（星より目立たない暗めの色）
    ctx.lineWidth = 0.5; // 細い線
    ctx.fillStyle = "#576574"; // 高度ラベルの文字色
    ctx.font = "10px sans-serif";

    // 1. 高度線
    const altLines = [15, 30, 45, 60, 75];
    altLines.forEach((altDeg) => {
      const altRad = (altDeg * Math.PI) / 180;
      // 天頂からの角距離に比例する半径
      const r = rMax * (1 - altRad / (Math.PI / 2));

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // 高度のラベルを描画（北側の線上に配置）
      ctx.fillText(`${altDeg}°`, cx + 4, cy - r - 4);
    });

    // 2. 方位線（15度刻み、ただし東西南北の0,90,180,270は除く）
    for (let azDeg = 15; azDeg < 360; azDeg += 15) {
      if (azDeg % 90 === 0) continue; // 東西南北はすでに十字線を引いているのでスキップ

      const azRad = (azDeg * Math.PI) / 180;

      // 見上げ星図（左が東、右が西）の向きに合わせる
      const targetX = cx - rMax * Math.sin(azRad);
      const targetY = cy - rMax * Math.cos(azRad);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
    }
    // --- ここまで座標線の描画 ---

    // すべての星のループ描画
    stars.forEach((star) => {
      const horizontalPosition = convertEquatorialToHorizontal(
        star,
        lstHours,
        lat,
      )!;

      if (!horizontalPosition) return; // 地平線の下にある星は描画しない

      // 正距方位図法による画面上のXYマッピング
      // 天頂からの角距離に比例する半径 r
      const r = rMax * (1 - horizontalPosition.alt / (Math.PI / 2));

      // 見上げ星図（左が東、右が西）にするため、X軸はマイナスにする
      const x = cx - r * Math.sin(horizontalPosition.az);
      const y = cy - r * Math.cos(horizontalPosition.az);

      // 星のドットを描画
      ctx.beginPath();
      ctx.fillStyle = star.colorHex || "#ffffff";
      ctx.arc(x, y, star.size || 2, 0, Math.PI * 2);
      ctx.fill();

      // 日本語の星の名前を描画
      if (star.name) {
        ctx.fillStyle = "#48dbfb";
        ctx.font = "11px sans-serif";
        ctx.fillText(star.name, x + 6, y + 4);
      }
    });
  }, [stars, width, height, lstHours]); // 依存配列に lstHours を追加して毎分再描画

  return (
    <div>
      <h3>東京 地方恒星時クロック</h3>
      <strong>現在時刻 (JST):</strong> {now.toLocaleString("ja-JP")}
      <br />
      <strong>地方恒星時 (LST hours):</strong> {lstHours.toFixed(4)}
      <br />
      <canvas ref={canvasRef} width={width} height={height} />
    </div>
  );
};
