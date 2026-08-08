import Papa from "papaparse";
import { convertBvToRgb } from "./bvToRgb";

// 1. 星データの型定義（必要な列をピックアップ）
export interface RawStarCSV {
  hip: string;
  ra: string;
  dec: string;
  proper: string;
  mag: string;
  ci: string;
}

export interface ParsedStar {
  hip: number;
  ra: number;
  dec: number;
  name: string | null;
  mag: number;
  ci: number | null;
  colorHex: string;
  size: number;
}

/**
 * HYG DatabaseのCSV文字列、またはURLからデータをパースして整形する関数
 */
export function parseHygCsv(csvInput: string | File): Promise<ParsedStar[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawStarCSV>(csvInput, {
      header: true, // 1行目をヘッダー（キー名）として扱う
      skipEmptyLines: true, // 空行は無視する
      complete: (results) => {
        // パース成功時、データをアプリケーション用に成形
        const formattedStars: ParsedStar[] = results.data
          .map((row) => {
            const hip = parseInt(row.hip, 10);
            if (isNaN(hip)) return null; // 不正データはスキップ

            const mag = parseFloat(row.mag);
            // ciが空文字、または数値でない場合はnull
            const ci =
              row.ci === "" || isNaN(parseFloat(row.ci))
                ? null
                : parseFloat(row.ci);

            // RGB色の計算
            const { hex } = convertBvToRgb(ci);

            // 明るさに基づく星の描画サイズ計算（例：明るい星ほど大きく）
            const size = Math.max(0.5, 6 - mag);

            return {
              hip,
              name: row.proper === "" ? null : row.proper,
              mag,
              ci,
              ra: parseFloat(row.ra),
              dec: parseFloat(row.dec),
              colorHex: hex,
              size,
            };
          })
          .filter((star): star is ParsedStar => star !== null); // nullを除去

        resolve(formattedStars);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}
