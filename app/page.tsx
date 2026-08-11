"use client";

import { useEffect, useState } from "react";
import {
  parseHygCsv,
  ParsedStar,
  parseIauNamedStarsCsv,
} from "./data/csvParser";
import { StarCanvas } from "./starCanvas";

export default function StarMapPage() {
  const [stars, setStars] = useState<ParsedStar[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadStars = async () => {
      console.log("Fetching star data...");

      // それぞれのCSVをフェッチ
      const [hyg, wikipediaNames] = await Promise.all([
        fetch("/hyg_named.csv").then((res) => res.text()),
        fetch("/wikipedia_proper_names.csv").then((res) => res.text()),
      ]);

      // それぞれをパースして整形
      const [hygData, namesData] = await Promise.all([
        parseHygCsv(hyg),
        parseIauNamedStarsCsv(wikipediaNames),
      ]);

      // 名前データをMapに変換する。キーは固有名とする
      const namesMap = new Map(
        namesData.map((star) => [star.englishProperName, star]),
      );

      // ベースのデータに日本語データを横方向にマージする
      console.log("Merging star data with names...");

      const mergedStars = hygData.map((star) => {
        if (star.name) {
          const namedStar = namesMap.get(star.name);
          if (namedStar) {
            return {
              ...star,
              japaneseProperName: namedStar.japaneseProperName,
              japaneseConstellationName: namedStar.constellationName,
              bayerDesignation: namedStar.bayerDesignation,
            };
          }
        }
        return star;
      });

      setStars(mergedStars);
      setLoading(false);
    };

    loadStars();
  }, []);

  if (loading) return <div>星のデータを読み込み中...</div>;

  return (
    <div>
      <p>読み込み完了: {stars.length} 個の星</p>
      <StarCanvas stars={stars} width={1000} height={1000} />
    </div>
  );
}
