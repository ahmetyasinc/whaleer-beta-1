// src/components/profile_component/(api)/addApiModal.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaKey } from "react-icons/fa6";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <motion.div
            key="modal-content"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="bg-[rgb(0,3,15)] rounded p-6 w-full max-w-lg shadow-lg text-white relative"
          >
            <h2 className="text-lg font-bold mb-1">
              {editMode ? t("titles.rename") : t("titles.addNew")}
            </h2>

            {!editMode && (
              <p className="text-xs text-gray-400 mb-4">{t("steps.step2")}</p> // i18n: "Binance API (HMAC) ekle"
            )}

            <div className="space-y-4">
              {/* API Name */}
              <div>
                <label className="block font-medium">
                  {t("fields.apiName")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ""}
                  onChange={handleChange}
                  placeholder={t("placeholders.apiName")}
                  className={`w-full mt-1 rounded-sm px-3 py-2 bg-gray-900 text-white ${
                    errors.name ? "border border-red-500" : ""
                  }`}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              {/* HMAC */}
              {!editMode && (
                <>
                  <div>
                    <label className="block font-medium">
                      {t("fields.apiKey")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative w-full">
                      <input
                        type="text"
                        name="key"
                        ref={keyInputRef}
                        value={formData.key}
                        onChange={handleChange}
                        onKeyDown={handleKeyInput}
                        onPaste={(e) => handlePaste(e, "key")}
                        className={`w-full mt-1 rounded-sm px-3 py-2 bg-gray-900 text-white ${
                          errors.key ? "border border-red-500" : ""
                        }`}
                        placeholder={t("placeholders.apiKey")}
                      />
                      <span className="absolute inset-y-0 right-2 flex items-center text-gray-600 pointer-events-none text-base">
                        <FaKey />
                      </span>
                    </div>
                    {errors.key && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.key}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-medium">
                      {t("fields.secret")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative w-full">
                      <input
                        type="text"
                        name="secretkey"
                        ref={secretKeyInputRef}
                        value={formData.secretkey}
                        onChange={handleChange}
                        onKeyDown={handleKeyInput}
                        onPaste={(e) => handlePaste(e, "secretkey")}
                        className={`w-full mt-1 rounded-sm px-3 py-2 bg-gray-900 text-white ${
                          errors.secretkey ? "border border-red-500" : ""
                        }`}
                        placeholder={t("placeholders.secret")}
                      />
                      <span className="absolute inset-y-0 right-2 flex items-center text-gray-600 pointer-events-none text-base">
                        <FaKey />
                      </span>
                    </div>
                    {errors.secretkey && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.secretkey}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Buttons */}
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={closeAll}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                >
                  {t("buttons.cancel")}
                </button>

                {editMode ? (
                  <button
                    onClick={() => {
                      if (!formData.name?.trim()) {
                        setErrors({ name: t("errors.enterApiName") });
                        return;
                      }
                      onSave(
                        { id: initialData?.id, name: formData.name.trim() },
                        true
                      );
                    }}
                    className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {t("buttons.save")}
                  </button>
                ) : (
                  <button
                    onClick={onVerifyHmac}
                    disabled={verifying}
                    className={`px-4 py-2 rounded ${
                      verifying ? "bg-gray-700" : "bg-blue-600 hover:bg-blue-700"
                    } text-white`}
                  >
                    {verifying ? t("buttons.verifying") : t("buttons.verifyNext")}
                  </button>
                )}
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
                    className="absolute inset-0 bg-black/60 flex items-center justify-center rounded"
                  >
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-gray-900 rounded p-5 w-full max-w-sm text-sm"
                    >
                      <h3 className="text-white font-semibold mb-2">
                        {t("confirmHmac.title")}
                      </h3>

                      <div className="text-gray-300 mb-2">
                        <div>
                          {t("confirmHmac.total")}{" "}
                          <b className="text-white">{fmt(hmacBalance)}</b>
                        </div>
                        <div className="text-xs mt-1">
                          {t("confirmHmac.spot")}{" "}
                          <b className="text-white">{fmt(spotUsd)}</b> •{" "}
                          {t("confirmHmac.futures")}{" "}
                          <b className="text-white">{fmt(futuresUsd)}</b>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setShowHmacConfirm(false)}
                          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white"
                        >
                          {t("buttons.back")}
                        </button>
                        <button
                          onClick={onConfirmHmac}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-white"
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
