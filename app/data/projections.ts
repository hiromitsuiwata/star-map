// projections.ts

export interface ProjectionProfile {
  name: string;
  project: (
    az: number,
    alt: number,
    cx: number,
    cy: number,
    rMax: number,
    // 追加: 視点移動用のオプションパラメータ
    options?: { centerAz: number; centerAlt: number; zoom: number },
  ) => { x: number; y: number } | null;
  drawBackground: (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rMax: number,
    // 追加: 視点移動用のオプションパラメータ
    options?: { centerAz: number; centerAlt: number; zoom: number },
  ) => void;
}

const ALT_LINES = [15, 30, 45, 60, 75];

export const PROJECTIONS: Record<string, ProjectionProfile> = {
  // 1. 正距方位図法：中心からの距離が高度に「完全に比例」して等間隔になる
  azimuthal: {
    name: "正距方位図法 (等間隔)",
    project: (az, alt, cx, cy, rMax) => {
      // 天頂(π/2)でr=0、地平線(0)でr=rMax
      const r = rMax * (1 - alt / (Math.PI / 2));
      return {
        x: cx - r * Math.sin(az),
        y: cy - r * Math.cos(az),
      };
    },
    drawBackground: (ctx, cx, cy, rMax) => {
      // 共通の外枠と十字線
      drawCommonBase(ctx, cx, cy, rMax);

      ctx.strokeStyle = "#2c3a47";
      ctx.lineWidth = 0.5;
      ctx.font = "10px sans-serif";

      // 高度線（きれいに等間隔の同心円になります）
      ALT_LINES.forEach((altDeg) => {
        const altRad = (altDeg * Math.PI) / 180;
        const r = rMax * (1 - altRad / (Math.PI / 2));
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#1abc9c";
        ctx.fillText(`${altDeg}°`, cx + 4, cy - r - 4);
      });

      drawAzimuthLines(ctx, cx, cy, rMax);
    },
  },

  // 2. 平射図法：高度0°をrMaxに固定しつつ、中心付近が密になり、外側(地平線付近)が広がる
  stereographic: {
    name: "平射図法 (周辺が広がる)",
    project: (az, alt, cx, cy, rMax) => {
      const theta = Math.PI / 2 - alt; // 天頂からの角距離
      // 高度0°（theta = 90°）のときに tan(45°) = 1 となり、ちょうど rMax に収まるよう調整
      const r = rMax * Math.tan(theta / 2);
      return {
        x: cx - r * Math.sin(az),
        y: cy - r * Math.cos(az),
      };
    },
    drawBackground: (ctx, cx, cy, rMax) => {
      drawCommonBase(ctx, cx, cy, rMax);

      ctx.strokeStyle = "#2c3a47";
      ctx.lineWidth = 0.5;
      ctx.font = "10px sans-serif";

      // 高度線（中心の75°や60°の間隔が狭く、外側の15°の間隔が広く引き伸ばされます）
      ALT_LINES.forEach((altDeg) => {
        const altRad = (altDeg * Math.PI) / 180;
        const theta = Math.PI / 2 - altRad;
        const r = rMax * Math.tan(theta / 2); // はみ出さない魔法の式

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#1abc9c";
        ctx.fillText(`${altDeg}°`, cx + 4, cy - r - 4);
      });

      drawAzimuthLines(ctx, cx, cy, rMax);
    },
  },

  // 3. 心射図法：天頂付近のみ。地平線は無限遠になるため描画を途中でクリップする
  gnomonic: {
    name: "心射図法 (天頂付近を拡大)",
    project: (az, alt, cx, cy, rMax) => {
      const theta = Math.PI / 2 - alt;
      // 高度30°以下（天頂から60°以上）は画面外へはみ出すためカット
      if (alt < (30 * Math.PI) / 180) return null;
      // 高度45°（theta = 45°）のときに tan(45°) = 1 となり rMax になるようスケール
      const r = rMax * Math.tan(theta);
      return {
        x: cx - r * Math.sin(az),
        y: cy - r * Math.cos(az),
      };
    },
    drawBackground: (ctx, cx, cy, rMax) => {
      // 心射図法は無限に広がるため外枠の丸は描かない
      ctx.strokeStyle = "#2c3a47";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy - rMax);
      ctx.lineTo(cx, cy + rMax);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - rMax, cy);
      ctx.lineTo(cx + rMax, cy);
      ctx.stroke();

      drawLabels(ctx, cx, cy, rMax);

      ctx.strokeStyle = "#2c3a47";
      ctx.lineWidth = 0.5;
      ctx.font = "10px sans-serif";

      // 描画可能な高高度の線だけを描く
      [45, 60, 75].forEach((altDeg) => {
        const altRad = (altDeg * Math.PI) / 180;
        const theta = Math.PI / 2 - altRad;
        const r = rMax * Math.tan(theta);

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#1abc9c";
        ctx.fillText(`${altDeg}°`, cx + 4, cy - r - 4);
      });

      drawAzimuthLines(ctx, cx, cy, rMax);
    },
  },
  // projections.ts の PROJECTIONS オブジェクト内に追加

  // projections.ts の mercator 部分を以下に差し替え

  // 4. メルカトル図法 (長方形パノラマ星図 - 画面幅ぴったり版)
  mercator: {
    name: "メルカトル図法 (パノラマ)",
    project: (az, alt, cx, cy, rMax) => {
      // 天頂(alt=90°)は無限遠に発散するため、85°以上は描画しない
      if (alt >= (85 * Math.PI) / 180) return null;

      // 【修正】キャンバスの横幅全体（cx * 2 ＝ width）に360度（2π）が収まるようにスケールRを逆算
      // width = 2 * Math.PI * R  =>  R = width / (2 * Math.PI)
      const width = cx * 2;
      const R = width / (2 * Math.PI);

      // 左端(x=0)を「北(0度)」、右端(x=width)を「北(360度)」とし、中央(cx)を「南(180度)」にする配置
      const x = az * R;

      // 縦軸：メルカトル公式 y = R * ln(tan(π/4 + alt/2))
      // 地平線(alt=0)のとき、キャンバスの下部（cy + rMax の位置など）をベースラインにする
      const bottom = cy + rMax;
      const yValue = R * Math.log(Math.tan(Math.PI / 4 + alt / 2));
      const y = bottom - yValue;

      return { x, y };
    },
    drawBackground: (ctx, cx, cy, rMax) => {
      const width = cx * 2;
      const R = width / (2 * Math.PI);
      const left = 0;
      const right = width;
      const bottom = cy + rMax; // 地平線の高さ

      // 背景の長方形枠（地平線から高度85°の高さまで）
      const maxAltRad = (85 * Math.PI) / 180;
      const maxHeight = R * Math.log(Math.tan(Math.PI / 4 + maxAltRad / 2));

      ctx.strokeStyle = "#2c3a47";
      ctx.lineWidth = 1;
      ctx.strokeRect(left, bottom - maxHeight, width, maxHeight + 25);

      // --- 座標グリッドの描画 ---
      ctx.strokeStyle = "#2c3a47";
      ctx.lineWidth = 0.5;
      ctx.fillStyle = "#1abc9c";
      ctx.font = "10px sans-serif";

      // 1. 高度線（水平な直線。高高度ほど間隔が広がる）
      const altLines = [15, 30, 45, 60, 75];
      altLines.forEach((altDeg) => {
        const altRad = (altDeg * Math.PI) / 180;
        const yValue = R * Math.log(Math.tan(Math.PI / 4 + altRad / 2));
        const y = bottom - yValue;

        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();
        ctx.fillText(`${altDeg}°`, left + 5, y - 4);
      });

      // 2. 地平線（ベースライン）
      ctx.strokeStyle = "#2c3a47";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(left, bottom);
      ctx.lineTo(right, bottom);
      ctx.stroke();

      // 3. 方位線（垂直な直線。画面横幅に等間隔に並ぶ）
      ctx.font = "12px sans-serif";
      for (let azDeg = 0; azDeg <= 360; azDeg += 30) {
        const azRad = (azDeg * Math.PI) / 180;
        const x = azRad * R;

        // グリッド縦線
        ctx.strokeStyle = "#2c3a47";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, bottom);
        ctx.lineTo(x, bottom - maxHeight);
        ctx.stroke();

        // 地平線の下に方位ラベルを配置
        let label = `${azDeg}°`;
        if (azDeg === 0 || azDeg === 360) label = "北";
        if (azDeg === 90) label = "東";
        if (azDeg === 180) label = "南";
        if (azDeg === 270) label = "西";

        ctx.fillStyle = azDeg % 90 === 0 ? "#1abc9c" : "#576574";
        ctx.fillText(label, x - 6, bottom + 18);
      }
    },
  },

  // 5. planetarium 風モード（視点移動・ズーム対応の汎用平射図法）
  planetarium: {
    name: "プラネタリウム風 (視点移動モード)",
    project: (az, alt, cx, cy, rMax, options) => {
      // オプションがなければ天頂を中心にデフォルト動作
      const cAz = options?.centerAz ?? 0;
      const cAlt = options?.centerAlt ?? Math.PI / 2;
      const zoom = options?.zoom ?? 1.0; // 値が大きいほどズームアップ（視野が狭くなる）

      // 1. 共通の準備：中心点（cAz, cAlt）と対象の星（az, alt）の間の天球上の角距離 θ を計算
      // 地平座標系の球面三角法公式
      const cosTheta =
        Math.sin(cAlt) * Math.sin(alt) +
        Math.cos(cAlt) * Math.cos(alt) * Math.cos(az - cAz);

      // カメラの真後ろ（角距離が90度以上＝画面の裏側）にある星は描画しない
      if (cosTheta <= 0) return null;

      const theta = Math.acos(cosTheta);

      // 2. 中心から見た星の方向（方位角 φ）の成分を計算
      const dX = Math.cos(alt) * Math.sin(az - cAz);
      const dY =
        Math.cos(cAlt) * Math.sin(alt) -
        Math.sin(cAlt) * Math.cos(alt) * Math.cos(az - cAz);

      const phi = Math.atan2(dX, dY);

      // 3. 平射図法（ステレオ投影）の距離計算
      // 基本半径 rMax にズーム倍率を掛け、tan(θ/2) に比例させる
      const r = rMax * zoom * Math.tan(theta / 2);

      // 4. 平面座標へマッピング（見上げ画面：右が西＝Xプラス、左が東＝Xマイナス）
      return {
        x: cx + r * Math.sin(phi),
        y: cy - r * Math.cos(phi),
      };
    },

    drawBackground: (ctx, cx, cy, rMax, options) => {
      const cAz = options?.centerAz ?? 0;
      const cAlt = options?.centerAlt ?? Math.PI / 2;
      const zoom = options?.zoom ?? 1.0;

      // 画面中央の照準（ターゲットクロス）
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy);
      ctx.lineTo(cx + 15, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - 15);
      ctx.lineTo(cx, cy + 15);
      ctx.stroke();

      // 現在のステータス表示
      ctx.fillStyle = "#1abc9c";
      ctx.font = "12px sans-serif";
      const azDeg = (cAz * 180) / Math.PI;
      const altDeg = (cAlt * 180) / Math.PI;
      ctx.fillText(
        `視点方向 - 方位: ${((azDeg + 360) % 360).toFixed(1)}° | 高度: ${altDeg.toFixed(1)}° (Zoom: ${zoom.toFixed(1)}x)`,
        20,
        30,
      );

      // グリッド線の基本スタイル（薄い青白色）
      ctx.strokeStyle = "#2c3a47";
      ctx.lineWidth = 0.5;
      ctx.fillStyle = "#1abc9c";
      ctx.font = "9px sans-serif";

      // --- 1. 高度線（横の同心円・緯度線）の描画 ---
      // -75度〜+75度まで15度刻みで天球上の円を描く
      for (let dg = -75; dg <= 75; dg += 15) {
        const altRad = (dg * Math.PI) / 180;
        ctx.beginPath();
        let first = true;

        // 360度全周を細かくつないで円にする
        for (let azDg = 0; azDg <= 360; azDg += 5) {
          const azRad = (azDg * Math.PI) / 180;
          const pt = PROJECTIONS.planetarium.project(
            azRad,
            altRad,
            cx,
            cy,
            rMax,
            options,
          );
          if (pt) {
            if (first) {
              ctx.moveTo(pt.x, pt.y);
              first = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          }
        }
        ctx.stroke();

        // 正面付近（中心方位）の高度線上に、度数ラベルを配置
        const labelPt = PROJECTIONS.planetarium.project(
          cAz,
          altRad,
          cx,
          cy,
          rMax,
          options,
        );
        if (
          labelPt &&
          labelPt.x >= 0 &&
          labelPt.x <= cx * 2 &&
          labelPt.y >= 0 &&
          labelPt.y <= cy * 2
        ) {
          ctx.fillText(`${dg}°`, labelPt.x + 4, labelPt.y - 2);
        }
      }

      // --- 2. 方位線（縦の放射線・経度線）の描画 ---
      // 0度〜345度まで15度刻みで、地平線から天頂へ向かう縦の線を描く
      for (let dg = 0; dg < 360; dg += 15) {
        const azRad = (dg * Math.PI) / 180;
        ctx.beginPath();
        let first = true;

        // 地平線下（-85度）から天頂付近（+85度）までを滑らかにつなぐ
        for (let altDg = -85; altDg <= 85; altDg += 5) {
          const altRad = (altDg * Math.PI) / 180;
          const pt = PROJECTIONS.planetarium.project(
            azRad,
            altRad,
            cx,
            cy,
            rMax,
            options,
          );
          if (pt) {
            if (first) {
              ctx.moveTo(pt.x, pt.y);
              first = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          }
        }
        ctx.stroke();
      }

      // --- 3. 地平線（ベースライン）と主要方位ラベルを強調描画 ---
      ctx.strokeStyle = "#e74c3c";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let firstH = true;
      for (let i = 0; i <= 360; i += 4) {
        const azRad = (i * Math.PI) / 180;
        const pt = PROJECTIONS.planetarium.project(
          azRad,
          0,
          cx,
          cy,
          rMax,
          options,
        );
        if (pt) {
          if (firstH) {
            ctx.moveTo(pt.x, pt.y);
            firstH = false;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }
      }
      ctx.stroke();

      // 方位ラベル（東西南北）
      const directionLabels = [
        { name: "北", az: 0 },
        { name: "東", az: 90 },
        { name: "南", az: 180 },
        { name: "西", az: 270 },
      ];
      ctx.fillStyle = "#1abc9c";
      ctx.font = "bold 13px sans-serif";
      directionLabels.forEach((dir) => {
        const pt = PROJECTIONS.planetarium.project(
          (dir.az * Math.PI) / 180,
          0,
          cx,
          cy,
          rMax,
          options,
        );
        if (pt) {
          ctx.fillText(dir.name, pt.x - 7, pt.y - 7);
        }
      });
    },
  },
};

// --- 重複コードをまとめるヘルパー関数群 ---

function drawCommonBase(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rMax: number,
) {
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
  drawLabels(ctx, cx, cy, rMax);
}

function drawLabels(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rMax: number,
) {
  ctx.fillStyle = "#1abc9c";
  ctx.font = "14px sans-serif";
  ctx.fillText("北", cx - 7, cy - rMax - 8);
  ctx.fillText("南", cx - 7, cy + rMax + 20);
  ctx.fillText("東", cx - rMax - 22, cy + 5);
  ctx.fillText("西", cx + rMax + 10, cy + 5);
}

function drawAzimuthLines(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rMax: number,
) {
  ctx.strokeStyle = "#2c3a47";
  ctx.lineWidth = 0.5;
  for (let azDeg = 15; azDeg < 360; azDeg += 15) {
    if (azDeg % 90 === 0) continue;
    const azRad = (azDeg * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - rMax * Math.sin(azRad), cy - rMax * Math.cos(azRad));
    ctx.stroke();
  }
}
