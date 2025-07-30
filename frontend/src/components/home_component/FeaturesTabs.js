"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const FeaturesTabs = ({ locale }) => {
  const { t } = useTranslation('feature');
  const [activeTab, setActiveTab] = useState('features-tab-1');
  const [features, setFeatures] = useState([]);

  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
    const loaded = i18n.getResource(locale, 'feature');
    if (Array.isArray(loaded)) {
      setFeatures(loaded);
    }
  }, [locale]);

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
                  <img src={feature.image} alt="" className="img-fluid rounded-image" />
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
