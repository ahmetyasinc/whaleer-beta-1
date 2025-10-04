// src/components/profile_component/(api)/addApiModal.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaKey } from "react-icons/fa6";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { FaTimes, FaCheckCircle } from "react-icons/fa";

const API = process.env.NEXT_PUBLIC_API_URL;

// Yalnızca HMAC doğrulama → spot/futures/total döner
const verifyHmacOnServer = async (apiKey, secretKey) => {
  const res = await fetch(`${API}/binance/hmac/account-usd`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, secretKey }),
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  const { spot_usd, futures_usd, total_usd } = await res.json();
  return {
    spot: Number(spot_usd || 0),
    futures: Number(futures_usd || 0),
    total: Number(total_usd || 0),
  };
};

export default function AddApiModal({
  isOpen,
  onClose,
  onSave,
  editMode = false,
  initialData = null,
}) {
  const { t, i18n } = useTranslation("addApi");
  const locale = i18n.language || "en";

  const [spotUsd, setSpotUsd] = useState(0);
  const [futuresUsd, setFuturesUsd] = useState(0);
  const [hmacBalance, setHmacBalance] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [showHmacConfirm, setShowHmacConfirm] = useState(false);

  const [formData, setFormData] = useState({
    exchange: "Binance",
    name: "",
    key: "",
    secretkey: "",
  });

  const [errors, setErrors] = useState({});

  const keyInputRef = useRef(null);
  const secretKeyInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setHmacBalance(null);
    setShowHmacConfirm(false);

    if (editMode && initialData) {
      // EDIT: sadece isim değiştiriyoruz
      setFormData({ name: initialData.name || "" });
    } else {
      // NEW: boş form
      setFormData({
        exchange: "Binance",
        name: "",
        key: "",
        secretkey: "",
      });

      // modala açılışta ilk inputa odak
      setTimeout(() => keyInputRef.current?.focus(), 100);
    }
  }, [isOpen, editMode, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
    }
  };

  // Klavyeden yazmayı kapatıp sadece yapıştırmayı bırakmak istersen:
  const handleKeyInput = (e) => {
    if (!(e.ctrlKey && e.key === "v") && !(e.metaKey && e.key === "v"))
      e.preventDefault();
  };
  const handlePaste = (e, fieldName) => {
    const pastedText = e.clipboardData.getData("text");
    setFormData((prev) => ({ ...prev, [fieldName]: pastedText }));
    e.preventDefault();
    if (errors[fieldName]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[fieldName];
        return n;
      });
    }
  };

  /** ===== HMAC → Verify & Confirm ===== */
  const onVerifyHmac = async () => {
    const newErrors = {};
    if (!formData.name?.trim()) newErrors.name = t("errors.enterApiName");
    if (!formData.key?.trim()) newErrors.key = t("errors.apiKeyEmpty");
    if (!formData.secretkey?.trim())
      newErrors.secretkey = t("errors.secretEmpty");
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    try {
      setVerifying(true);
      const { spot, futures, total } = await verifyHmacOnServer(
        formData.key,
        formData.secretkey
      );
      setSpotUsd(spot);
      setFuturesUsd(futures);
      setHmacBalance(total);
      setShowHmacConfirm(true);
    } catch (e) {
      console.error(e);
      toast.error(t("toasts.hmacFetchFailed"), {
        position: "top-center",
      });
      setShowHmacConfirm(false);
    } finally {
      setVerifying(false);
    }
  };

  const onConfirmHmac = () => {
    setShowHmacConfirm(false);
    onSave(
      {
        exchange: formData.exchange,
        name: formData.name?.trim(),
        key: formData.key,
        secretkey: formData.secretkey,
        spot_balance: spotUsd,
        futures_balance: futuresUsd,
      },
      editMode
    );
  };

  const closeAll = () => {
    setShowHmacConfirm(false);
    onClose();
  };

  const fmt = (n) =>
    Number(n ?? 0).toLocaleString(locale, { maximumFractionDigits: 2 });

