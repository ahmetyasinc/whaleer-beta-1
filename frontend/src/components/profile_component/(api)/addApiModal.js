// src/components/profile_component/(api)/addApiModal.jsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaKey } from "react-icons/fa6";
import axios from 'axios';
import { toast } from 'react-toastify';

const API = process.env.NEXT_PUBLIC_API_URL;

// HMAC doğrulama → spot/futures/total döner
const verifyHmacOnServer = async (apiKey, secretKey) => {
  const res = await fetch(`${API}/binance/hmac/account-usd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, secretKey }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await res.text());
  const { spot_usd, futures_usd, total_usd } = await res.json();
  return {
    spot: Number(spot_usd || 0),
    futures: Number(futures_usd || 0),
    total: Number(total_usd || 0),
  };
};

// ED doğrulama → spot tahmini döner
const verifyEdOnServer = async (edKey, edPrivatePem) => {
  const res = await fetch(`${API}/binance/ed/account-usd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ edKey, edPrivatePem }),
    credentials: 'include'
  });
  if (!res.ok) throw new Error(await res.text());
  const { usd_estimate } = await res.json();
  return usd_estimate;
};

export default function AddApiModal({ isOpen, onClose, onSave, editMode = false, initialData = null }) {
  const [spotUsd, setSpotUsd] = useState(0);
  const [futuresUsd, setFuturesUsd] = useState(0);

  const [step, setStep] = useState("ed"); // "ed" | "hmac"
  const [formData, setFormData] = useState({
    exchange: 'Binance',
    name: '',
    // ED
    edKey: '',
    edPublicPem: '',
    edPrivatePem: '', // UI'da göstermiyoruz ama state'te tutuyoruz
    // HMAC
    key: '',
    secretkey: ''
  });
  const [errors, setErrors] = useState({});
  const [loadingEDPair, setLoadingEDPair] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [edBalance, setEdBalance] = useState(null); // ED (Spot)
  const [hmacBalance, setHmacBalance] = useState(null); // HMAC (Spot+Futures)

  const [showEdConfirm, setShowEdConfirm] = useState(false);
  const [showHmacConfirm, setShowHmacConfirm] = useState(false);

  const edKeyRef = useRef(null);
  const keyInputRef = useRef(null);
  const secretKeyInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
   setErrors({});
   setEdBalance(null);
   setHmacBalance(null);
   setShowEdConfirm(false);
   setShowHmacConfirm(false);
   if (editMode && initialData) {
     // EDIT: sadece isim alanını doldur; diğer hiçbir veriyi UI/state’e alma
     setFormData({ name: initialData.name || '' });
   } else {
     setStep("ed");
     setFormData({
       exchange: 'Binance',
       name: '',
       edKey: '',
       edPublicPem: '',
       edPrivatePem: '',
       key: '',
       secretkey: ''
     });
     // sadece yeni eklemede ED çifti çek
     claimEdPair();
   }
  }, [isOpen, editMode, initialData]);

  // ED Stoğundan bir çift çek (private PEM'i UI'da göstermeyeceğiz)
  const claimEdPair = async () => {
    try {
      setLoadingEDPair(true);
      const res = await axios.post(`${API}/api/ed25519/claim-one`);
      const { public_key, private_key } = res.data || {};
      if (!public_key || !private_key) throw new Error("No ED pair returned.");
      setFormData(prev => ({ ...prev, edPublicPem: public_key, edPrivatePem: private_key }));
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.detail || "ED key stock empty.", { position: "top-center" });
    } finally {
      setLoadingEDPair(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
    }
  };

  const handleKeyInput = (e) => {
    if (!(e.ctrlKey && e.key === 'v') && !(e.metaKey && e.key === 'v')) e.preventDefault();
  };
  const handlePaste = (e, fieldName) => {
    const pastedText = e.clipboardData.getData('text');
    setFormData(prev => ({ ...prev, [fieldName]: pastedText }));
    e.preventDefault();
    if (errors[fieldName]) {
      setErrors(prev => {
        const n = { ...prev };
        delete n[fieldName];
        return n;
      });
    }
  };

  /** ===== Step: ED → Next ===== */
  const onNextFromED = async () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Please enter an API name';
    if (!formData.edKey.trim()) newErrors.edKey = 'ED Key cannot be empty';
    if (!formData.edPublicPem.trim()) newErrors.edPublicPem = 'ED Public PEM missing';
    if (!formData.edPrivatePem.trim()) newErrors.edPrivatePem = 'ED Private PEM missing';
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    try {
      setVerifying(true);
      const estUSD = await verifyEdOnServer(formData.edKey, formData.edPrivatePem);
      setEdBalance(Number(estUSD)); // ED → Spot USD
      setShowEdConfirm(true);
    } catch (e) {
      console.error(e);
      toast.error("ED ile doğrudan bakiye alınamadı. Lütfen ED Key’i kontrol edin.", { position: "top-center" });
      setShowEdConfirm(false);
      setStep("ed");
      setTimeout(() => edKeyRef.current?.focus(), 100);
    } finally {
      setVerifying(false);
    }
  };
  const onConfirmED = () => {
    setShowEdConfirm(false);
    setStep("hmac");
    setTimeout(() => keyInputRef.current?.focus(), 100);
  };
  const onBackToED = () => {
    setShowEdConfirm(false);
    setStep("ed");
    setTimeout(() => edKeyRef.current?.focus(), 100);
  };

  /** ===== Step: HMAC → Verify & Next ===== */
  const onVerifyHmac = async () => {
    const newErrors = {};
    if (!formData.key.trim()) newErrors.key = 'API key cannot be empty';
    if (!formData.secretkey.trim()) newErrors.secretkey = 'Secret cannot be empty';
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    try {
      setVerifying(true);
      const { spot, futures, total } = await verifyHmacOnServer(formData.key, formData.secretkey);
      setSpotUsd(spot);
      setFuturesUsd(futures);
      setHmacBalance(total);
      setShowHmacConfirm(true);
    } catch (e) {
      console.error(e);
      toast.error("HMAC ile bakiye alınamadı. Bilgileri kontrol edin.", { position: "top-center" });
      setShowHmacConfirm(false);
    } finally {
      setVerifying(false);
    }
  };

  const onConfirmHmac = () => {
    setShowHmacConfirm(false);
    onSave({
      exchange: formData.exchange,
      name: formData.name,
      // HMAC creds
      key: formData.key,
      secretkey: formData.secretkey,
      // ED (UI'da göstermesek de saklıyoruz)
      edKey: formData.edKey,
      edPublicPem: formData.edPublicPem,
      edPrivatePem: formData.edPrivatePem,
      // DB'ye yazılacak bakiyeler
      spot_balance: spotUsd,
      futures_balance: futuresUsd,
    }, editMode);
  };

  const closeAll = () => {
    setShowEdConfirm(false);
    setShowHmacConfirm(false);
    onClose();
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text || "");
      toast.success("Copied!", { position: "top-center", autoClose: 1200 });
    } catch {
      toast.error("Copy failed", { position: "top-center", autoClose: 1200 });
    }
  };

  // >>> UYARI: ED(Spot) vs HMAC(Spot) farkı
  const diffPct =
    spotUsd > 0 && edBalance !== null
      ? Math.abs(edBalance - spotUsd) / spotUsd * 100
      : 0;
  const showMismatch = diffPct > 1; // %1'den büyükse uyar

  const fmt = (n) => Number(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <motion.div
            key="modal-content"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="bg-[rgb(0,3,15)] rounded p-6 w-full max-w-lg shadow-lg text-white relative"
          >
           <h2 className="text-lg font-bold mb-1">{editMode ? 'Rename API' : 'Add New API'}</h2>
           {!editMode && (
             <p className="text-xs text-gray-400 mb-4">
               {step === "ed" ? "Step 1/2 — Verify with ED Key (direct to Binance)" : "Step 2/2 — Verify HMAC Keys (direct to Binance)"}
             </p>
           )}

            <div className="space-y-4">
              {/* API Name */}
              <div>
                <label className="block font-medium">API Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter API name"
                  className={`w-full mt-1 rounded-sm px-3 py-2 bg-gray-900 text-white ${errors.name ? 'border border-red-500' : ''}`}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              {/* STEP: ED */}
              {!editMode && (
                <>
                {step === "ed" && (
                  <>
                    {/* ED Key */}
                    <div>
                      <label className="block font-medium">ED Key <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="edKey"
                        ref={edKeyRef}
                        value={formData.edKey}
                        onChange={handleChange}
                        placeholder="Enter your ED Key (from Binance)"
                        className={`w-full mt-1 rounded-sm px-3 py-2 bg-gray-900 text-white ${errors.edKey ? 'border border-red-500' : ''}`}
                      />
                      {errors.edKey && <p className="text-red-500 text-sm mt-1">{errors.edKey}</p>}
                    </div>

                    {/* ED Public PEM (gösteriyoruz) */}
                    <div>
                      <label className="block font-medium">ED Public PEM</label>
                      <div className="relative">
                        <textarea
                          name="edPublicPem"
                          value={formData.edPublicPem}
                          readOnly
                          className={`w-full mt-1 rounded-sm px-3 py-2 bg-gray-900 text-white font-mono text-xs min-h-[84px] ${errors.edPublicPem ? 'border border-red-500' : ''}`}
                        />
                        <button
                          type="button"
                          onClick={() => copy(formData.edPublicPem)}
                          className="absolute top-1 right-1 text-xs bg-gray-700 hover:bg-gray-600 rounded px-2 py-1"
                        >
                          Copy
                        </button>
                      </div>
                      {errors.edPublicPem && <p className="text-red-500 text-sm mt-1">{errors.edPublicPem}</p>}
                    </div>

                    {/* ED Private PEM — UI'DA GÖSTERİLMİYOR */}
                    {/* (işlevsel olarak state'te duruyor ve verifyEdOnServer'da kullanılıyor) */}
                  </>
                )}

                {/* STEP: HMAC */}
                {step === "hmac" && (
                  <>
                    <div>
                      <label className="block font-medium">API Key <span className="text-red-500">*</span></label>
                      <div className="relative w-full">
                        <input
                          type="text"
                          name="key"
                          ref={keyInputRef}
                          value={formData.key}
                          onChange={handleChange}
                          onKeyDown={handleKeyInput}
                          onPaste={(e) => handlePaste(e, 'key')}
                          className={`w-full mt-1 rounded-sm px-3 py-2 bg-gray-900 text-white ${errors.key ? 'border border-red-500' : ''}`}
                          placeholder="Paste your API key"
                        />
                        <span className="absolute inset-y-0 right-2 flex items-center text-gray-600 pointer-events-none text-base">
                          <FaKey />
                        </span>
                      </div>
                      {errors.key && <p className="text-red-500 text-sm mt-1">{errors.key}</p>}
                    </div>

                    <div>
                      <label className="block font-medium">Secret API Key <span className="text-red-500">*</span></label>
                      <div className="relative w-full">
                        <input
                          type="text"
                          name="secretkey"
                          ref={secretKeyInputRef}
                          value={formData.secretkey}
                          onChange={handleChange}
                          onKeyDown={handleKeyInput}
                          onPaste={(e) => handlePaste(e, 'secretkey')}
                          className={`w-full mt-1 rounded-sm px-3 py-2 bg-gray-900 text-white ${errors.secretkey ? 'border border-red-500' : ''}`}
                          placeholder="Paste your Secret"
                        />
                        <span className="absolute inset-y-0 right-2 flex items-center text-gray-600 pointer-events-none text-base">
                          <FaKey />
                        </span>
                      </div>
                      {errors.secretkey && <p className="text-red-500 text-sm mt-1">{errors.secretkey}</p>}
                    </div>
                  </>
                )}
              </>
              )}
              {/* Buttons */}
              <div className="flex justify-between items-center mt-4">
                <button onClick={closeAll} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">Cancel</button>

              {editMode ? (
                 <button
                   onClick={() => {
                     if (!formData.name?.trim()) {
                       setErrors({ name: "Please enter an API name" }); return;
                     }
                     // Sadece id + yeni isim gönder
                     onSave({ id: initialData?.id, name: formData.name.trim() }, true);
                   }}
                   className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
                 >
                   Save
                 </button>
               ) : (
                 step === "ed" ? (
                   <button onClick={onNextFromED} disabled={verifying || loadingEDPair}
                     className={`px-4 py-2 rounded ${verifying || loadingEDPair ? 'bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}>
                     {verifying || loadingEDPair ? 'Verifying…' : 'Next'}
                   </button>
                 ) : (
                   <div className="flex gap-2">
                     <button onClick={() => setStep("ed")} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded">Back</button>
                     <button onClick={onVerifyHmac} disabled={verifying}
                       className={`px-4 py-2 rounded ${verifying ? 'bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}>
                       {verifying ? 'Verifying…' : 'Verify & Next'}
                     </button>
                   </div>
                 )
               )}
              </div>
            </div>
           {!editMode && (
             <>
            {/* ED Confirm */}
            <AnimatePresence>
              {showEdConfirm && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 flex items-center justify-center rounded"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-gray-900 rounded p-5 w-full max-w-sm text-sm"
                  >
                    <h3 className="text-white font-semibold mb-2">ED Balance (Spot)</h3>
                    <p className="text-gray-300 mb-4">
                      Estimated USD: <b className="text-white">{fmt(edBalance)}</b>
                    </p>
                    <div className="flex justify-end gap-2">
                      <button onClick={onBackToED} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white">Re-enter ED Key</button>
                      <button onClick={onConfirmED} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white">Continue</button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* HMAC Confirm */}
            <AnimatePresence>
              {showHmacConfirm && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 flex items-center justify-center rounded"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-gray-900 rounded p-5 w-full max-w-sm text-sm"
                  >
                    <h3 className="text-white font-semibold mb-2">Confirm Balance (Spot + Futures)</h3>

                    <div className="text-gray-300 mb-2">
                      <div>Total USD: <b className="text-white">{fmt(hmacBalance)}</b></div>
                      <div className="text-xs mt-1">Spot: <b className="text-white">{fmt(spotUsd)}</b> • Futures: <b className="text-white">{fmt(futuresUsd)}</b></div>
                    </div>

                    {/* >>> UYARI BLOĞU: fark %1'den büyükse */}
                    {showMismatch && (
                      <div className="mb-3 text-yellow-300 bg-yellow-900/30 border border-yellow-700 rounded px-3 py-2">
                        <b>Uyarı:</b> ED (Spot) ile HMAC (Spot) bakiyeleri arasında % {diffPct.toFixed(2)} fark var.
                        API bilgilerinizin <b>aynı Binance hesabına</b> ait olduğundan emin olun.
                        Aksi durumda işlemler ve sonuçlardan doğan sorumluluk tamamen kullanıcıya aittir.
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowHmacConfirm(false)} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white">Back</button>
                      <button onClick={onConfirmHmac} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-white">Save</button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            </>
            )}
            {loadingEDPair && (
              <div className="absolute top-2 right-3 text-xs text-gray-400">fetching ED pair…</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
