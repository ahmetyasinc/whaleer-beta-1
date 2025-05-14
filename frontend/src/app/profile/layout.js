import "react-toastify/dist/ReactToastify.css";
import LeftMenu from "@/components/profile_component/leftmenu";

// API'den kullanıcı verisini almak için asenkron fonksiyon
async function fetchUserFromAPI() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hero-infos/`);
  const data = await res.json();
  return data;
}


// ProfileLayout bileşeni
const ProfileLayout = async ({ children }) => {
  const user = await fetchUserFromAPI(); // Kullanıcı bilgilerini al

  return (
    <div  className="min-h-screen w-screen hard-gradient">
      {/* LeftMenu'ye user'ı geçiyoruz */}
      <LeftMenu user={user} />
      <main>{children}</main>
    </div>
  );
};

export default ProfileLayout;