return (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        key="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <motion.div
          key="modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[rgb(10,10,15)] border border-slate-700/50 rounded-2xl w-full max-w-xl shadow-2xl shadow-blue-900/20 relative overflow-hidden"
        >
          {/* Decorative gradient overlay */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-700 via-purple-500 to-pink-500"></div>
          
          {/* Close button */}
          <button
            onClick={closeAll}
            className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors duration-200 z-10"
          >
            <FaTimes className="w-5 h-5" />
          </button>

          <div className="p-8">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {editMode ? t("titles.rename") : t("titles.addNew")}
              </h2>
              {!editMode && (
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl font-semibold">•</span>
                  {t("steps.step2")}
                </p>
              )}
            </div>

            <div className="space-y-5">
              {/* API Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t("fields.apiName")} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ""}
                  onChange={handleChange}
                  placeholder={t("placeholders.apiName")}
                  className={`w-1/2 rounded-lg px-4 py-[6px] bg-[rgb(20,20,30)] border ${
                    errors.name ? "border-red-500" : "border-slate-700/50"
                  } text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-100`}
                  autoComplete="off"
                />
                {errors.name && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-400 text-xs mt-2 flex items-center gap-1"
                  >
                    <span>⚠</span> {errors.name}
                  </motion.p>
                )}
              </div>

              {/* HMAC */}
              {!editMode && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t("fields.apiKey")} <span className="text-red-400">*</span>
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        name="key"
                        ref={keyInputRef}
                        value={formData.key}
                        onChange={handleChange}
                        onKeyDown={handleKeyInput}
                        onPaste={(e) => handlePaste(e, "key")}
                        className={`w-full rounded-lg px-4 py-[10px] pr-12 bg-[rgb(20,20,30)] border ${
                          errors.key ? "border-red-500" : "border-slate-700/50"
                        } text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-100`}
                        placeholder={t("placeholders.apiKey")}
                        autoComplete="off"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <FaKey className="w-4 h-4 text-gray-600 group-focus-within:text-blue-400 transition-colors duration-100" />
                      </div>
                    </div>
                    {errors.key && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 text-xs mt-2 flex items-center gap-1"
                      >
                        <span>⚠</span> {errors.key}
                      </motion.p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t("fields.secret")} <span className="text-red-400">*</span>
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        name="secretkey"
                        ref={secretKeyInputRef}
                        value={formData.secretkey}
                        onChange={handleChange}
                        onKeyDown={handleKeyInput}
                        onPaste={(e) => handlePaste(e, "secretkey")}
                        className={`w-full rounded-lg px-4 py-[10px] pr-12 bg-[rgb(20,20,30)] border ${
                          errors.secretkey ? "border-red-500" : "border-slate-700/50"
                        } text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-100`}
                        placeholder={t("placeholders.secret")}
                        autoComplete="off"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <FaKey className="w-4 h-4 text-gray-600 group-focus-within:text-blue-400 transition-colors duration-100" />
                      </div>
                    </div>
                    {errors.secretkey && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 text-xs mt-2 flex items-center gap-1"
                      >
                        <span>⚠</span> {errors.secretkey}
                      </motion.p>
                    )}
                  </div>
                </>
              )}

              {/* Buttons */}
              <div className="flex justify-end items-center gap-3 pt-4">
                <button
                  onClick={closeAll}
                  className="px-6 py-2.5 rounded-lg border border-slate-700/50 bg-slate-800 text-gray-300 font-medium hover:scale-[1.005] hover:text-white hover:border-slate-600 transition-all duration-100"
                >
                  <span className="relative z-10">{t("buttons.cancel")}</span>
                </button>

                {editMode ? (
                  <button
                    onClick={() => {
                      if (!formData.name?.trim()) {
                        setErrors({ name: t("errors.enterApiName") });
                        return;
                      }
                      onSave({ id: initialData?.id, name: formData.name.trim() }, true);
                    }}
                    className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-700 to-blue-800 hover:bg-blue-800 text-white font-semibold shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 transition-all duration-100 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="relative z-10">{t("buttons.save")}</span>
                  </button>
                ) : (
                  <button
                    onClick={onVerifyHmac}
                    disabled={verifying}
                    className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-100 ${
                      verifying
                        ? "bg-slate-700 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-700 to-blue-800 hover:bg-blue-800 text-white shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 hover:scale-[1.01] active:scale-[0.98]"
                    }`}
                  >
                    {verifying ? t("buttons.verifying") : t("buttons.verifyNext")}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* HMAC Confirm */}
          {!editMode && (
            <AnimatePresence>
              {showHmacConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center rounded-2xl p-6"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ delay: 0.1 }}
                    className="bg-[rgb(15,15,20)] border border-slate-700/50 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                        <FaCheckCircle className="w-6 h-6 text-green-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        {t("confirmHmac.title")}
                      </h3>
                    </div>

                    <div className="bg-slate-900/30 rounded-xl p-4 mb-4 border border-slate-800/30">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-400 text-sm">{t("confirmHmac.total")}</span>
                        <span className="text-2xl font-bold text-white">{fmt(hmacBalance)}</span>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <div className="flex-1 bg-slate-800/50 rounded-lg p-2 border border-slate-700/30">
                          <div className="text-gray-400 mb-1">{t("confirmHmac.spot")}</div>
                          <div className="text-white font-semibold">{fmt(spotUsd)}</div>
                        </div>
                        <div className="flex-1 bg-slate-800/50 rounded-lg p-2 border border-slate-700/30">
                          <div className="text-gray-400 mb-1">{t("confirmHmac.futures")}</div>
                          <div className="text-white font-semibold">{fmt(futuresUsd)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setShowHmacConfirm(false)}
                        className="px-5 py-2.5 rounded-xl border border-slate-700/50 bg-slate-800/50 text-gray-300 font-medium hover:bg-slate-700/50 hover:text-white transition-all duration-100"
                      >
                        {t("buttons.back")}
                      </button>
                      <button
                        onClick={onConfirmHmac}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-semibold shadow-lg shadow-green-900/30 hover:shadow-green-900/50 transition-all duration-100 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {t("buttons.save")}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
}
