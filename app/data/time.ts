/**
 * ミリ秒（UTC）からユリウス日（JD）を計算
 */
function getJulianDate(ms: number): number {
  return ms / 86400000 + 2440587.5;
}

/**
 * 地方恒星時 (LST) を計算する（戻り値：時間単位の数値）
 */
export function calculateLST(ms: number, longitude: number): number {
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
