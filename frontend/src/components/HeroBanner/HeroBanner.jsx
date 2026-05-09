import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import banner1 from '../../assets/banner1.png';
import banner1Mobile from '../../assets/banner1_mobile.png';
import banner2 from '../../assets/banner2.png';
import banner2Mobile from '../../assets/banner2_mobile.png';
import banner3 from '../../assets/banner3.png';
import banner3Mobile from '../../assets/banner3_mobile.png';
import './HeroBanner.css';

const banners = [
  {
    desktop: banner1,
    mobile: banner1Mobile,
    alt: 'Banner da Uva Moda Fitness',
  },
  {
    desktop: banner2,
    mobile: banner2Mobile,
    alt: 'Banner promocional da Uva Moda Fitness',
  },
  {
    desktop: banner3,
    mobile: banner3Mobile,
    alt: 'Banner de colecao da Uva Moda Fitness',
  },
];

export default function HeroBanner() {
  const [activeBanner, setActiveBanner] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveBanner((currentBanner) => (currentBanner + 1) % banners.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  function changeBanner(direction) {
    setActiveBanner((currentBanner) => (
      (currentBanner + direction + banners.length) % banners.length
    ));
  }

  return (
    <section className="hero-banner" aria-label="Banners da Uva Moda Fitness">
      <div
        className="hero-banner__track"
        style={{ transform: `translateX(-${activeBanner * 100}%)` }}
      >
        {banners.map((banner) => (
          <picture className="hero-banner__slide" key={banner.desktop}>
            <source media="(max-width: 720px)" srcSet={banner.mobile} />
            <img src={banner.desktop} alt={banner.alt} />
          </picture>
        ))}
      </div>

      <button
        className="hero-banner__control hero-banner__control--prev"
        type="button"
        onClick={() => changeBanner(-1)}
        aria-label="Banner anterior"
      >
        <ChevronLeft size={28} aria-hidden="true" />
      </button>
      <button
        className="hero-banner__control hero-banner__control--next"
        type="button"
        onClick={() => changeBanner(1)}
        aria-label="Proximo banner"
      >
        <ChevronRight size={28} aria-hidden="true" />
      </button>
    </section>
  );
}
