'use client';

export default function ConfirmDeleteModal({ isOpen, onCancel, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-4 shadow-lg max-w-sm w-full text-white border-b border-r border-gray-600">
        <h2 className="text-lg font-semibold mb-2">API Anahtarını Sil</h2>
        <p className="mb-10 text-[14px]">Bu API anahtarını kullanan botlarınız devre dışı kalacaktır yine de bu API anahtarını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-3 py-1 text-[13px] bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          >
            Vazgeç
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1 text-[13px] bg-red-700 text-white rounded hover:bg-red-800"
          >
            Evet, Sil
          </button>
        </div>
      </div>
    </div>
  );
}
