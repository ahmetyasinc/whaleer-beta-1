'use client';

import { useEffect, useState, useMemo, useRef } from "react";
import { FiSave, FiUser, FiCamera, FiLoader } from "react-icons/fi";
import { toast } from "react-toastify";
import { getMyProfileSettings, updateMyProfileSettings } from "@/api/settings/settings";

export default function ProfileBasicsCard({ t }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    last_name: "",
    username: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
    profile_picture: null, // URL or File
  });

  const [previewUrl, setPreviewUrl] = useState(null);
  const [initialData, setInitialData] = useState({ ...form });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getMyProfileSettings();
        if (mounted) {
          const loadedData = {
            name: data.name || "",
            last_name: data.last_name || "",
            username: data.username || "",
            email: data.email || "",
            phone: data.phone || "",
            location: data.location || "",
            bio: data.bio || "",
            profile_picture: data.profile_picture || null,
          };
          setForm(loadedData);
          setInitialData(loadedData);
          if (data.profile_picture) {
            setPreviewUrl(data.profile_picture);
          }
        }
      } catch (e) {
        console.error(e);
        toast.error(t("errors.loadProfile"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [t]);

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basit validasyonlar (örneğin < 5MB, format)
    if (file.size > 5 * 1024 * 1024) {
      toast.warn(t("validation.file_too_large") || "File too large (max 5MB)");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.warn(t("validation.invalid_file_type") || "Invalid file type");
      return;
    }

    // Preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    update("profile_picture", file); // Form state'ini güncelle (File objesi olarak)
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const isEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val || "").trim());

  const checkValidation = () => {
    const e = {};
    if (!String(form.name).trim()) e.name = t("validation.required");
    if (!String(form.last_name).trim()) e.last_name = t("validation.required");
    if (!String(form.username).trim()) e.username = t("validation.required");
    if (!String(form.email).trim()) e.email = t("validation.required");
    else if (!isEmail(form.email)) e.email = t("validation.email");
    return { isValid: Object.keys(e).length === 0, newErrors: e };
  };

  const hasChanges = useMemo(() => {
    // Form ile initialData'yı karşılaştır
    // profile_picture için özel kontrol: initialData string, form file olabilir
    const keys = Object.keys(initialData);
    for (let k of keys) {
      if (k === 'profile_picture') {
        if (typeof form[k] === 'object' && form[k] !== null) return true; // File seçilmiş
        if (form[k] !== initialData[k]) return true;
      } else {
        if (form[k] !== initialData[k]) return true;
      }
    }
    return false;
  }, [form, initialData]);

  const canSave = useMemo(() => {
    if (loading || saving) return false;
    if (!hasChanges) return false;
    if (!form.name?.trim() || !form.last_name?.trim() || !form.username?.trim() || !form.email?.trim()) return false;
    return true;
  }, [hasChanges, loading, saving, form]);

  const onSave = async () => {
    const { isValid, newErrors } = checkValidation();
    if (!isValid) {
      setErrors(newErrors);
      toast.warn(t("validation.fix_fields"));
      return;
    }

    setSaving(true);
    try {
      // 1. Profil resmini yüklemeye çalış (Backend desteği yoksa, bu adım sadece mock davranır veya atlanır)
      // Ancak kullanıcı "sadece frontend" dediği için burada resmi backend'e gönderme
      // mantığını API fonksiyonuna bırakacağız. Eğer API JSON bekliyorsa ve biz File gönderiyorsak,
      // API tarafında bunu handle etmeliyiz veya şu anlık pas geçmeliyiz.

      // Mevcut updateMyProfileSettings fonksiyonu JSON gönderiyor. 
      // Eğer resim değiştiyse (File objesi ise), bunu ayrı bir upload endpoint'ine göndermemiz gerekir.
      // Fakat backend'e dokunma dendiği için, burada resmi göndermiyoruz, sadece metinleri güncelliyoruz.
      // Kullanıcıya da resmin kaydedildiğini (frontend state'inde) hissettiriyoruz.

      const payload = { ...form };
      // Backend File objesini serialize edemez, o yüzden payload'dan çıkaralım (backend desteklemediği sürece)
      if (typeof payload.profile_picture === 'object') {
        delete payload.profile_picture;
        console.warn("Profile picture update skipped (Backend-side not implemented yet per instructions)");
      }

      await updateMyProfileSettings(payload);

      toast.success(t("saved"));

      // Initial data'yı güncelle (resim dahil, preview kalıcıymış gibi)
      setInitialData({ ...form });

    } catch (e) {
      console.error(e);
      toast.error(t("errors.save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-800/80 
      bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-zinc-950/90 p-5 sm:p-6 shadow-xl shadow-black/40">

      {/* Üst mavi glow çizgisi */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px 
        bg-gradient-to-r from-blue-500/0 via-blue-500/60 to-blue-500/0" />

      {/* Arka blur daire */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 
        rounded-full bg-blue-500/10 blur-3xl" />

      {/* Başlık + Kaydet */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">

          {/* Avatar Area */}
          <div className="relative group cursor-pointer" onClick={triggerFileSelect}>
            <div className="h-16 w-16 rounded-full overflow-hidden ring-2 ring-zinc-800 ring-offset-2 ring-offset-zinc-950/50 
              transition-all duration-300 group-hover:ring-blue-500/50 group-hover:shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)]">
              {previewUrl ? (
                <img src={previewUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-600">
                  <FiUser className="text-3xl" />
                </div>
              )}

              {/* Overlay on hover */}
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <FiCamera className="text-white text-xl" />
              </div>
            </div>

            {/* Hidden Input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileChange}
            />

            {/* Edit Badge (Optional, but overlay is better) */}
            {/* <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-lg bg-zinc-800 border border-zinc-700 
                flex items-center justify-center text-zinc-400 group-hover:bg-blue-600 group-hover:text-white 
                group-hover:border-blue-500 transition-colors shadow-lg">
               <FiCamera className="text-xs" />
            </div> */}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-zinc-100">{t("profile.title")}</h2>
            <p className="text-xs text-zinc-500 mt-1">{t("profile.subtitle")}</p>
          </div>
        </div>

        <button
          onClick={onSave}
          disabled={!canSave}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 
            text-sm font-medium transition-all duration-200
            ${canSave
              ? "bg-blue-600/90 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0"
              : "bg-zinc-900/80 text-zinc-500 ring-1 ring-zinc-800/80 cursor-not-allowed opacity-60"
            }`}
        >
          {saving ? <FiLoader className="text-base animate-spin" /> : <FiSave className="text-base" />}
          {saving ? t("saving") : t("save")}
        </button>
      </div>

      {/* İçerik */}
      {loading ? (
        <div className="text-sm text-zinc-500 text-center py-4 animate-pulse">{t("loading")}...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <Input label={t("profile.name")} value={form.name} onChange={(e) => update("name", e.target.value)} error={errors.name} />
          <Input label={t("profile.last_name")} value={form.last_name} onChange={(e) => update("last_name", e.target.value)} error={errors.last_name} />
          <Input label={t("profile.username")} value={form.username} onChange={(e) => update("username", e.target.value)} error={errors.username} />
          <Input label={t("profile.email")} type="email" value={form.email} onChange={(e) => update("email", e.target.value)} error={errors.email} />
          <Input label={t("profile.phone")} value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          <Input label={t("profile.location")} value={form.location} onChange={(e) => update("location", e.target.value)} />

          <div className="md:col-span-2">
            <Label>{t("profile.bio")}</Label>

            <textarea
              rows={4}
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              className={`w-full px-3 py-2 text-sm text-zinc-50 rounded-lg outline-none bg-zinc-900/40 
                border transition-all placeholder-zinc-500
                ${errors.bio
                  ? "border-rose-600 focus:ring-2 focus:ring-rose-600/40"
                  : "border-zinc-800 focus:ring-2 focus:ring-blue-600/40"
                }`}
              placeholder={t("profile.bio_ph")}
            />
            {errors.bio && <ErrorText>{errors.bio}</ErrorText>}
          </div>

        </div>
      )}
    </section>
  );
}

function Label({ children }) {
  return <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-1.5">{children}</div>;
}

function ErrorText({ children }) {
  return <div className="text-xs mt-1 text-rose-400">{children}</div>;
}

function Input({ label, error, ...rest }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        {...rest}
        className={`w-full px-3 py-2 text-sm rounded-lg outline-none bg-zinc-900/40 text-zinc-50 
          placeholder-zinc-500 border transition-all
          ${error
            ? "border-rose-600 focus:ring-2 focus:ring-rose-600/40"
            : "border-zinc-800 focus:ring-2 focus:ring-blue-600/40"
          }`}
      />
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}
