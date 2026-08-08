export interface Star {
  name: string;
  ra: number; // 赤経 (時間単位)
  dec: number; // 赤緯 (度単位)
  mag: number; // 明るさ (等級)
}

export const STAR_CATALOG: Star[] = [
  { name: "ベガ (織姫)", ra: 18.62, dec: 38.78, mag: 0.0 },
  { name: "デネブ", ra: 20.69, dec: 45.28, mag: 1.25 },
  { name: "アルタイル(彦星)", ra: 19.85, dec: 8.87, mag: 0.75 },
  { name: "北極星", ra: 2.53, dec: 89.26, mag: 2.0 },
  { name: "アークトゥルス", ra: 14.26, dec: 19.18, mag: -0.05 },
  { name: "スピカ", ra: 13.42, dec: -11.16, mag: 0.98 },
  { name: "アンタレス", ra: 16.49, dec: -26.43, mag: 1.06 },
  { name: "カペラ", ra: 5.27, dec: 46.0, mag: 0.08 },
];
