"use client";

import { BsBrush } from "react-icons/bs";

const DrawButton = () => {
  return (
    <button className="flex items-center justify-center w-[85px] h-[40px] rounded-md transition-all duration-200 bg-gray-950 hover:bg-gray-900 text-white">
    <BsBrush className="mr-2 text-[19px]" /> Çizim
  </button>
  );
};

export default DrawButton;
