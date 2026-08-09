// projections.ts

export interface ProjectionProfile {
  name: string;
  project: (
    az: number,
    alt: number,
    cx: number,
    cy: number,
    rMax: number,
  ) => { x: number; y: number } | null;
  drawBackground: (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rMax: number,
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
        ctx.fillStyle = "#1abc9c"; // 図法の違いが分かりやすいように色分け
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
        ctx.fillStyle = "#3498db";
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
      ctx.strokeStyle = "#1e272c";
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
        ctx.fillStyle = "#e74c3c";
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

      ctx.strokeStyle = "#1e272c";
      ctx.lineWidth = 1;
      ctx.strokeRect(left, bottom - maxHeight, width, maxHeight + 25);

      // --- 座標グリッドの描画 ---
      ctx.strokeStyle = "#2c3a47";
      ctx.lineWidth = 0.5;
      ctx.fillStyle = "#576574";
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
      ctx.strokeStyle = "#1e272c";
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
  ctx.fillStyle = "#576574";
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
