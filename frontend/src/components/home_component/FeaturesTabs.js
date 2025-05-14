'use client';
import { useState } from 'react';

const FeaturesTabs = () => {
  const [activeTab, setActiveTab] = useState('features-tab-1');

  const features = [
    {
      id: 'features-tab-1',
      title: 'Strateji oluşturma',
      heading: 'Strateji Oluşturma',
      description: 'İstediğiniz indikatörü kullanabilir, trend takibi yapabilir ve ya fiyat aksiyon kullanarak stratejinizin algoritmasını hazırlayın.',
      image: '/img/str_img.jpeg',
      bullets: [
        'Alım Satım bölgelerini saptayan bir algoritma oluşturun ve koda dökün.',
        'Opsiyonel indikatör ayarını kullanarak backtest de en karlı değerleri saptayın.',
        'Oluşturduğunuz stratejileri daha sonra tekrar düzenleyebilir ve silebilirsiniz.'
      ]
    },
    {
      id: 'features-tab-2',
      title: 'Alım Satım Botları',
      heading: 'Otomatik Alım Satım Botları',
      description: 'Stratejilerinizi robotlara bağlayarak otomatik hale getirin ve varlıklarınızın takibini yapmadan trade edin.',
      image: '/img/bot-img.jpeg',
      bullets: [
        'Kendi alım satım stratejinizi oluşturun.',
        'Strateji oluşturma sayfasından stratejinizi koda dökün.',
        'Backtest sonuçlarını başarılı bulduğunuz stratejilerde botu başlatın ve kar etmeye başlayın.'
      ]
    },
    {
      id: 'features-tab-3',
      title: 'Backtest Yapma',
      heading: 'Backtest Yapma',
      description: 'Oluşturduğunuz stratejilerin geçmişte gösterdiği performanslarını görün stratejinizi bu sonuçlara göre düzenleyip daha karlı hale getirin.',
      image: '/img/bt-img.jpeg',
      bullets: [
        'Oluşturduğunuz stratejiye backtest uygulayın.',
        'Belirli zaman aralıkarındaki kar-zarar durumlarını saptayın.',
        'Komisyon oranı, kaldıraç, TP ve SL noktalarını isteğinize göre düzenleyebilir stratejinizin alım satım noktalarını tarihleriyle görebilirsiniz.'
      ]
    },
    {
      id: 'features-tab-4',
      title: 'İndikatör Çizimi',
      heading: 'İndikatör Ekleme',
      description: 'Sağladığımız hazır indikatörleri grafiklere ekleyebilir dilerseniz kendi imdikatörlerinizi yazabilirsiniz. Osilatörler, Hareketli ortalamalar ve daha fazlasını ekleyebilir ve çizim yapabilirsiniz. Grafik üzerinde istediğiniz teknik analizi uygulayabilirsiniz.',
      image: '/img/ind-img.jpeg',
      bullets: [
        'indikatör ekleyip grafik üzerinde analiz yapın.',
        'İstediğiniz kripto varlıkta ve periyotta analiz yapın',
        'Kaydettiğiniz indikatörleri güncelleyebilirsiniz.'
      ]
    },
    {
      id: 'features-tab-5',
      title: 'Tarama',
      heading: 'Tarama',
      description: 'Oluşturduğunuz stratejilere tarama yaptırıp o an hangi kripto para üzerinde alım ya da satım sinyali verdiğini görebilirsiniz.',
      image: '/img/sift-img.jpeg',
      bullets: [
        'Farklı periyotlarda tarama yaptırabilirsiniz.',
        'Bir önceki mum kapanışında veya o anlık mumda sinyal veren kripto varlıkları görebilirsiniz.'
      ]
    }
  ];

  return (
    <section className="features section mt-16">
      <div className="container">
        <div className="d-flex justify-content-center">
          <ul className="nav nav-tabs">
            {features.map((feature) => (
              <li key={feature.id} className="nav-item">
                <button
                  className={`nav-link ${activeTab === feature.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(feature.id)}
                >
                  <h4>{feature.title}</h4>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="tab-content">
          {features.map((feature) => (
            <div
              key={feature.id}
              className={`tab-pane fade ${activeTab === feature.id ? 'active show' : ''}`}
            >
              <div className="row">
                <div className="col-lg-6 order-2 order-lg-1 mt-3 mt-lg-0 d-flex flex-column justify-content-center">
                  <h3>{feature.heading}</h3>
                  <p className="fst-italic">{feature.description}</p>
                  <ul>
                    {feature.bullets.map((bullet, index) => (
                      <li key={index}>
                        <i className="bi bi-check2-all"></i>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="col-lg-6 order-1 order-lg-2 text-center">
                  <img src={feature.image} alt="" className="img-fluid rounded-image"/>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesTabs;