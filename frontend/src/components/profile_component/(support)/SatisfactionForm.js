// components/SatisfactionForm.jsx
"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function SatisfactionForm({ onSubmit, onCancel }) {
  const { t } = useTranslation("supportSatisfactionForm");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  const handleSubmit = () => {
    if (rating === 0) {
      alert(t("validation.ratingRequired"));
      return;
    }
    onSubmit(rating, feedback);
  };

  return (
    <div className="p-6 bg-zinc-900/30 border-t border-zinc-800/50 backdrop-blur-sm">
      <h3 className="font-medium text-zinc-200 mb-4 text-center">
        {t("title")}
      </h3>

      <div className="mb-6 flex flex-col items-center">
        <div className="flex space-x-2 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`text-3xl transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400 drop-shadow-md' : 'text-zinc-700'}`}
              type="button"
            >
              ★
            </button>
          ))}
        </div>
        <div className="text-sm font-medium text-zinc-400 h-5">
          {rating === 1 && t("rating.1")}
          {rating === 2 && t("rating.2")}
          {rating === 3 && t("rating.3")}
          {rating === 4 && t("rating.4")}
          {rating === 5 && t("rating.5")}
        </div>

        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={t("feedbackPlaceholder")}
          rows={3}
          className="w-full p-3 border border-zinc-700 rounded-lg bg-zinc-950/50 text-zinc-200 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all mb-4 resize-none"
        />

        <div className="flex space-x-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors text-sm font-medium"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] font-medium"
          >
            {t("submit")}
          </button>
        </div>
      </div>
    </div>
  );
}