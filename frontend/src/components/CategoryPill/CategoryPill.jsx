import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import './CategoryPill.css';

export default function CategoryPill({ category }) {
  return (
    <Link className="category-pill" to={`/categoria/${category.slug || category.id}`}>
      <span>{category.name}</span>
      <small>{category.description}</small>
      <ArrowRight size={17} />
    </Link>
  );
}
