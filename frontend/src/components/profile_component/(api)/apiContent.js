// src/app/api-connection/ApiConnectionClient.jsx
'use client';

import { useEffect, useState } from 'react';
import { FaRegTrashAlt } from "react-icons/fa";
import { FiEdit } from "react-icons/fi";
import { HiPlusSmall } from "react-icons/hi2";
import { IoMdStar } from "react-icons/io";
import useApiStore from '@/store/api/apiStore';
import AddApiModal from '@/components/profile_component/(api)/addApiModal';
import ConfirmDeleteModal from '@/components/profile_component/(api)/confirmDeleteApi';
import { toast } from 'react-toastify';

const fmtUSD = (n) =>
  Number(n ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export default function ApiConnectionClient() {
  const {
    apiList,
    addApi,
    deleteApiCascade,   // YENİ
    updateApi,
    loadApiKeys,
    setDefaultApi,
    fetchApiBots,       // YENİ
  } = useApiStore();

  useEffect(() => { loadApiKeys(); }, []);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  const [deleteIndex, setDeleteIndex] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Bot listesi state’i
  const [botsForDelete, setBotsForDelete] = useState([]);
  const [loadingBots, setLoadingBots] = useState(false);

  const handleAddNewApi = () => { setEditMode(false); setEditIndex(null); setIsAddModalOpen(true); };
  const handleEditApi = (index) => { setEditMode(true); setEditIndex(index); setIsAddModalOpen(true); };
  const handleCloseModal = () => { setIsAddModalOpen(false); setEditMode(false); setEditIndex(null); };

  const handleAddModalSave = async (payload, isEdit) => {
    try {
      if (isEdit) {
        await updateApi(payload.id, payload.name);
      } else {
        await addApi({
          ...payload,
          createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          lastUsed: 'Never',
        });
      }
      handleCloseModal();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "API key kaydedilemedi.", { position: "top-center", autoClose: 3500 });
    }
  };

  // Silme: modal aç ve botları çek
  const handleDeleteClick = async (index) => {
    setDeleteIndex(index);
    setIsDeleteConfirmOpen(true);

    const apiId = apiList[index]?.id;
    if (!apiId) return;

    setLoadingBots(true);
    try {
      const bots = await fetchApiBots(apiId);
      setBotsForDelete(bots || []);
    } catch (e) {
      setBotsForDelete([]);
    } finally {
      setLoadingBots(false);
    }
  };

  const handleDeleteConfirm = async () => {
    await deleteApiCascade(deleteIndex);
    setIsDeleteConfirmOpen(false);
    setDeleteIndex(null);
    setBotsForDelete([]);
  };

  const handleMakeDefault = async (apiId) => { await setDefaultApi(apiId); };

  const currentApiName = deleteIndex !== null ? apiList[deleteIndex]?.name : '';

  return (
    <>
      <div className="bg-[rgba(17,21,39,0.86)] rounded-b-md shadow p-4 min-h-[calc(85vh-4rem)]">
        <div className="flex items-center justify-between mt-12 mb-4 pb-4 border-b border-gray-500">
          <h2 className="text-xl text-white font-semibold">My API Keys</h2>

          <button
            onClick={handleAddNewApi}
            className="group/button relative inline-flex items-center justify-center overflow-hidden rounded-md bg-gray-800/90 backdrop-blur-lg px-6 py-1 text-sm font-semibold text-white transition-all duration-300 ease-in-out hover:shadow-md hover:shadow-gray-600/50"
          >
            <span className="text-sm">Add New API</span>
            <HiPlusSmall className="text-2xl relative font-semibold" />
            <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
              <div className="relative h-full w-10 bg-white/20"></div>
            </div>
          </button>
        </div>

        <p className="text-gray-500 text-sm font-medium mb-6 pb-4 border-b border-gray-500">
          • On this page, you can view and manage all your saved API keys.<br />
          • Never share your API keys on any public platform or browser.<br />
          • Make sure to enable read and trade permissions on your API key to verify and run bots on your crypto account.<br />
          • Ensure your API key is active and valid for your bot to function correctly.<br />
          • Check your exchange API limits — too many requests may result in restrictions.
        </p>

        {apiList.length === 0 ? (
          <p className="text-gray-400">No API keys have been added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-white">
              <thead>
                <tr className="text-gray-300 border-b border-gray-700">
                  <th className="py-2 px-4 font-semibold">Name</th>
                  <th className="py-2 px-4 font-semibold">Exchange</th>
                  <th className="py-2 px-4 font-semibold">Balance (USD)</th>
                  <th className="py-2 px-4 font-semibold">Added</th>
                  <th className="py-2 px-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiList.map((api, idx) => {
                  const spot = Number(api.spot_balance ?? 0);
                  const futures = Number(api.futures_balance ?? 0);
                  const total = spot + futures;

                  return (
                    <tr key={api.id ?? idx} className="border-b border-gray-700 hover:bg-gray-800">
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <span>{api.name}</span>
                          {api.default && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                              <IoMdStar className="text-yellow-300" />
                              Default
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-4">{api.exchange}</td>
                      <td className="py-2 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{fmtUSD(total)}</span>
                          <span className="text-xs text-gray-400">
                            spot {fmtUSD(spot)} • futures {fmtUSD(futures)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-4">{api.createdAt}</td>
                      <td className="py-2 px-4 text-center space-x-3">
                        {!api.default && (
                          <button
                            onClick={() => handleMakeDefault(api.id)}
                            className="text-yellow-400 hover:text-yellow-300 mr-2"
                            title="Set as Default"
                          >
                            <IoMdStar />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditApi(idx)}
                          className="text-blue-400 hover:text-blue-200"
                          title="Edit name"
                        >
                          <FiEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(idx)}
                          className="text-red-400 hover:text-red-300"
                          title="Delete"
                        >
                          <FaRegTrashAlt />
                        </button>
                      </td>
                    </tr>
                  );
                })}
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

      <ConfirmDeleteModal
        isOpen={isDeleteConfirmOpen}
        onCancel={() => { setIsDeleteConfirmOpen(false); setDeleteIndex(null); setBotsForDelete([]); }}
        onConfirm={handleDeleteConfirm}
        bots={botsForDelete}
        loading={loadingBots}
        apiName={currentApiName}
      />
    </>
  );
}
