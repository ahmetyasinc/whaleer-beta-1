// components/SatisfactionForm.jsx
"use client";

import { useState } from "react";

export default function SatisfactionForm({ onSubmit, onCancel }) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  const handleSubmit = () => {
    if (rating === 0) {
      alert("Lütfen bir puan verin");
      return;
    }
    onSubmit(rating, feedback);
  };

  return (
    <div className="p-6 bg-zinc-900/30 border-t border-zinc-800/50 backdrop-blur-sm">
      <h3 className="font-medium text-zinc-200 mb-4 text-center">
        Talebinizi kapatmadan önce işlemden memnun kaldınız mı?
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
          {rating === 1 && "Çok Kötü"}
          {rating === 2 && "Kötü"}
          {rating === 3 && "Orta"}
          {rating === 4 && "İyi"}
          {rating === 5 && "Çok İyi"}
        </div>
      </div>

      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Eklemek istediğiniz bir not var mı? (İsteğe bağlı)"
        rows={3}
        className="w-full p-3 border border-zinc-700 rounded-lg bg-zinc-950/50 text-zinc-200 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all mb-4 resize-none"
      />

      <div className="flex space-x-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors text-sm font-medium"
        >
          Vazgeç
        </button>
        <button
          onClick={handleSubmit}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] font-medium"
        >
          Değerlendir ve Kapat
        </button>
      </div>
    </div>
  );
}