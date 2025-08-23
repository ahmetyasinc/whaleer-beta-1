// src/theme/index.js
import light from "./light";
import dark from "./dark";

export const getTheme = (mode) => {
  return mode === "dark" ? dark : light;
};
