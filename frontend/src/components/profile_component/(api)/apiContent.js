// src/app/api-connection/ApiConnectionClient.jsx
'use client';

import { useEffect, useState } from 'react';
import { FaRegTrashAlt } from "react-icons/fa";
import { FiEdit } from "react-icons/fi";
import { HiPlusSmall } from "react-icons/hi2";
import useApiStore from '@/store/api/apiStore';
import AddApiModal from '@/components/profile_component/(api)/addApiModal';
import ConfirmApiModal from '@/components/profile_component/(api)/confirmApiModal';
import ConfirmDeleteModal from '@/components/profile_component/(api)/confirmDeleteApi';
import { getTotalUSDBalance } from '@/api/apiKeys';
import { toast } from 'react-toastify';

export default function ApiConnectionClient() {
  const { apiList, addApi, deleteApi, updateApi, loadApiKeys } = useApiStore();
  useEffect(() => {
    loadApiKeys();
  }, []);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [tempApiData, setTempApiData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  

  const handleAddNewApi = () => {
    setEditMode(false);
    setEditIndex(null);
    setIsAddModalOpen(true);
  };

  const handleEditApi = (index) => {
    setEditMode(true);
    setEditIndex(index);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditMode(false);
    setEditIndex(null);
  };

  const handleAddModalSave = (formData, isEdit) => {
    if (isEdit) {
      updateApi(editIndex, formData);
      handleCloseModal();
    } else {
      setTempApiData(formData);
      setIsConfirmModalOpen(true);
    }
  };

const handleConfirmSave = async (userInputBalance) => {
  try {
    const { key, secretkey } = tempApiData;
    const realBalance = await getTotalUSDBalance(key, secretkey);
    if ((realBalance != null)){
      console.log("Gerçek bakiye:", realBalance);
      const difference = Math.abs(realBalance - parseFloat(userInputBalance));
      if (difference > 3) {
        toast.error("Girdiğiniz bakiye ile Binance hesabınızdaki bakiye uyuşmuyor!", {
          position: "top-center",
          autoClose: 3000,
        });
        return;
      }

      const createdAt = new Date().toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      await addApi({
        ...tempApiData,
        createdAt,
        lastUsed: 'Never',
      });

      setIsConfirmModalOpen(false);
      handleCloseModal();
      setTempApiData(null);
    }
    
  } catch (error) {
    console.error(error);
    toast.error(error.message || "Binance bakiyesi doğrulanamadı. Lütfen API bilgilerinizi kontrol edin.", {
      position: "top-center",
      autoClose: 3500,
    });
  }
};

  // Handle delete confirmation
  const handleDeleteClick = (index) => {
    setDeleteIndex(index);
    setIsDeleteConfirmOpen(true);
  };
  
  const handleDeleteConfirm = () => {
    deleteApi(deleteIndex);
    setIsDeleteConfirmOpen(false);
    setDeleteIndex(null);
  };
  
  const handleDeleteCancel = () => {
    setIsDeleteConfirmOpen(false);
    setDeleteIndex(null);
  };
  

  return (
    <>
      <div className="bg-[rgba(17,21,39,0.86)] rounded-b-md shadow p-4 min-h-[calc(85vh-4rem)]">
      <div className="flex items-center justify-between mt-12 mb-4 pb-4 border-b border-gray-500">
        <h2 className="text-xl text-white font-semibold">API Anahtarlarım</h2>
         
        <button
          onClick={handleAddNewApi}
          className="group/button relative inline-flex items-center justify-center overflow-hidden rounded-md bg-gray-800/90 backdrop-blur-lg px-6 py-1 text-sm font-semibold text-white transition-all duration-300 ease-in-out hover:shadow-md hover:shadow-gray-600/50"
          >
            <span className="text-sm">Yeni API Ekle</span>
            <HiPlusSmall className="text-2xl relative font-semibold" />
            <div
              className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]"
            >
              <div className="relative h-full w-10 bg-white/20"></div>
            </div>
        </button>
       </div>
     
        <p className="text-gray-500 text-sm font-medium mb-6 pb-4 border-b border-gray-500">
               • Bu sayfada kayıtlı tüm API anahtarlarını görüntüleyebilir ve yönetebilirsiniz.<br />
               • API anahtarlarınızı halka açık hiçbir platform ve tarayıcıda paylaşmayın.<br />
               • Doğrulama yapabilmeniz ve kripto hesabınızda bot çalıştırabilmeniz için API anahtarınızın okuma ve işlem izinlerini açın.<br />
               • Botunuzun doğru çalışması için API anahtarının aktif ve geçerli olduğundan emin olun.<br />
               • Borsa API limitlerinizi kontrol edin, çok fazla istek hesabınızı kısıtlayabilir.
            </p>
        {apiList.length === 0 ? (
          <p className="text-gray-400">Henüz bir API anahtarı eklenmedi.</p>
        ) : (
            
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-white">
              <thead>
                <tr className="text-gray-300 border-b border-gray-700">
                  <th className="py-2 px-4 font-semibold">İsim</th>
                  <th className="py-2 px-4 font-semibold">Borsa</th>
                  <th className="py-2 px-4 font-semibold">Eklendi</th>
                  <th className="py-2 px-4 font-semibold">Son Kullanım</th>
                  <th className="py-2 px-4 font-semibold text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {apiList.map((api, idx) => (
                  <tr key={idx} className="border-b border-gray-700 hover:bg-gray-800">
                    <td className="py-2 px-4">{api.name}</td>
                    <td className="py-2 px-4">{api.exchange}</td>
                    <td className="py-2 px-4">{api.createdAt}</td>
                    <td className="py-2 px-4">{api.lastUsed}</td>
                    <td className="py-2 px-4 text-center space-x-3">
                      <button 
                        onClick={() => handleEditApi(idx)} 
                        className="text-blue-400 hover:text-blue-200"
                      >
                        <FiEdit />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(idx)} 
                        className="text-red-400 hover:text-red-300"
                      >
                        <FaRegTrashAlt />
                      </button>

                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddApiModal 
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        onSave={handleAddModalSave}
        editMode={editMode}
        initialData={editMode && editIndex !== null ? apiList[editIndex] : null}
      />

      <ConfirmApiModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmSave}
        apiData={tempApiData || {}}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteConfirmOpen}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />

    </>
  );
}
