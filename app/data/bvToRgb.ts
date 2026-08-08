/**
 * 星のRGB変換結果を保持するインターフェース
 */
export interface StarColor {
  r: number;
  g: number;
  b: number;
  hex: string;
}

/**
 * HYG Databaseの `ci` (B-V色指数) からsRGBおよびカラーコードを計算します。
 * @param bv B-V色指数 (ci列の値)
 * @returns StarColorオブジェクト
 */
export function convertBvToRgb(bv: number | null | undefined): StarColor {
  // 1. 欠損値(null, undefined, NaN)の場合は白色（#ffffff）を返す
  if (bv === null || bv === undefined || Number.isNaN(bv)) {
    return { r: 255, g: 255, b: 255, hex: "#ffffff" };
  }

  // 2. Ballesterosの式で有効温度(K)を算出
  // 式の安定性と有効範囲の為、B-Vを-0.4～2.0の範囲に制限
  const clampedBv = Math.max(-0.4, Math.min(2.0, bv));
  const pow1 = 0.92 * clampedBv + 1.7;
  const pow2 = 0.92 * clampedBv + 0.62;
  const temperature = 4600 * (1 / pow1 + 1 / pow2);

  // 3. Tanner Hellandのアルゴリズムで温度からRGB値を算出
  // アルゴリズムの適用範囲(1000K～40000K)に制限
  const clampedTemp = Math.max(1000, Math.min(40000, temperature));
  const t = clampedTemp / 100;

  let r = 0;
  let g = 0;
  let b = 0;

  // Redの計算
  if (t <= 66) {
    r = 255;
  } else {
    r = t - 60;
    r = 329.698727446 * Math.pow(r, -0.1332047592);
    r = Math.max(0, Math.min(255, r));
  }

  // Greenの計算
  if (t <= 66) {
    g = t;
    g = 99.4708025861 * Math.log(g) - 161.1195636658;
  } else {
    g = t - 60;
    g = 288.1221695283 * Math.pow(g, -0.0755148492);
  }
  g = Math.max(0, Math.min(255, g));

  // Blueの計算
  if (t >= 66) {
    b = 255;
  } else {
    if (t <= 19) {
      b = 0;
    } else {
      b = t - 10;
      b = 138.5177312231 * Math.log(b) - 305.0447927307;
    }
  }
  b = Math.max(0, Math.min(255, b));

  // 整数(0-255)に丸める
  const finalR = Math.round(r);
  const finalG = Math.round(g);
  const finalB = Math.round(b);

  // 16進数カラーコードの生成
  const toHex = (c: number) => c.toString(16).padStart(2, "0");
  const hex = `#${toHex(finalR)}${toHex(finalG)}${toHex(finalB)}`;

  return { r: finalR, g: finalG, b: finalB, hex };
}
