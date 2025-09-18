'use client';

import { useEffect, useState, useMemo } from "react";
import { FiSave } from "react-icons/fi";
import { toast } from "react-toastify";
import { getMyProfileSettings, updateMyProfileSettings } from "@/api/settings/settings";

export default function ProfileBasicsCard({ t }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    last_name: "",
    username: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
  });

  const [errors, setErrors] = useState({}); // { field: "message" }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getMyProfileSettings();
        if (mounted) {
          setForm((f) => ({
            ...f,
            name: data.name || "",
            last_name: data.last_name || "",
            username: data.username || "",
            email: data.email || "",
            phone: data.phone || "",
            location: data.location || "",
            bio: data.bio || "",
          }));
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
    setErrors((e) => ({ ...e, [k]: undefined })); // alan değişince hata temizle
  };

  // --- basit doğrulama ---
  const isEmail = (val) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val || "").trim());

  const validate = () => {
    const e = {};
    if (!String(form.name).trim()) e.name = t("validation.required");
    if (!String(form.last_name).trim()) e.last_name = t("validation.required");
    if (!String(form.username).trim()) e.username = t("validation.required");
    if (!String(form.email).trim()) e.email = t("validation.required");
    else if (!isEmail(form.email)) e.email = t("validation.email");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const canSave = useMemo(() => {
    // butonun aktifliği için anlık kontrol
    if (loading || saving) return false;
    if (!form.name?.trim()) return false;
    if (!form.last_name?.trim()) return false;
    if (!form.username?.trim()) return false;
    if (!form.email?.trim() || !isEmail(form.email)) return false;
    return true;
  }, [form, loading, saving]);

  const onSave = async () => {
    if (!validate()) {
      toast.warn(t("validation.fix_fields"));
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      await updateMyProfileSettings(payload);
      toast.success(t("saved"));
    } catch (e) {
      console.error(e);
      toast.error(t("errors.save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">{t("profile.title")}</h2>
        <button
          onClick={onSave}
          disabled={!canSave}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <FiSave />
          {saving ? t("saving") : t("save")}
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-400">{t("loading")}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t("profile.name")}
            value={form.name}
            onChange={(e)=>update("name", e.target.value)}
            error={errors.name}
          />
          <Input
            label={t("profile.last_name")}
            value={form.last_name}
            onChange={(e)=>update("last_name", e.target.value)}
            error={errors.last_name}
          />
          <Input
            label={t("profile.username")}
            value={form.username}
            onChange={(e)=>update("username", e.target.value)}
            error={errors.username}
          />
          <Input
            label={t("profile.email")}
            type="email"
            value={form.email}
            onChange={(e)=>update("email", e.target.value)}
            error={errors.email}
          />
          <Input label={t("profile.phone")} value={form.phone} onChange={(e)=>update("phone", e.target.value)} />
          <Input label={t("profile.location")} value={form.location} onChange={(e)=>update("location", e.target.value)} />
          <div className="md:col-span-2">
            <Label>{t("profile.bio")}</Label>
            <textarea
              rows={4}
              value={form.bio}
              onChange={(e)=>update("bio", e.target.value)}
              className={`w-full px-3 py-2 bg-zinc-800 text-white border rounded-lg outline-none focus:ring-2 focus:ring-emerald-700 ${
                errors.bio ? "border-rose-600" : "border-zinc-700"
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
  return <div className="text-sm text-zinc-300 mb-1">{children}</div>;
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
        className={`w-full px-3 py-2 bg-zinc-800 text-white border rounded-lg outline-none focus:ring-2 focus:ring-emerald-700 ${
          error ? "border-rose-600" : "border-zinc-700"
        }`}
      />
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}
