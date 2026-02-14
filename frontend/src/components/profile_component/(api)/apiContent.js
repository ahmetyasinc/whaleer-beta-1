// src/app/api-connection/ApiConnectionClient.jsx
'use client';

import { useEffect, useState } from 'react';
import { FaRegTrashAlt } from "react-icons/fa";
import { FiEdit } from "react-icons/fi";
import { IoMdStar } from "react-icons/io";
import useApiStore from '@/store/api/apiStore';
import AddApiModal from '@/components/profile_component/(api)/addApiModal';
import ConfirmDeleteModal from '@/components/profile_component/(api)/confirmDeleteApi';
import { toast } from 'react-toastify';
import { MdOutlineVpnKeyOff } from "react-icons/md";
import { useTranslation } from 'react-i18next';
import ApiHeader from './apiHeader';

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
      <ApiHeader onAdd={handleAddNewApi} />
      <div className="bg-[rgb(17,17,24)] backdrop-blur-sm border border-gray-700/30 rounded-lg mx-2 mt-[60px] mb-2 shadow-xl shadow-black/50 p-4 h-[calc(100vh-90px)] flex flex-col overflow-hidden">


        <p className="text-gray-500 text-sm font-medium mb-6 pb-4 border-b border-gray-500">
          • {t("info.line1")}<br />
          • {t("info.line2")}<br />
          • {t("info.line3")}<br />
          • {t("info.line4")}<br />
          • {t("info.line5")}
        </p>

        <div className="flex-grow overflow-auto">
          {apiList.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-gray-400 min-h-[40vh]">
              <MdOutlineVpnKeyOff className="text-6xl text-gray-500 mb-3" />
              <p className="text-base">{t("empty")}</p>
            </div>) : (
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
                    <tr key={api.id ?? idx} className="border-b border-gray-700 hover:bg-zinc-800/20">
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <span>
                            {api.name.length > 18 ? `${api.name.slice(0, 10)}...` : api.name}
                          </span>
                          {api.default && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                              <IoMdStar className="text-yellow-300 text-[14px]" />
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
                      <td className="py-2 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!api.default && (
                            <button
                              onClick={() => handleMakeDefault(api.id)}
                              className="flex items-center justify-center p-1.5 rounded-md text-yellow-500 hover:text-yellow-300 transition-colors duration-150"
                              title={t("tooltips.setDefault")}
                            >
                              <IoMdStar className="text-[16px]" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditApi(idx)}
                            className="flex items-center justify-center p-1.5 rounded-md text-blue-400 hover:text-blue-200 transition-colors duration-150"
                            title={t("tooltips.edit")}
                          >
                            <FiEdit className="text-[15px]" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(idx)}
                            className="flex items-center justify-center p-1.5 rounded-md text-red-400 hover:text-red-300 transition-colors duration-150"
                            title={t("tooltips.delete")}
                          >
                            <FaRegTrashAlt className="text-[14px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 🧭 Footer sabit */}
        <footer className="mt-auto pt-3 border-t border-gray-700/60 text-center text-gray-400 text-[13px]">
          <p>
            © {new Date().getFullYear()} <span className="text-blue-400/80 font-semibold">Whaleer</span>. {t("footer.rights")}
          </p>
        </footer>
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
