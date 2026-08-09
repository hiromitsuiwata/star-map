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

  // 初期図法を「planetarium（プラネタリウム風）」に指定
  const [projectionType, setProjectionType] = useState<string>("planetarium");

  // --- ドラッグ視点移動用のState ---
  const [centerAz, setCenterAz] = useState<number>(Math.PI); // 初期値：南(180度)向き
  const [centerAlt, setCenterAlt] = useState<number>(Math.PI / 6); // 初期値：高度30度
  const [zoom, setZoom] = useState<number>(2.5); // 初期ズーム
  const isDragging = useRef<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 60秒ごとに現在時刻を更新してCanvasをカチカチ再描画させる
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const lat = (TOKYO_LAT * Math.PI) / 180;
  const lstHours = calculateLST(now.getTime(), TOKYO_LON);

  // --- マウス・タッチイベントハンドラー ---
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;

    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;

    lastMousePos.current = { x: e.clientX, y: e.clientY };
    const sensitivity = 0.003 / zoom;

    setCenterAz((prev) => prev - deltaX * sensitivity);
    setCenterAlt((prev) => {
      const next = prev + deltaY * sensitivity;
      return Math.max(-Math.PI / 2, Math.min(Math.PI / 2, next));
    });
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => {
      const next = prev - e.deltaY * 0.002;
      return Math.max(0.5, Math.min(10.0, next));
    });
  };

  // Canvas描画処理
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = width / 2;
    const cy = height / 2;
    const rMax = Math.min(width, height) / 2 - 25;

    const currentProjection =
      PROJECTIONS[projectionType] || PROJECTIONS.planetarium;

    // キャンバスのクリア
    ctx.clearRect(0, 0, width, height);

    const projOptions = { centerAz, centerAlt, zoom };

    // 1. 背景・ガイド線の描画
    currentProjection.drawBackground(ctx, cx, cy, rMax, projOptions);

    // 2. 星のループ描画
    stars.forEach((star) => {
      const horizontalPosition = convertEquatorialToHorizontal(
        star,
        lstHours,
        lat,
      );
      if (!horizontalPosition) return;

      const pt = currentProjection.project(
        horizontalPosition.az,
        horizontalPosition.alt,
        cx,
        cy,
        rMax,
        projOptions,
      );
      if (!pt) return;

      if (pt.x >= 0 && pt.x <= width && pt.y >= 0 && pt.y <= height) {
        ctx.beginPath();
        ctx.fillStyle = star.colorHex || "#ffffff";
        ctx.arc(pt.x, pt.y, star.size || 2, 0, Math.PI * 2);
        ctx.fill();

        if (star.name) {
          ctx.fillStyle = "#48dbfb";
          ctx.font = "11px sans-serif";
          ctx.fillText(star.name, pt.x + 6, pt.y + 4);
        }
      }
    });

    // --- 3. 【修正】Canvas内へのデジタルクロックHUD描画（確実動作版） ---
    // 時計の背景パネル（左上の空きスペース（x:20, y:60）に配置して絶対に見えるように調整）
    const panelW = 200;
    const panelH = 70;
    const panelX = 20;
    const panelY = 60;

    // 半透明の紺色の座布団を敷く
    ctx.fillStyle = "rgba(12, 16, 19, 0.85)";
    ctx.fillRect(panelX, panelY, panelW, panelH);

    // パネルの細い枠線
    ctx.strokeStyle = "rgba(72, 219, 251, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    // 時刻テキスト（白）
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px monospace";
    const timeStr = now.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    ctx.fillText(timeStr, panelX + 15, panelY + 28);

    // 日付テキスト（薄い白）
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "11px sans-serif";
    const dateStr = now.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    ctx.fillText(dateStr, panelX + 15, panelY + 46);

    // 地方恒星時 LST（エメラルドグリーン）
    ctx.fillStyle = "#1abc9c";
    ctx.fillText(`LST: ${lstHours.toFixed(4)} h`, panelX + 15, panelY + 60);
  }, [
    stars,
    width,
    height,
    lstHours,
    projectionType,
    centerAz,
    centerAlt,
    zoom,
    now,
  ]); // 依存配列にnowを追加して1秒ごとに強制再描画

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
        <span style={{ marginLeft: "15px", fontSize: "12px", color: "#ccc" }}>
          ※「プラネタリウム風」では画面をドラッグ・ホイールスクロールできます。
        </span>
      </div>

      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onWheel={handleWheel}
        style={{
          cursor: isDragging.current ? "grabbing" : "grab",
          display: "inline-block",
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ background: "#0c1013", borderRadius: "8px" }}
        />
      </div>
    </div>
  );
};
