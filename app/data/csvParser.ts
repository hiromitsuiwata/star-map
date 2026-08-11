import Papa from "papaparse";
import { convertBvToRgb } from "./bvToRgb";

// 1. 星データの型定義（必要な列をピックアップ）
export interface RawStarCSV {
  hip: string; // HIP番号
  ra: string; // 赤経
  dec: string; // 赤経
  proper: string; // 固有名
  mag: string; // 視等級
  ci: string; // 色指数
  con: string; // 星座コード
}

interface RawNamedStar {
  固有名: string;
  カタカナ表記: string;
  名称: string;
  星座: string;
  バイエル符号等: string;
  V等級: string;
  承認年月日: string;
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
  con: string; // 星座コード
  japaneseProperName?: string; // 日本語の固有名（存在する場合のみ）
  japaneseConstellationName?: string; // 日本語の星座名（存在する場合のみ）
  bayerDesignation?: string; // バイエル符号等（存在する場合のみ）
}

export interface NamedStar {
  englishProperName: string;
  japaneseProperName: string;
  name: string;
  constellationName: string;
  bayerDesignation: string;
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
            // magが7より大きい星は除外（明るい星のみ表示したい）
            if (isNaN(mag) || mag > 7) return null;

            const con = row.con;
            // conが空文字の場合はnullにする
            if (con === "") return null;

            // ciが空文字、または数値でない場合はnull
            const ci =
              row.ci === "" || isNaN(parseFloat(row.ci))
                ? null
                : parseFloat(row.ci);

            // RGB色の計算
            const { hex } = convertBvToRgb(ci);

            // 明るさに基づく星の描画サイズ計算（例：明るい星ほど大きく）
            const size = Math.max(0.5, 6 - mag);

            // 固有名を表示するのは明るい星（例：mag <= 2）だけにする
            const name = row.proper === "" || mag > 2 ? null : row.proper;

            return {
              hip,
              name,
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

/**
 * Wikipediaから取得した「国際天文学連合が固有名を定めた恒星の一覧」のCSVをパースする関数
 * https://ja.wikipedia.org/wiki/%E5%9B%BD%E9%9A%9B%E5%A4%A9%E6%96%87%E5%AD%A6%E9%80%A3%E5%90%88%E3%81%8C%E5%9B%BA%E6%9C%89%E5%90%8D%E3%82%92%E5%AE%9A%E3%82%81%E3%81%9F%E6%81%92%E6%98%9F%E3%81%AE%E4%B8%80%E8%A6%A7
 */
export function parseIauNamedStarsCsv(
  csvInput: string | File,
): Promise<NamedStar[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawNamedStar>(csvInput, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const namedStars: NamedStar[] = results.data.map((row) => ({
          englishProperName: row.固有名 || "",
          japaneseProperName: row.カタカナ表記 || "",
          name: row.名称 || "",
          constellationName: row.星座 || "",
          bayerDesignation: row.バイエル符号等 || "",
        }));
        resolve(namedStars);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}
