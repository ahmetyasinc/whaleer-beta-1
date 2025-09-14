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
    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800">
      <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
        Talebinizi kapatmadan önce memnuniyetinizi değerlendirin
      </h3>
      
      <div className="mb-3">
        <div className="flex space-x-1 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`text-2xl ${rating >= star ? 'text-yellow-500' : 'text-gray-300'}`}
            >
              ★
            </button>
          ))}
        </div>
        <div className="text-sm text-gray-500">
          {rating === 0 && "Değerlendirmek için yıldızlara tıklayın"}
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
        placeholder="İsteğe bağlı geri bildirim (neyden memnun kaldınız veya kalmadınız?)"
        rows={3}
        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-3"
      />
      
      <div className="flex space-x-2">
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-green-600 text-white rounded-md"
        >
          Değerlendir ve Kapat
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md"
        >
          İptal
        </button>
      </div>
    </div>
  );
}