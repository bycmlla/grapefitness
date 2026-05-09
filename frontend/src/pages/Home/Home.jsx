import { useEffect, useState } from 'react';
import CategoryPill from '../../components/CategoryPill/CategoryPill.jsx';
import HeroBanner from '../../components/HeroBanner/HeroBanner.jsx';
import ProductCard from '../../components/ProductCard/ProductCard.jsx';
import { api } from '../../services/api.js';
import './Home.css';

const loadProductsForCategory = async (category) => {
  if (Array.isArray(category.products)) {
    return category;
  }

  try {
    const { data } = await api.get('/products', { params: { category: category.slug } });
    return {
      ...category,
      products: data.products || []
    };
  } catch (error) {
    return {
      ...category,
      products: []
    };
  }
};

export default function Home() {
  const [homeCategories, setHomeCategories] = useState([]);
  const [featuredCategories, setFeaturedCategories] = useState([]);
  const visibleHomeCategories = homeCategories.filter((category) => (category.products || []).length > 0);
  const visibleFeaturedCategories = featuredCategories.filter((category) => (
    category.active !== false
  ));

  useEffect(() => {
    let isCurrentRequest = true;

    api.get('/categories/home')
      .then(async ({ data }) => {
        const categoriesWithProducts = await Promise.all(
          (data.categories || []).map(loadProductsForCategory)
        );

        if (!isCurrentRequest) {
          return;
        }

        setHomeCategories(categoriesWithProducts);
        setFeaturedCategories(data.featuredCategories || categoriesWithProducts);
      })
      .catch(() => {
        setHomeCategories([]);
        setFeaturedCategories([]);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, []);

  return (
    <main className="home">
      <HeroBanner />

      <div className="home__shell">
        {visibleFeaturedCategories.length > 0 && (
          <section className="home__section">
            <div className="section-title">
              <h2>Categorias em destaque</h2>
            </div>
            <div className="grid home__category-grid">
              {visibleFeaturedCategories.map((category) => (
                <CategoryPill key={category.id} category={category} />
              ))}
            </div>
          </section>
        )}

        {visibleHomeCategories.map((category) => (
          <section className="home__section" key={category.id}>
            <div className="section-title">
              <h2>{category.name}</h2>
            </div>
            <div className="grid grid--products">
              {(category.products || []).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
