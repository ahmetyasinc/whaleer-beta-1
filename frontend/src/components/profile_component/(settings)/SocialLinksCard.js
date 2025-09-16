'use client';

import { useEffect, useState } from "react";
import { FiSave } from "react-icons/fi";
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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getMyProfileSettings();
        if (mounted) {
          setForm({
            instagram: data.instagram || "",
            linkedin: data.linkedin || "",
            github: data.github || "",
          });
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

  const onSave = async () => {
    setSaving(true);
    try {
      await updateMyProfileSettings({ ...form });
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
        <h2 className="text-lg font-medium">{t("social.title")}</h2>
        <button
          onClick={onSave}
          disabled={saving || loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors duration-200 disabled:opacity-60"
        >
          <FiSave />
          {saving ? t("saving") : t("save")}
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-400">{t("loading")}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Instagram" placeholder="@kullanici" value={form.instagram} onChange={(e)=>update("instagram", e.target.value)} />
          <Input label="LinkedIn" placeholder="profile url / kullanıcı" value={form.linkedin} onChange={(e)=>update("linkedin", e.target.value)} />
          <Input label="GitHub" placeholder="kullanici" value={form.github} onChange={(e)=>update("github", e.target.value)} />
        </div>
      )}
    </section>
  );
}

function Input({ label, ...rest }) {
  return (
    <div>
      <div className="text-sm text-zinc-300 mb-1">{label}</div>
      <input
        {...rest}
        className="w-full px-3 py-2 bg-zinc-800 text-white border border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-700"
      />
    </div>
  );
}
