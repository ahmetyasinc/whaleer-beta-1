"use client";

import { useRef, useEffect, useState } from "react";
import { BiChevronDown } from "react-icons/bi";
import useCryptoStore from "@/store/indicator/cryptoPinStore"; // Zustand store'u import et
import i18n from "@/i18n";
import { useTranslation } from "react-i18next";


const PeriodDropdown = ({locale}) => {
  const { t } = useTranslation("indicator");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const options = [
    { value: "1m", label: t("1m") },
    { value: "3m", label: t("3m" )},
    { value: "5m", label: t("5m" )},
    { value: "15m", label:t("15m") },
    { value: "30m", label:t("30m") },
    { value: "1h", label: t("1h") },
    { value: "2h", label: t("2h") },
    { value: "4h", label: t("4h") },
    { value: "1d", label: t("1d") },
    { value: "1w", label: t("1w") },
  ];
  const { selectedPeriod, setSelectedPeriod } = useCryptoStore(); // Zustand state'ini al

  // Seçilen backend değeri için Türkçe eşleşmeyi bul
  const selectedLabel = options.find((opt) => opt.value === selectedPeriod)?.label || "Seçiniz";

  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="w-[106px] flex items-center bg-black border border-gray-800 hover:border-gray-600 transition duration-100 text-gray-200 pl-3 py-2 rounded-md"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        {selectedLabel}
        <BiChevronDown className="ml-auto text-[22px] mr-2" />
      </button>

      {isDropdownOpen && (
        <ul className="absolute top-full left-0 bg-gray-900 shadow-lg rounded-md mt-2 w-32 list-none p-0">
          {options.map((option) => (
            <li
              key={option.value}
              className="py-2 hover:bg-gray-800 cursor-pointer text-left pl-4"
              onClick={() => {
                setSelectedPeriod(option.value); // Backend'e İngilizce değeri gönder
                setIsDropdownOpen(false);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PeriodDropdown;
