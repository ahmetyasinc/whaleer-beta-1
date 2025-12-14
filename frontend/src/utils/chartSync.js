export const RANGE_EVENT = 'whaleer:range';
export const RANGE_REQUEST_EVENT = 'whaleer:range:request';
export const CROSSHAIR_EVENT = 'whaleer:crosshair';

// Son yayınlanan görünümü globalde tut
const G = typeof window !== 'undefined' ? window : {};
export const setLastRangeCache = (payload) => { G.__whaleerLastRange = payload; };
export const getLastRangeCache = () => G.__whaleerLastRange || null;

// Crosshair pozisyonu için cache
export const setCrosshairCache = (payload) => { G.__whaleerCrosshair = payload; };
export const getCrosshairCache = () => G.__whaleerCrosshair || null;

const W = typeof window !== 'undefined' ? window : {};

if (!W.__whaleerSeq) W.__whaleerSeq = 0;
export const nextSeq = () => ++W.__whaleerSeq;

export const markLeader = (chartId) => { W.__whaleerLeaderId = chartId; };
export const unmarkLeader = (chartId) => {
  if (W.__whaleerLeaderId === chartId) W.__whaleerLeaderId = null;
};
export const isLeader = (chartId) => W.__whaleerLeaderId === chartId;

export const minBarsFor = (_period) => 50;

export const FUTURE_PADDING_BARS = 50;