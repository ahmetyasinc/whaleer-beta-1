import NotFoundContent from "@/components/notFound";

export const metadata = {
  title: "Sayfa Bulunamadı",
  description: "Girdiğiniz web sayfası mevcut değil veya kaldırılmış.",
};


export default function NotFound() {
  return <NotFoundContent />;
}
