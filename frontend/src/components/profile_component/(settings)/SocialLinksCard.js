'use client';

import { useEffect, useState, useMemo } from "react";
import { FiSave, FiShare2 } from "react-icons/fi";
import { toast } from "react-toastify";
import { getMyProfileSettings, updateMyProfileSettings } from "@/api/settings/settings";

export default function SocialLinksCard({ t }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    instagram: "",
    linkedin: "",
    github: "",
  });

  const [initialData, setInitialData] = useState({ ...form });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getMyProfileSettings();
        if (mounted) {
          const loaded = {
            instagram: data.instagram || "",
            linkedin: data.linkedin || "",
            github: data.github || "",
          };
          setForm(loaded);
          setInitialData(loaded);
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

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const hasChanges = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialData), [form, initialData]);

  const onSave = async () => {
    if (!hasChanges) return;

    setSaving(true);
    try {
      await updateMyProfileSettings({ ...form });
      toast.success(t("saved"));
      setInitialData(form);
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

      {/* Üstte neon çizgi */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px 
        bg-gradient-to-r from-blue-500/0 via-blue-500/60 to-blue-500/0" />

      {/* Arka blur daire */}
      <div className="pointer-events-none absolute -left-14 -top-10 h-36 w-36 
        rounded-full bg-blue-500/10 blur-3xl" />

      {/* Başlık + Kaydet */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl 
            bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30">
            <FiShare2 className="text-lg" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">{t("social.title")}</h2>
            <p className="text-xs text-zinc-500 mt-1">{t("social.subtitle")}</p>
          </div>
        </div>

        <button
          onClick={onSave}
          disabled={!hasChanges || loading || saving}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 
            text-sm font-medium transition-all duration-200
            ${
              hasChanges && !saving && !loading
                ? "bg-blue-600/90 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0"
                : "bg-zinc-900/80 text-zinc-500 ring-1 ring-zinc-800/80 cursor-not-allowed opacity-60"
            }`}
        >
          <FiSave className="text-base" />
          {saving ? t("saving") : t("save")}
        </button>
      </div>

      {/* İçerik */}
      {loading ? (
        <div className="text-sm text-zinc-500 text-center py-4 animate-pulse">{t("loading")}...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Instagram" 
            placeholder="@kullanici" 
            value={form.instagram} 
            onChange={(e)=>update("instagram", e.target.value)}
          />
          <Input 
            label="LinkedIn" 
            placeholder="URL veya kullanıcı adı" 
            value={form.linkedin} 
            onChange={(e)=>update("linkedin", e.target.value)}
          />
          <Input 
            label="GitHub" 
            placeholder="kullanici" 
            value={form.github} 
            onChange={(e)=>update("github", e.target.value)}
          />
        </div>
      )}
    </section>
  );
}

function Input({ label, ...rest }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-1.5">{label}</div>
      <input
        {...rest}
        className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-900/40 text-zinc-50 border border-zinc-800 
          outline-none placeholder-zinc-500 transition-all
          focus:border-blue-500/70 focus:ring-2 focus:ring-blue-600/40"
      />
    </div>
  );
}
