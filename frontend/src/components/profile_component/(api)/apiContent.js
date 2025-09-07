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
import { useTranslation } from 'react-i18next';

const fmtUSD = (n, locale = "en") =>
  Number(n ?? 0).toLocaleString(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export default function ApiConnectionClient() {
  const { t, i18n } = useTranslation("apiContent");
  const locale = i18n.language || "en";

  const {
    apiList,
    addApi,
    deleteApiCascade,
    updateApi,
    loadApiKeys,
    setDefaultApi,
    fetchApiBots,
  } = useApiStore();

  useEffect(() => { loadApiKeys(); }, []);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  const [deleteIndex, setDeleteIndex] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

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
          createdAt: new Date().toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }),
          lastUsed: t("table.never"),
        });
      }
      handleCloseModal();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || t("errors.saveFailed"), { position: "top-center", autoClose: 3500 });
    }
  };

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
          <h2 className="text-xl text-white font-semibold">{t("title")}</h2>

          <button
            onClick={handleAddNewApi}
            className="group/button relative inline-flex items-center justify-center overflow-hidden rounded-md bg-gray-800/90 backdrop-blur-lg px-6 py-1 text-sm font-semibold text-white transition-all duration-300 ease-in-out hover:shadow-md hover:shadow-gray-600/50"
          >
            <span className="text-sm">{t("buttons.addNew")}</span>
            <HiPlusSmall className="text-2xl relative font-semibold" />
            <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
              <div className="relative h-full w-10 bg-white/20"></div>
            </div>
          </button>
        </div>

        <p className="text-gray-500 text-sm font-medium mb-6 pb-4 border-b border-gray-500">
          • {t("info.line1")}<br />
          • {t("info.line2")}<br />
          • {t("info.line3")}<br />
          • {t("info.line4")}<br />
          • {t("info.line5")}
        </p>

        {apiList.length === 0 ? (
          <p className="text-gray-400">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-white">
              <thead>
                <tr className="text-gray-300 border-b border-gray-700">
                  <th className="py-2 px-4 font-semibold">{t("table.name")}</th>
                  <th className="py-2 px-4 font-semibold">{t("table.exchange")}</th>
                  <th className="py-2 px-4 font-semibold">{t("table.balance")}</th>
                  <th className="py-2 px-4 font-semibold">{t("table.added")}</th>
                  <th className="py-2 px-4 font-semibold text-center">{t("table.actions")}</th>
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
                              {t("table.default")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-4">{api.exchange}</td>
                      <td className="py-2 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{fmtUSD(total, locale)}</span>
                          <span className="text-xs text-gray-400">
                            {t("table.spot")} {fmtUSD(spot, locale)} • {t("table.futures")} {fmtUSD(futures, locale)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-4">{api.createdAt}</td>
                      <td className="py-2 px-4 text-center space-x-3">
                        {!api.default && (
                          <button
                            onClick={() => handleMakeDefault(api.id)}
                            className="text-yellow-400 hover:text-yellow-300 mr-2"
                            title={t("tooltips.setDefault")}
                          >
                            <IoMdStar />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditApi(idx)}
                          className="text-blue-400 hover:text-blue-200"
                          title={t("tooltips.edit")}
                        >
                          <FiEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(idx)}
                          className="text-red-400 hover:text-red-300"
                          title={t("tooltips.delete")}
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
