let currentValue = 10000;

export const chartData = Array.from({ length: 300 }, (_, i) => {
  const date = new Date(2024, 0, 1); // 2024-01-01
  date.setDate(date.getDate() + i); // i gün ekle
  const iso = date.toISOString().split("T")[0]; // "YYYY-MM-DD"

  const change = Math.floor(Math.random() * 260) - 120; // -120 to +180
  currentValue = Math.max(currentValue + change, 8000);

  return {
    time: iso,       // sıralı garanti
    value: currentValue
  };
});
