"use client";

import { useTranslation } from "react-i18next";
import { HiPlusSmall } from "react-icons/hi2";

const ApiHeader = ({ onAdd }) => {
    const { t } = useTranslation("apiContent");

    return (
        <div className="w-full bg-black border-b border-zinc-900 shadow-md flex justify-between items-center py-3 fixed top-0 left-0 right-0 z-50 h-[61px] pl-16 pr-6">
            <div className="flex gap-4 items-center w-full">
                <h2 className="flex items-center gap-2 text-xl text-gray-200 font-semibold border-l border-gray-600 pl-4 py-1">
                    {t("title")}
                </h2>

                <a
                    href=""
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] border-l border-slate-700 px-4 py-[2.5px] text-blue-400/90 hover:text-blue-300/90 underline underline-offset-2 transition-colors duration-100"
                >
                    {t("links.howToConnect")}
                </a>

                <div className="flex-grow"></div>

                <button
                    onClick={onAdd}
                    className="flex items-center justify-center gap-2 px-4 h-[40px] w-auto rounded-md bg-black border border-gray-800 hover:border-gray-600 transition duration-100 text-gray-200"
                    aria-label={t("buttons.addNew")}
                    title={t("buttons.addNew")}
                >
                    <span className="text-sm font-medium">{t("buttons.addNew")}</span>
                    <HiPlusSmall className="text-xl" />
                </button>
            </div>
        </div>
    );
};

export default ApiHeader;
