import api from "@/api/axios";
// axios.defaults.withCredentials = true; // cookie gönder

export const fetch_my_bot_data = async () => {
  const res = await api.get("/showcase/mydata"); // filtre yok, GET
  return res.data; // /showcase/newdata ile aynı format
};
