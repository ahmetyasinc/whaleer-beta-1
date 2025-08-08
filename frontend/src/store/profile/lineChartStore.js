import { create } from "zustand";

function generateTrendData(length = 200, start = 100, trend = "up") {
  const data = [];
  let value = start;

  for (let i = 0; i < length; i++) {
    // küçük rastgele adım (±3 civarı)
    const step = Math.floor(Math.random() * 6) - 3;

    // trende göre yön ekle
    const trendBoost = trend === "up" ? 1 : -1;

    value += step + trendBoost;

    // değer çok aşırı gitmesin diye sınır koy
    if (value < 20) value = 20;
    if (value > 200) value = 200;

    data.push({ x: i, y: value });
  }

  // Eğer son değer ile ilk değer birbirine çok yakınsa, yapay fark ekle
  const diff = Math.abs(data[data.length - 1].y - data[0].y);
  if (diff < 20) {
    data[data.length - 1].y += trend === "up" ? 30 : -30;
  }

  return data;
}

const useLineChartStore = create(() => ({
  lineData: generateTrendData(200, 100, "up"), // trend: "up" veya "down"
}));

export default useLineChartStore;
