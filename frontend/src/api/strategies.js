import axios from 'axios';

// Çerezleri otomatik olarak isteğe dahil et
axios.defaults.withCredentials = true;

export const getStrategies = async () => {
  try {
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/all-strategies/`);

    // Backend'den dönen veriyi kategorilere ayır
    const tecnic_strategies = response.data.tecnic_strategies || [];
    const personal_strategies = response.data.personal_strategies || [];
    const public_strategies = response.data.public_strategies || [];

    return {
      tecnic: tecnic_strategies,
      personal: personal_strategies,
      public: public_strategies,
    };
  } catch (error) {
    console.error("Stratejiler alınırken hata oluştu:", error);
    return {
      tecnic: [],
      personal: [],
      public: [],
    };
  }
};


export const publishStrategy = async ({ strategyId, permissions, description }) => {
  try {
    const payload = {
      strategy_id: strategyId,
      description: (description || "").slice(0, 500),

      // UI anahtarlarını backend alanlarına map’liyoruz
      allow_code_view: !!permissions?.codeView,
      allow_chart_view: !!permissions?.chartView,
      allow_scanning: !!permissions?.scan,
      allow_backtesting: !!permissions?.backtest,
      allow_bot_execution: !!permissions?.botRun,
    };
    const { data } = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/strategies/publish`,
      payload
    );

    return { ok: true, data };
  } catch (err) {
    console.error("publishStrategy error:", err);
    return {
      ok: false,
      error:
        err?.response?.data?.detail ||
        err?.message ||
        "Publish sırasında bir hata oluştu",
    };
  }
};



export const publishIndicator = async ({ indicatorId, permissions, description }) => {
  try {
    const payload = {
      indicator_id: indicatorId,
      description: (description || "").slice(0, 500),
      // yalnızca code & chart
      allow_code_view: !!permissions?.codeView,
      allow_chart_view: !!permissions?.chartView,
    };

    const { data } = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/indicators/publish`,
      payload
    );

    return { ok: true, data };
  } catch (err) {
    console.error("publishIndicator error:", err);
    return {
      ok: false,
      error:
        err?.response?.data?.detail ||
        err?.message ||
        "Indicator publish sırasında bir hata oluştu",
    };
  }
};