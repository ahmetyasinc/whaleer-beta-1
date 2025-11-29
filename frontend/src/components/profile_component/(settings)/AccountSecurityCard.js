"use client";

import { useState } from "react";
import { FiSave, FiLock } from "react-icons/fi";
import { toast } from "react-toastify";
import { updateMyProfileSettings } from "@/api/settings/settings";

export default function AccountSecurityCard({ t }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_new_password: "",
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const hasInput =
    form.current_password && form.new_password && form.confirm_new_password;

  const onSave = async () => {
    if (!form.new_password) return toast.info(t("security.no_new_pw"));
    if (form.new_password !== form.confirm_new_password) {
      return toast.error(t("security.mismatch"));
    }

    setSaving(true);
    try {
      await updateMyProfileSettings({
        current_password: form.current_password || "",
        new_password: form.new_password,
      });
      toast.success(t("security.changed"));
      setForm({
        current_password: "",
        new_password: "",
        confirm_new_password: "",
      });
    } catch (e) {
      console.error(e);
      toast.error(t("errors.save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-zinc-950/90 p-5 sm:p-6 shadow-xl shadow-black/40">
      {/* Üstte ince glow çizgi */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-500/0 via-blue-500/60 to-blue-500/0" />

      {/* Arka planda blur daire */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl" />

      {/* Başlık + Buton */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30">
            <FiLock className="text-lg" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100 sm:text-lg">
              {t("security.title")}
            </h2>
            <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
              {t("security.subtitle") ||
                "Şifreni belirli aralıklarla güncelleyerek hesabını koru."}
            </p>
          </div>
        </div>

        <button
          onClick={onSave}
          disabled={!hasInput || saving}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200
            ${
              hasInput && !saving
                ? "bg-blue-600/90 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0"
                : "bg-zinc-900/80 text-zinc-500 ring-1 ring-zinc-800/80 cursor-not-allowed opacity-60"
            }`}
        >
          <FiSave className="text-base" />
          <span>{saving ? t("saving") : t("save") || "Kaydet"}</span>
        </button>
      </div>

      {/* Form Alanları */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          type="password"
          label={t("security.current")}
          placeholder="••••••••"
          value={form.current_password}
          onChange={(e) => update("current_password", e.target.value)}
        />
        <Input
          type="password"
          label={t("security.new")}
          placeholder="••••••••"
          value={form.new_password}
          onChange={(e) => update("new_password", e.target.value)}
        />
        <div className="md:col-span-2">
          <Input
            type="password"
            label={t("security.confirm")}
            placeholder="••••••••"
            value={form.confirm_new_password}
            onChange={(e) => update("confirm_new_password", e.target.value)}
          />
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-zinc-500 sm:text-sm">
        {t("security.hint")}
      </p>
    </section>
  );
}

function Input({ label, helper, ...rest }) {
  return (
    <div className="group">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          {label}
        </span>
        {helper && (
          <span className="text-[0.7rem] text-zinc-500">{helper}</span>
        )}
      </div>
      <div className="relative">
        <input
          {...rest}
          className="peer w-full rounded-lg border border-zinc-800/80 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-50 outline-none transition-all placeholder-zinc-500 focus:border-blue-500/70 focus:ring-2 focus:ring-blue-600/40"
        />
        <div className="pointer-events-none absolute inset-0 rounded-lg opacity-0 ring-1 ring-blue-500/40 transition-opacity peer-focus:opacity-100" />
      </div>
    </div>
  );
}
