"use client";

import { useEffect, useMemo, useState } from "react";
import { IoIosCode, IoIosStarOutline, IoMdSearch, IoMdStar } from "react-icons/io";
import AddIndicatorButton from "./add_indicator_button";
import useIndicatorStore from "@/store/indicator/indicatorStore";
import CodeModal from "./CodeModal";
import axios from "axios";
import i18n from "@/i18n";
import { useTranslation } from "react-i18next";

axios.defaults.withCredentials = true;

/* Basit pill */
const Pill = ({ children, tone = "neutral" }) => {
  const toneClasses =
    tone === "success"
      ? "bg-emerald-900/40 text-emerald-300 border-emerald-700/60"
      : tone === "warning"
      ? "bg-amber-900/40 text-amber-300 border-amber-700/60"
      : tone === "danger"
      ? "bg-rose-900/40 text-rose-300 border-rose-700/60"
      : "bg-gray-800 text-gray-300 border-gray-700";
  return (
    <span className={`px-2 py-[2px] text-[11px] rounded-full border ${toneClasses}`}>
      {children}
    </span>
  );
};

const CommunityIndicators = ({ locale }) => {
  const { t } = useTranslation("indicator");
  const { favorites, toggleFavorite, community } = useIndicatorStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndicator, setSelectedIndicator] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Dil senk
  useEffect(() => {
    if (locale && i18n.language !== locale) i18n.changeLanguage(locale);
  }, [locale]);

  // Arama filtresi
  const filtered = useMemo(() => {
    const q = (searchTerm || "").toLowerCase();
    return (community || []).filter((it) => (it?.name || "").toLowerCase().includes(q));
  }, [community, searchTerm]);

  const isFav = (id) => favorites.some((f) => f.id === id);

  // Favori ekle/çıkar
  const handleToggleFavorite = async (indicator) => {
    const isAlreadyFavorite = isFav(indicator.id);
    toggleFavorite(indicator); // optimistic
    try {
      if (isAlreadyFavorite) {
        await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/indicator-remove-favourite/`, {
          data: { indicator_id: indicator.id },
        });
      } else {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/indicator-add-favorite/`, {
          indicator_id: indicator.id,
        });
      }
    } catch (err) {
      console.error("Favori işlemi hatası:", err);
    }
  };

  // release meta + id
  const computeCommunityMeta = (indicator) => {
    const release = indicator?.release || null; // community = approved
    const approved = indicator?.approved_release || null;
    const pending = indicator?.pending_release || null;

    const perms = release?.permissions || approved?.permissions || {};
    const viewsCount =
      (release && release.views_count) ?? (approved && approved.views_count) ?? null;

    const allowCodeView = !!perms?.allow_code_view;
    const allowChartView = !!perms?.allow_chart_view;

    const releaseId =
      (release && release.id) || (approved && approved.id) || (pending && pending.id) || null;

    return { viewsCount, allowCodeView, allowChartView, releaseId };
  };

  // view ping (indicator)
  const notifyIndicatorView = async (releaseId) => {
    if (!releaseId) return;
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/indicator-releases/${releaseId}/view`
      );
    } catch (e) {
      console.debug("indicator view ping error:", e?.message || e);
    }
  };

  // Kod Modalı
  const openCodeModal = async (indicator) => {
    const { allowCodeView, releaseId } = computeCommunityMeta(indicator);
    if (!allowCodeView) return;
    await notifyIndicatorView(releaseId); // önce ping
    setSelectedIndicator(indicator);
    setIsModalOpen(true);
  };

  return (
    <div className="text-white">
      {/* Arama */}
      <div className="bg-gray-800 flex items-center border-b border-gray-800 mb-2">
        <input
          type="text"
          placeholder={t("search")}
          className="w-full px-3 py-2 bg-gray-800 text-white focus:outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <IoMdSearch className="text-gray-400 text-[20px] mr-2" />
      </div>

      {/* Liste */}
      <div className="flex flex-col gap-2 w-full mt-2 max-h-[440px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        {filtered.map((indicator) => {
          const { viewsCount, allowCodeView, allowChartView, releaseId } =
            computeCommunityMeta(indicator);

          return (
            <div
              key={indicator.id}
              className="bg-gray-900 hover:bg-gray-800 pl-1 pr-2 flex items-center justify-between w-full h-[56px]"
            >
              {/* Sol */}
              <div className="flex items-center gap-2 min-w-0">
                <button
                  className="bg-transparent p-2 rounded-md hover:bg-gray-800 shrink-0"
                  onClick={() => handleToggleFavorite(indicator)}
                  title={isFav(indicator.id) ? "Favorilerden çıkar" : "Favorilere ekle"}
                >
                  {isFav(indicator.id) ? (
                    <IoMdStar className="text-lg text-yellow-500" />
                  ) : (
                    <IoIosStarOutline className="text-lg text-gray-600" />
                  )}
                </button>

                <div className="flex flex-col min-w-0">
                  <span className="text-[14px] truncate">{indicator.name}</span>
                  <div className="flex items-center gap-2 mt-[2px]">
                    {typeof indicator.version !== "undefined" && (
                      <Pill>Version {indicator.version}</Pill>
                    )}
                    {typeof viewsCount === "number" && (
                      <Pill tone="neutral">{viewsCount} views</Pill>
                    )}
                  </div>
                </div>
              </div>

              {/* Sağ */}
              <div className="flex items-center gap-1">
                {/* Ekle: önce view ping, sonra child click (capture fazı) */}
                <div
                  className={`relative ${allowChartView ? "" : "opacity-50 cursor-not-allowed"}`}
                  title={
                    allowChartView
                      ? "İndikatörü ekle"
                      : "Grafiğe ekleme izni yok (allow_chart_view=false)"
                  }
                  onClickCapture={async () => {
                    if (allowChartView) await notifyIndicatorView(releaseId);
                  }}
                >
                  <AddIndicatorButton indicatorId={indicator.id} disabled={!allowChartView} />
                  {!allowChartView && (
                    <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
                  )}
                </div>

                {/* Kod: önce view ping, sonra modal */}
                <button
                  className={`bg-transparent p-2 rounded-md ${
                    allowCodeView ? "hover:bg-gray-800" : "opacity-40 cursor-not-allowed"
                  }`}
                  onClick={() => openCodeModal(indicator)}
                  title={
                    allowCodeView
                      ? "Kodu görüntüle"
                      : "Kod görüntüleme izni yok (allow_code_view=false)"
                  }
                >
                  <IoIosCode
                    className={`text-2xl ${
                      allowCodeView
                        ? "text-[hsl(305,57%,44%)] hover:text-[#eb48dd]"
                        : "text-gray-500"
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Kod Modalı */}
      <CodeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        indicator={selectedIndicator}
      />
    </div>
  );
};

export default CommunityIndicators;
