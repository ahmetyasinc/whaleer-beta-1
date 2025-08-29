import axios from "axios";
axios.defaults.withCredentials = true; // cookie gönder

export const fetch_my_bot_data = async () => {
  const url = `${process.env.NEXT_PUBLIC_API_URL}/showcase/mydata`;
  const res = await axios.get(url); // filtre yok, GET
  console.log("My data: ", res)
  return res.data; // /showcase/newdata ile aynı format
};
