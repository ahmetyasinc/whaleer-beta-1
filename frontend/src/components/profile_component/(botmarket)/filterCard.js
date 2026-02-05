'use client';

import React from 'react';
import { FiPlus } from 'react-icons/fi';

const FilterCard = () => {
    return (
        <div className="mx-[6px] h-[60px] bg-zinc-950/95 border border-zinc-800/60 text-zinc-300 flex items-center px-6 mt-[68px] sticky top-[66px] z-40 rounded-2xl ring-4 ring-zinc-900/50 shadow-lg backdrop-blur-md">
            <button className="flex bg-zinc-900 hover:bg-cyan-950/30 text-cyan-500 hover:text-cyan-300 border border-zinc-700 hover:border-cyan-500/50 px-3 py-2 rounded-md text-xs font-semibold items-center justify-center gap-2 transition-all duration-100 shadow-sm hover:shadow-[0_0_10px_-2px_rgba(6,182,212,0.3)]">
                <FiPlus className="w-4 h-4" />
                Add Filter
            </button>
            <div className="ml-4 text-xs text-zinc-600">
                {/* Placeholder for horizontal filter chips or info */}
            </div>
        </div>
    );
};

export default FilterCard;
