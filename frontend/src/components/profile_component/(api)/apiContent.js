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
import { MdOutlineVpnKeyOff } from "react-icons/md";
import { useTranslation } from 'react-i18next';
import { TbNetwork } from "react-icons/tb";

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
        <div className="bg-[rgba(0,0,5)] rounded-xl mx-16 pt-4 shadow p-4 min-h-[calc(100vh-1rem)] flex flex-col">
            <div className="flex items-center justify-between mt-12 mb-4 pb-4 border-b border-gray-500">
              <h2 className="flex items-center gap-2 text-3xl text-gray-200 font-semibold">
                <TbNetwork className="text-gray-200 mx-3" />
                {t("title")}
              </h2>

              <div className="flex items-center gap-4">
                {/* 📘 Yardım Linki */}
                <a
                  href=""
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-400/90 hover:text-blue-300/90 underline underline-offset-2 transition-colors duration-100 pt-6"
                >
                  {t("links.howToConnect")}
                </a>

                {/* ➕ Yeni API Ekle Butonu */}
                <button
                  onClick={handleAddNewApi}
                  className="group/button relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-t from-blue-900/50 to-gray-950 backdrop-blur-lg px-8 py-3 text-base font-semibold text-white transition-all duration-100 ease-in-out hover:scale-[1.01] hover:shadow-lg hover:shadow-gray-600/50 active:scale-[0.98] border border-gray-700/50"
                >
                  <span className="relative z-10 text-sm font-medium tracking-wide">{t("buttons.addNew")}</span>
                  <HiPlusSmall className="relative z-10 text-2xl font-bold transition-transform duration-300 group-hover/button:rotate-90" />

                  {/* Shine effect */}
                  <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                    <div className="relative h-full w-10 bg-white/20"></div>
                  </div>

                  {/* Hover gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/10 to-blue-600/0 opacity-0 transition-opacity duration-300 group-hover/button:opacity-100"></div>
                </button>
              </div>
            </div>


          <p className="text-gray-500 text-sm font-medium mb-6 pb-4 border-b border-gray-500">
            • {t("info.line1")}<br />
            • {t("info.line2")}<br />
            • {t("info.line3")}<br />
            • {t("info.line4")}<br />
            • {t("info.line5")}
          </p>

          <div className="flex-grow overflow-x-auto">
            {apiList.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-gray-400 min-h-[40vh]">
                <MdOutlineVpnKeyOff className="text-6xl text-gray-500 mb-3" />
                <p className="text-base">{t("empty")}</p>
              </div>            ) : (
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
                      <tr key={api.id ?? idx} className="border-b border-gray-700 hover:bg-[rgb(6,6,12)]">
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
