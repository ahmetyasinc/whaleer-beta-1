'use client';

import { useState } from "react";
import { FiSave } from "react-icons/fi";
import { toast } from "react-toastify";
import { updateMyProfileSettings } from "@/api/settings/settings";

export default function AccountSecurityCard({ t }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_new_password: ""
  });

  const update = (k,v) => setForm((f)=>({ ...f, [k]: v }));

  const onSave = async () => {
    if (!form.new_password) return toast.info(t("security.no_new_pw"));
    if (form.new_password !== form.confirm_new_password) {
      return toast.error(t("security.mismatch"));
    }
    setSaving(true);
    try {
      await updateMyProfileSettings({
        current_password: form.current_password || "",
        new_password: form.new_password
      });
      toast.success(t("security.changed"));
      setForm({ current_password:"", new_password:"", confirm_new_password:"" });
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
        <h2 className="text-lg font-medium">{t("security.title")}</h2>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors duration-200 disabled:opacity-60"
        >
          <FiSave />
          {saving ? t("saving") : t("save")}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input type="password" label={t("security.current")} value={form.current_password} onChange={(e)=>update("current_password", e.target.value)} />
        <Input type="password" label={t("security.new")} value={form.new_password} onChange={(e)=>update("new_password", e.target.value)} />
        <div className="md:col-span-2">
          <Input type="password" label={t("security.confirm")} value={form.confirm_new_password} onChange={(e)=>update("confirm_new_password", e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-zinc-400 mt-3">{t("security.hint")}</p>
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
