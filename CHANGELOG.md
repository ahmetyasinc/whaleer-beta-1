# Whaleer Changelog

## 2025-12-08 - Autocomplete & Syntax Highlighting

### Yeni Özellik
Monaco editörde gelişmiş autocomplete ve syntax highlighting

### Değiştirilen Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `frontend/src/components/profile_component/CodeEditor.js` | Komple yeniden yazıldı + beforeMount eklendi |
| `frontend/.../CodeModal.js` | Artık CodeEditor component'ını kullanıyor |
| `frontend/.../fullScreenCodeModal.js` | Artık CodeEditor component'ını kullanıyor |
| `frontend/.../fullScreenStrategyCodeModal.js` | Artık CodeEditor component'ını kullanıyor |

### Özellikler
- **Autocomplete:** `plot_indicator`, `input.*`, `df['...']`, `ta.*`, `np.*` için otomatik tamamlama
- **Syntax Highlighting:** Özel renk teması (Whaleer fonksiyonları turuncu, input mor, df mavi, ta yeşil)
- **Hover Docs:** Fare ile üzerine gelince dokümantasyon gösterme
- **Popup Fix:** Modal açılınca syntax highlighting kaybolmuyordu - beforeMount ile çözüldü
- **Şablonlar:** `template_bollinger`

### Renk Şeması
| Token | Renk | Örnek |
|-------|------|-------|
| Whaleer Functions | 🟠 Turuncu | `plot_indicator`, `mark` |
| Input Functions | 🟣 Mor | `input.int`, `input.color` |
| DataFrame | 🔵 Mavi | `df['close']` |
| TA Library | 🟢 Yeşil | `ta.trend.sma_indicator` |
| Numpy/Pandas | 🟡 Sarı | `np.where`, `pd.DataFrame` |

---

## 2025-12-08 - Band Plot Tipi

### Yeni Özellik
İki çizgi arasını doldurma (`"band"` tipi) - Bollinger Bands tarzı çizim

### Değiştirilen Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `backend/app/routes/profile/indicator/indicator_library/plot_indicator.py` | `band` plot tipi desteği eklendi |
| `frontend/src/components/profile_component/(indicator)/StockChart.js` | `band` case eklendi (4 series ile fill between) |
| `frontend/src/components/profile_component/(indicator)/panelChart.js` | `band` case eklendi |

### Kullanım
```python
# Data formatı: [(timestamp, (alt, üst)), ...]
band_data = list(zip(df['timestamp'], list(zip(lower, upper))))
plot_indicator("BB Band", "band", True, band_data, 
    color="#2196F3",      # Dolgu rengi
    opacity=0.2,          # Şeffaflık
    lineColor="#1976D2",  # Çizgi rengi
    lineWidth=1           # Çizgi kalınlığı
)
```

### Örnek: Bollinger Bands
```python
period = input.int(20, title="Period")
std_dev = input.float(2.0, title="Std Dev")
band_color = input.color("#2196F3", title="Band Rengi")

sma = df['close'].rolling(window=period).mean()
std = df['close'].rolling(window=period).std()
upper = sma + (std * std_dev)
lower = sma - (std * std_dev)

band_data = list(zip(df['timestamp'], list(zip(lower, upper))))
plot_indicator("BB Band", "band", True, band_data, color=band_color, opacity=0.2)
plot_indicator("BB SMA", "line", True, list(zip(df['timestamp'], sma)), color="#FFC107", width=1)
```
