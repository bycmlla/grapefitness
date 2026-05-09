import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import ProductCard from '../../components/ProductCard/ProductCard.jsx';
import { api } from '../../services/api.js';
import './Products.css';

export default function Products() {
  const { categoryId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('categoria') || '';
  const searchParam = searchParams.get('busca') || '';
  const showNewOnly = searchParams.get('novidades') === 'true';
  const [selectedCategory, setSelectedCategory] = useState(categoryId || categoryParam || 'todos');
  const [search, setSearch] = useState(searchParam);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSelectedCategory(categoryId || categoryParam || 'todos');
    setSearch(searchParam);
  }, [categoryId, categoryParam, searchParam]);

  useEffect(() => {
    api.get('/categories')
      .then(({ data }) => setCategories(data.categories || []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const params = {};

    if (searchParam.trim()) {
      params.search = searchParam.trim();
    }

    if ((categoryId || categoryParam) && selectedCategory !== 'todos') {
      params.category = selectedCategory;
    }

    if (showNewOnly) {
      params.new = 'true';
    }

    setLoading(true);
    api.get('/products', { params })
      .then(({ data }) => setProducts(data.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [categoryId, categoryParam, searchParam, selectedCategory, showNewOnly]);

  const buildFilterParams = (nextSearch = search) => {
    const params = {};

    if (nextSearch.trim()) {
      params.busca = nextSearch.trim();
    }

    if (selectedCategory !== 'todos') {
      params.categoria = selectedCategory;
    }

    if (showNewOnly) {
      params.novidades = 'true';
    }

    return params;
  };

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearch(value);

    if (!value.trim() && searchParam) {
      setSearchParams(buildFilterParams(''), { replace: true });
    }
  };

  const submitFilters = (event) => {
    event.preventDefault();
    setSearchParams(buildFilterParams());
  };

  return (
    <main className="page-shell products-page">
      <div className="page-title">
        <div>
          <h1>Produtos</h1>
          <p>{showNewOnly ? 'Produtos adicionados recentemente.' : 'Busque por categoria, novidade ou promocao.'}</p>
        </div>
      </div>

      <form className="products-page__filters" onSubmit={submitFilters}>
        <label className="products-page__search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Buscar no catalogo"
            value={search}
            onChange={handleSearchChange}
          />
        </label>

        <select
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
          aria-label="Categoria"
        >
          <option value="todos">Todas as categorias</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>{category.name}</option>
          ))}
        </select>

        <button type="submit" className="button">Filtrar</button>
      </form>

      <div className="products-page__count">
        {loading ? 'Carregando produtos...' : `${products.length} produto(s) encontrado(s)`}
      </div>

      <div className="grid grid--products">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </main>
  );
}
