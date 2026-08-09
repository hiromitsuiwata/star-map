// StarCanvas.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { ParsedStar } from "./data/csvParser";
import { convertEquatorialToHorizontal } from "./data/celestial";
import { calculateLST } from "./data/time";
import { PROJECTIONS } from "./data/projections";

const TOKYO_LON = 139.7414;
const TOKYO_LAT = 35.6581;

interface StarCanvasProps {
  stars: ParsedStar[];
  width: number;
  height: number;
}

export const StarCanvas: React.FC<StarCanvasProps> = ({
  stars,
  width,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [now, setNow] = useState(new Date());
  const [projectionType, setProjectionType] = useState<string>("azimuthal");

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const lat = (TOKYO_LAT * Math.PI) / 180;
  const lstHours = calculateLST(now.getTime(), TOKYO_LON);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = width / 2;
    const cy = height / 2;
    const rMax = Math.min(width, height) / 2 - 25;

    const currentProjection =
      PROJECTIONS[projectionType] || PROJECTIONS.azimuthal;

    // キャンバスのクリア
    ctx.clearRect(0, 0, width, height);

    // 1. 図法固有の背景・ガイド線・ラベルを一発で描画
    currentProjection.drawBackground(ctx, cx, cy, rMax);

    // 2. 星の描画
    stars.forEach((star) => {
      const horizontalPosition = convertEquatorialToHorizontal(
        star,
        lstHours,
        lat,
      );
      if (!horizontalPosition || horizontalPosition.alt < 0) return;

      const pt = currentProjection.project(
        horizontalPosition.az,
        horizontalPosition.alt,
        cx,
        cy,
        rMax,
      );
      if (!pt) return;

      ctx.beginPath();
      ctx.fillStyle = star.colorHex || "#ffffff";
      ctx.arc(pt.x, pt.y, star.size || 2, 0, Math.PI * 2);
      ctx.fill();

      if (star.name) {
        ctx.fillStyle = "#48dbfb";
        ctx.font = "11px sans-serif";
        ctx.fillText(star.name, pt.x + 6, pt.y + 4);
      }
    });
  }, [stars, width, height, lstHours, projectionType]);

  return (
    <div>
      <h3>東京 地方恒星時クロック</h3>
      <div style={{ marginBottom: "15px" }}>
        <label
          htmlFor="projection-select"
          style={{ marginRight: "10px", fontWeight: "bold" }}
        >
          表示図法:
        </label>
        <select
          id="projection-select"
          value={projectionType}
          onChange={(e) => setProjectionType(e.target.value)}
          style={{
            padding: "4px 8px",
            borderRadius: "4px",
            background: "#2c3a47",
            color: "#fff",
          }}
        >
          {Object.entries(PROJECTIONS).map(([key, proj]) => (
            <option key={key} value={key}>
              {proj.name}
            </option>
          ))}
        </select>
      </div>
      <strong>現在時刻 (JST):</strong> {now.toLocaleString("ja-JP")}
      <br />
      <strong>地方恒星時 (LST hours):</strong> {lstHours.toFixed(4)}
      <br />
      <canvas ref={canvasRef} width={width} height={height} />
    </div>
  );
};
