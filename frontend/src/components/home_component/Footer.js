'use client';

const Footer = () => {
  return (
    <footer className="footer text-light">
      <div className="container-fluid">
        <div className="container footer-top py-5">
          <div className="row gy-4 justify-content-between">
            {/* Company Info Column */}
            <div className="col-lg-5 col-md-6 footer-about">
              <a href="/" className="logo d-flex align-items-center text-decoration-none mb-4">
                <img src="/img/logo1.jpg" alt="Logo" className="me-3" style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}/>
                <span className="fs-4 fw-bold text-light">Balina</span>
              </a>
              <div className="footer-contact text-light text-start">
                <p className="mb-2">İstanbul/Maltepe</p>
                <p className="mb-3">Marmara Üni. RTE Külliyesi M4 1. kat tuvaletin karşısındaki cam oda</p>
                <p className="mb-2">
                  <strong>Telefon:</strong>
                  <span className="ms-2">+90 552 285 34 67</span>
                </p>
                <p className="mb-3">
                  <strong>Email:</strong>
                  <span className="ms-2">bilal67bostan67@gmail.com</span>
                </p>
              </div>
              <div className="social-links d-flex gap-3 mt-4">
                <a href="#" className="text-light fs-5">
                  <i className="bi bi-twitter-x"></i>
                </a>
                <a href="#" className="text-light fs-5">
                  <i className="bi bi-facebook"></i>
                </a>
                <a href="#" className="text-light fs-5">
                  <i className="bi bi-instagram"></i>
                </a>
                <a href="#" className="text-light fs-5">
                  <i className="bi bi-linkedin"></i>
                </a>
              </div>
            </div>

            {/* Useful Links Column */}
            <div className="col-lg-2 col-md-2 footer-links">
              <h4 className="fw-bold mb-4 text-light">Faydalı Linkler</h4>
              <ul className="list-unstyled">
                <li className="mb-2 ms-5">
                  <a href="/about" className="text-light text-decoration-none">
                    Hakkında
                  </a>
                </li>
                <li className="mb-2 ms-5">
                  <a href="#" className="text-light text-decoration-none">
                    İletişim
                  </a>
                </li>
                <li className="mb-2 ms-5">
                  <a href="#" className="text-light text-decoration-none">
                    Blog
                  </a>
                </li>
                <li className="mb-2 ms-5">
                  <a href="#" className="text-light text-decoration-none">
                    Forum
                  </a>
                </li>
                <li className="mb-2 ms-5">
                  <a href="#" className="text-light text-decoration-none">
                    Yardım
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Links Column */}
            <div className="col-lg-2 col-md-3 footer-links">
              <h4 className="fw-bold mb-4 text-blue">Diğer Linkler</h4>
              <ul className="list-unstyled">
                <li className="mb-2 ms-5">
                  <a href="#" className="text-light text-decoration-none">
                    Yasal Uyarı
                  </a>
                </li>
                <li className="mb-2 ms-5">
                  <a href="#" className="text-light text-decoration-none">
                    Sık Sorulan Sorular
                  </a>
                </li>
                <li className="mb-2 ms-5">
                  <a href="#" className="text-light text-decoration-none">
                    Topluluk İlkeleri
                  </a>
                </li>
                <li className="mb-2 ms-5">
                  <a href="#" className="text-light text-decoration-none">
                    Kullanım Koşulları
                  </a>
                </li>
                <li className="mb-2 ms-5">
                  <a href="#" className="text-light text-decoration-none">
                    Gizlilik
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;