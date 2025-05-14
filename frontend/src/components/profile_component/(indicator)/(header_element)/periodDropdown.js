"use client";

import { useRef, useEffect, useState } from "react";
import { BiChevronDown } from "react-icons/bi";
import useCryptoStore from "@/store/indicator/cryptoPinStore"; // Zustand store'u import et

const options = [
  { value: "1m", label: "1 Dk" },
  { value: "3m", label: "3 Dk" },
  { value: "5m", label: "5 Dk" },
  { value: "15m", label: "15 Dk" },
  { value: "30m", label: "30 Dk" },
  { value: "1h", label: "1 Saat" },
  { value: "2h", label: "2 Saat" },
  { value: "4h", label: "4 Saat" },
  { value: "1d", label: "1 Gün" },
  { value: "1w", label: "1 Hafta" },
];

const PeriodDropdown = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { selectedPeriod, setSelectedPeriod } = useCryptoStore(); // Zustand state'ini al

  // Seçilen backend değeri için Türkçe eşleşmeyi bul
  const selectedLabel = options.find((opt) => opt.value === selectedPeriod)?.label || "Seçiniz";

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
        className="w-[106px] flex items-center bg-gray-950 hover:bg-gray-900 pl-3 py-2 rounded-md transition"
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
