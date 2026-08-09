export interface ProjectionProfile {
  name: string;
  /** 地平座標(az, alt)からキャンバス上の(x, y)を計算する（描画不可ならnull） */
  project: (
    az: number,
    alt: number,
    cx: number,
    cy: number,
    rMax: number,
  ) => { x: number; y: number } | null;
  /** 図法に応じた背景、十字線、方位ラベル、高度グリッドをすべて描画する */
  drawBackground: (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rMax: number,
  ) => void;
}

// 共通の高度線リスト
const ALT_LINES = [15, 30, 45, 60, 75];

export const PROJECTIONS: Record<string, ProjectionProfile> = {
  // 正距方位図法 (Azimuthal Equidistant)
  azimuthal: {
    name: "正距方位図法",
    project: (az, alt, cx, cy, rMax) => {
      const r = rMax * (1 - alt / (Math.PI / 2));
      return {
        x: cx - r * Math.sin(az),
        y: cy - r * Math.cos(az),
      };
    },
    drawBackground: (ctx, cx, cy, rMax) => {
      // 外枠の円と十字線
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

      // 方位ラベル
      ctx.fillStyle = "#576574";
      ctx.font = "14px sans-serif";
      ctx.fillText("北", cx - 7, cy - rMax - 8);
      ctx.fillText("南", cx - 7, cy + rMax + 20);
      ctx.fillText("東", cx - rMax - 22, cy + 5);
      ctx.fillText("西", cx + rMax + 10, cy + 5);

      // グリッド線のスタイル設定
      ctx.strokeStyle = "#2c3a47";
      ctx.lineWidth = 0.5;
      ctx.font = "10px sans-serif";

      // 高度同心円
      ALT_LINES.forEach((altDeg) => {
        const altRad = (altDeg * Math.PI) / 180;
        const r = rMax * (1 - altRad / (Math.PI / 2));
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillText(`${altDeg}°`, cx + 4, cy - r - 4);
      });

      // 放射状の方位線
      for (let azDeg = 15; azDeg < 360; azDeg += 15) {
        if (azDeg % 90 === 0) continue;
        const azRad = (azDeg * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - rMax * Math.sin(azRad), cy - rMax * Math.cos(azRad));
        ctx.stroke();
      }
    },
  },

  // 平射図法 (Stereographic)
  stereographic: {
    name: "平射図法（ステレオ）",
    project: (az, alt, cx, cy, rMax) => {
      const theta = Math.PI / 2 - alt;
      const r = rMax * Math.tan(theta / 2);
      return {
        x: cx - r * Math.sin(az),
        y: cy - r * Math.cos(az),
      };
    },
    drawBackground: (ctx, cx, cy, rMax) => {
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

      ctx.fillStyle = "#576574";
      ctx.font = "14px sans-serif";
      ctx.fillText("北", cx - 7, cy - rMax - 8);
      ctx.fillText("南", cx - 7, cy + rMax + 20);
      ctx.fillText("東", cx - rMax - 22, cy + 5);
      ctx.fillText("西", cx + rMax + 10, cy + 5);

      ctx.strokeStyle = "#2c3a47";
      ctx.lineWidth = 0.5;
      ctx.font = "10px sans-serif";

      // 高度同心円（平射図法のスケール）
      ALT_LINES.forEach((altDeg) => {
        const altRad = (altDeg * Math.PI) / 180;
        const r = rMax * Math.tan((Math.PI / 2 - altRad) / 2);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillText(`${altDeg}°`, cx + 4, cy - r - 4);
      });

      // 方位線
      for (let azDeg = 15; azDeg < 360; azDeg += 15) {
        if (azDeg % 90 === 0) continue;
        const azRad = (azDeg * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - rMax * Math.sin(azRad), cy - rMax * Math.cos(azRad));
        ctx.stroke();
      }
    },
  },

  // 心射図法 (Gnomonic)
  gnomonic: {
    name: "心射図法（流星観測用）",
    project: (az, alt, cx, cy, rMax) => {
      const theta = Math.PI / 2 - alt;
      if (theta >= Math.PI / 2 - 0.01) return null;
      const r = rMax * Math.tan(theta);
      return {
        x: cx - r * Math.sin(az),
        y: cy - r * Math.cos(az),
      };
    },
    drawBackground: (ctx, cx, cy, rMax) => {
      // 心射図法は無限に広がるため外枠の円は描かず、基準十字線のみ
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

      ctx.fillStyle = "#576574";
      ctx.font = "14px sans-serif";
      ctx.fillText("北", cx - 7, cy - rMax - 8);
      ctx.fillText("南", cx - 7, cy + rMax + 20);
      ctx.fillText("東", cx - rMax - 22, cy + 5);
      ctx.fillText("西", cx + rMax + 10, cy + 5);

      ctx.strokeStyle = "#2c3a47";
      ctx.lineWidth = 0.5;
      ctx.font = "10px sans-serif";

      // 高度円（心射図法のスケール、地平線近くは描画不能なのでフィルター）
      ALT_LINES.forEach((altDeg) => {
        const altRad = (altDeg * Math.PI) / 180;
        const theta = Math.PI / 2 - altRad;
        if (theta >= Math.PI / 2 - 0.01) return;
        const r = rMax * Math.tan(theta);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillText(`${altDeg}°`, cx + 4, cy - r - 4);
      });

      // 方位線
      for (let azDeg = 15; azDeg < 360; azDeg += 15) {
        if (azDeg % 90 === 0) continue;
        const azRad = (azDeg * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - rMax * Math.sin(azRad), cy - rMax * Math.cos(azRad));
        ctx.stroke();
      }
    },
  },
};
