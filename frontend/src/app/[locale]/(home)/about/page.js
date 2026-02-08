// app/[locale]/(home)/about/page.js

// NOT: Eğer projenizde "@/..." alias'ı yoksa, bu importları relative path'e çevirin.
// Örn: "../../../../tr/home/pages/about/about.json"
import tr from "@/locales/tr/home/pages/about.json";
import en from "@/locales/en/home/pages/about.json";
import Image from "next/image";

export const metadata = {
  title: "Whaleer — About",
  description:
    "Learn about Whaleer: the platform to create, test, and run algorithmic trading strategies.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "Whaleer — About",
    description:
      "Learn about Whaleer: the platform to create, test, and run algorithmic trading strategies.",
    url: "/about",
    type: "article"
  }
};

// Statik cache (opsiyonel)
export const revalidate = 86400; // 24 saat

export default async function AboutPage(props) {
  const params = await props.params;
  const locale = (params?.locale || "tr").toLowerCase();
  const dict = locale === "en" ? en : tr;

  // JSON-LD: Organization + AboutPage (opsiyonel ama faydalı)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": dict.title,
    "mainEntity": {
      "@type": "Organization",
      "name": "Whaleer",
      // Eğer logonuzu public'e koyduysanız:
      "logo": "/img/logo5.png",
      "description":
        `${dict.introduction?.content || ""} ${dict.story?.content || ""}`.slice(0, 500) // kısa bir özet
    }
  };

  return (
    <section
      id="about-page"
      className="pt-24 pb-24 home-hard-gradient-2 text-neutral-100 min-h-screen"
    >
      <div className="container mx-auto px-4">

        {/* Sayfa Başlığı */}
        <div className="flex items-center justify-center gap-4 mb-12 mt-12 bg-zinc-950/50 py-6 rounded-2xl border border-white/10 hover:border-white/20 transition-colors" data-aos="fade-up">
          <h1 className="text-4xl md:text-5xl gap-4 font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-stone-400">
            {dict.title}
          </h1>
        </div>

        <div className="w-full space-y-8">

          {/* 
            ---------------------------------------------------------------------------
            1. BÖLÜM: TANITIM (Introduction)
            Bu bölüme platformun genel tanıtımını, ne yaptığını ve kimler için olduğunu yazın.
            Mevcut içerik: "Finansal Teknolojide Yeni Bir Çağ..."
            ---------------------------------------------------------------------------
          */}
          <section id="introduction" data-aos="fade-up">
            <div className="bg-zinc-950/50 border border-white/10 rounded-2xl p-8 backdrop-blur-sm hover:border-white/20 transition-colors">
              <h2 className="text-3xl font-bold mb-6 text-gray-200 border-l-4 border-blue-500 pl-4">
                {dict.introduction?.title || "Tanıtım"}
              </h2>
              <div className="text-lg text-stone-400 px-52 leading-relaxed space-y-4">
                {/* Metin Buraya Gelecek */}
                <p>{dict.introduction?.content}</p>
                {/* 
                   Buraya eklemek istediğiniz diğer paragrafları ekleyebilirsiniz:
                   <p>Site ne yapar? Kimler için? Amacı nedir?</p> 
                */ }
              </div>
            </div>
          </section>

          {/* 
            ---------------------------------------------------------------------------
            2. BÖLÜM: HİKAYE / NEDEN KURULDU? (Story)
            Bu bölüme kuruluş hikayesini, hangi problemden doğduğunu ve kurucunun amacını yazın.
            Mevcut içerik: "Günümüzün hızla değişen finansal ortamında..."
            ---------------------------------------------------------------------------
          */}
          <section id="story" data-aos="fade-up" data-aos-delay="100">
            <div className="bg-zinc-950/50 border border-white/10 rounded-2xl p-8 backdrop-blur-sm hover:border-white/20 transition-colors">
              <h2 className="text-3xl font-bold mb-6 text-gray-200 border-l-4 border-purple-500 pl-4">
                {dict.story?.title || "Hikayemiz"}
              </h2>
              <div className="text-lg text-stone-400 px-52 leading-relaxed space-y-4">
                {/* Metin Buraya Gelecek */}
                <p>{dict.story?.content}</p>
                {/* 
                   Buraya eklemek istediğiniz diğer paragrafları ekleyebilirsiniz:
                   <p>Hangi problemden doğdu? İlk fikir nasıl ortaya çıktı?</p> 
                */ }
              </div>
            </div>
          </section>

          {/* 
            ---------------------------------------------------------------------------
            3. BÖLÜM: VİZYON & MİSYON (Vision & Mission)
            Bu bölüme projenin gelecek hedeflerini ve misyonunu yazın.
            Mevcut içerik: "Vizyonumuz: Bireysel Yatırımcıyı Kurumsal Güce Ulaştırmak..."
            ---------------------------------------------------------------------------
          */}
          <section id="vision" data-aos="fade-up" data-aos-delay="200">
            <div className="bg-zinc-950/50 border border-white/10 rounded-2xl p-8 backdrop-blur-sm hover:border-white/20 transition-colors flex flex-col gap-12">

              {/* VİZYON */}
              <div>
                <h2 className="text-3xl font-bold mb-6 text-gray-200 border-l-4 border-cyan-500 pl-4">
                  {dict.vision_mission?.title1}
                </h2>
                <div className="text-lg px-52 text-stone-400 leading-relaxed">
                  <p>{dict.vision_mission?.content1}</p>
                </div>
              </div>

              {/* MİSYON */}
              <div>
                <h2 className="text-3xl font-bold mb-6 text-gray-200 border-l-4 border-purple-500 pl-4">
                  {dict.vision_mission?.title2}
                </h2>
                <div className="text-lg px-52 text-stone-400 leading-relaxed">
                  <p>{dict.vision_mission?.content2}</p>
                </div>
              </div>

              {/* MADDELER (ARTICLES) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white/5 p-6 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <p className="text-stone-300 leading-relaxed text-base">
                      {dict.vision_mission?.[`article${i}`]}
                    </p>
                  </div>
                ))}
              </div>

            </div>
          </section>

          {/* 
            ---------------------------------------------------------------------------
            4. BÖLÜM: EKİP (Team)
            Bu bölüme kurucu ve ekip üyelerini ekleyin. Fotoğraf ve kısa bio önemlidir.
            Şu an örnek (mock) veri kullanıldı.
            ---------------------------------------------------------------------------
          */}
          <section id="team" data-aos="fade-up" data-aos-delay="300">
            <div className="bg-zinc-950/50 border border-white/10 rounded-2xl p-10 backdrop-blur-sm hover:border-white/20 transition-colors">
              <h2 className="text-3xl font-bold mb-12 text-white border-l-4 border-green-500 pl-4">
                {dict.team?.title || "Ekip"}
              </h2>

              {/* Ekip Grid - Flex ile ortalanmış yapı */}
              <div className="flex flex-wrap justify-center gap-8">
                {dict.team?.list?.map((member, index) => (
                  <div
                    key={index}
                    className="group relative bg-white/5 rounded-xl p-8 border border-white/5 hover:border-white/20 transition-all text-center w-full md:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] max-w-sm flex flex-col items-center"
                  >
                    {/* Büyütülmüş Profil Fotoğrafı */}
                    <div className="w-32 h-32 mb-6 rounded-full bg-neutral-800 overflow-hidden border-4 border-neutral-700 group-hover:border-white/50 transition-colors shadow-lg relative">
                      {member.image ? (
                        <Image
                          src={member.image}
                          alt={member.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl">👤</div>
                      )}
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-1">{member.name}</h3>
                    <p className="text-sm font-medium text-blue-400 mb-4 uppercase tracking-wider">{member.role}</p>

                    <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
                      {member.bio}
                    </p>

                    {/* Sosyal Medya Linkleri */}
                    <div className="mt-auto flex gap-4 justify-center">
                      {member.linkedin && (
                        <a
                          href={member.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-white/5 rounded-lg hover:bg-white/20 hover:text-blue-500 transition-all text-neutral-400"
                          title="LinkedIn"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                          </svg>
                        </a>
                      )}
                      {member.instagram && (
                        <a
                          href={member.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-white/5 rounded-lg hover:bg-white/20 hover:text-pink-500 transition-all text-neutral-400"
                          title="Instagram"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.468 2.53c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-12 text-center text-neutral-400 italic">
                {dict.team?.description}
              </p>
            </div>
          </section>

          {/* 
            ---------------------------------------------------------------------------
            5. BÖLÜM: PLATFORM NASIL ÇALIŞIR? (How it Works)
            Bu bölüme kullanıcının izleyeceği adımları özetleyin.
            ---------------------------------------------------------------------------
          */}
          <section id="how-it-works" data-aos="fade-up" data-aos-delay="400">
            <div className="bg-zinc-950/50 border border-white/10 rounded-2xl p-8 backdrop-blur-sm hover:border-white/20 transition-colors">
              <h2 className="text-3xl font-bold mb-8 text-white border-l-4 border-orange-500 pl-4">
                {dict.how_it_works?.title || "Nasıl Çalışır?"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-1 px-40 gap-6">
                {dict.how_it_works?.steps?.map((step, index) => (
                  <div key={index} className="relative p-6 bg-white/5 rounded-xl border border-white/5">
                    <div className="absolute -top-4 -left-4 w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center border border-white/10 text-white font-bold text-lg">
                      {index + 1}
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2 mt-2">{step.title}</h3>
                    <p className="text-neutral-400 text-sm">
                      {step.desc}
                    </p>
                    {/* Yorum: Buraya detay ekleyebilirsiniz */}
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* JSON-LD (SSR olarak HTML'e gömülür) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
