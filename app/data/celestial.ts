import { ParsedStar } from "./csvParser";

export interface HorizontalCoordinates {
  az: number;
  alt: number;
}

export function convertEquatorialToHorizontal(
  star: ParsedStar,
  lstHours: number,
  lat: number,
): HorizontalCoordinates | null {
  // 時角 HA の計算
  const ha = ((lstHours - star.ra) * 15 * Math.PI) / 180;
  const decRad = (star.dec * Math.PI) / 180;

  // 天体座標から地平座標（高度 alt）への計算
  const sinAlt =
    Math.sin(decRad) * Math.sin(lat) +
    Math.cos(decRad) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  // 地平線の下にある星（高度が0未満）は null を返して描画スキップ
  if (alt < 0) return null;

  // 方位角 az の計算
  // 方位角 az の計算（安全確実な atan2 を使用した北基準式）
  const Y = Math.sin(ha);
  const X = Math.cos(ha) * Math.sin(lat) - Math.tan(decRad) * Math.cos(lat);
  let az = Math.atan2(Y, X) + Math.PI; // 北基準にするため π を加算

  return { az: az, alt: alt };
}
