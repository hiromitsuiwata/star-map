"use client";

import { useEffect, useState } from "react";
import { parseHygCsv, ParsedStar } from "./data/csvParser";
import { StarCanvas } from "./starCanvas";

export default function StarMapPage() {
  const [stars, setStars] = useState<ParsedStar[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 例：public/hyg_named.csv から自動ロードする場合
  useEffect(() => {
    fetch("/hyg_named.csv") // publicフォルダにCSVを配置
      .then((res) => res.text())
      .then((csvText) => {
        return parseHygCsv(csvText);
      })
      .then((parsedData) => {
        setStars(parsedData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("星データのロードに失敗:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>星のデータを読み込み中...</div>;

  return (
    <div>
      <p>読み込み完了: {stars.length} 個の星</p>
      <StarCanvas stars={stars} width={1000} height={1000} />
    </div>
  );
}
