export const categories = [
  {
    id: 'leggings',
    name: 'Leggings',
    description: 'Modelagens firmes para treino e rotina.',
    showOnHome: true
  },
  {
    id: 'tops',
    name: 'Tops',
    description: 'Sustentacao para diferentes intensidades.',
    showOnHome: true
  },
  {
    id: 'shorts',
    name: 'Shorts',
    description: 'Pecas leves para movimento livre.',
    showOnHome: true
  },
  {
    id: 'macacoes',
    name: 'Macacoes',
    description: 'Visual unico com conforto de treino.',
    showOnHome: true
  },
  {
    id: 'conjuntos',
    name: 'Conjuntos',
    description: 'Combinacoes prontas para usar.',
    showOnHome: true
  },
  {
    id: 'promocoes',
    name: 'Promocoes',
    description: 'Selecao especial com preco menor.',
    showOnHome: true
  },
  {
    id: 'uva-shoes',
    name: 'Uva Shoes',
    description: 'Calcados para completar o look fitness.',
    showOnHome: false
  }
];

export const products = [
  {
    id: 'legging-cintura-alta-uva',
    slug: 'legging-cintura-alta-uva',
    name: 'Legging Cintura Alta Uva',
    description: 'Legging com cintura alta, compressao confortavel e toque macio para treinos e uso diario.',
    categoryId: 'leggings',
    price: 139.9,
    salePrice: 119.9,
    sku: 'UVA-LEG-001',
    stock: 24,
    featured: true,
    isNew: false,
    onSale: true,
    imageTone: 'grape',
    sizes: ['P', 'M', 'G', 'GG'],
    colors: ['Uva', 'Preto', 'Rosa']
  },
  {
    id: 'top-alta-sustentacao-lima',
    slug: 'top-alta-sustentacao-lima',
    name: 'Top Alta Sustentacao Lima',
    description: 'Top com alcas firmes, bojo removivel e tecido respiravel para treinos intensos.',
    categoryId: 'tops',
    price: 89.9,
    salePrice: null,
    sku: 'UVA-TOP-010',
    stock: 18,
    featured: true,
    isNew: true,
    onSale: false,
    imageTone: 'lime',
    sizes: ['P', 'M', 'G'],
    colors: ['Lima', 'Uva', 'Branco']
  },
  {
    id: 'shorts-run-pink',
    slug: 'shorts-run-pink',
    name: 'Shorts Run Pink',
    description: 'Shorts de secagem rapida com cos firme, ideal para corrida, musculacao e caminhada.',
    categoryId: 'shorts',
    price: 79.9,
    salePrice: 69.9,
    sku: 'UVA-SHO-004',
    stock: 32,
    featured: true,
    isNew: false,
    onSale: true,
    imageTone: 'pink',
    sizes: ['P', 'M', 'G', 'GG'],
    colors: ['Pink', 'Preto']
  },
  {
    id: 'macacao-performance-noite',
    slug: 'macacao-performance-noite',
    name: 'Macacao Performance Noite',
    description: 'Macacao com recortes anatomicos, elasticidade e acabamento que valoriza a silhueta.',
    categoryId: 'macacoes',
    price: 189.9,
    salePrice: null,
    sku: 'UVA-MAC-002',
    stock: 11,
    featured: true,
    isNew: true,
    onSale: false,
    imageTone: 'ink',
    sizes: ['P', 'M', 'G'],
    colors: ['Preto', 'Uva']
  },
  {
    id: 'conjunto-energia-uva',
    slug: 'conjunto-energia-uva',
    name: 'Conjunto Energia Uva',
    description: 'Conjunto de top e legging com visual marcante e tecido de media compressao.',
    categoryId: 'conjuntos',
    price: 229.9,
    salePrice: 199.9,
    sku: 'UVA-CON-003',
    stock: 15,
    featured: false,
    isNew: true,
    onSale: true,
    imageTone: 'mixed',
    sizes: ['P', 'M', 'G'],
    colors: ['Uva com Lima', 'Pink com Preto']
  },
  {
    id: 'camiseta-dry-fit-basic',
    slug: 'camiseta-dry-fit-basic',
    name: 'Camiseta Dry Fit Basic',
    description: 'Camiseta leve, fresca e versatil para treinos ao ar livre ou academia.',
    categoryId: 'camisetas',
    price: 69.9,
    salePrice: null,
    sku: 'UVA-CAM-008',
    stock: 28,
    featured: false,
    isNew: false,
    onSale: false,
    imageTone: 'soft',
    sizes: ['P', 'M', 'G', 'GG'],
    colors: ['Branco', 'Preto', 'Uva']
  }
];

export const pickupStores = [
  {
    id: 'conceicao',
    name: 'Conceicao',
    address: 'Avenida Ayrton Senna, 5302, Conceicao, Feira de Santana - BA, 44056-000'
  },
  {
    id: 'geminiano',
    name: 'Centro - Prof. Geminiano Costa',
    address: 'R. Prof. Geminiano Costa, 65 - Centro, Feira de Santana - BA, 44001-120'
  },
  {
    id: 'barao',
    name: 'Centro - Barao do Rio Branco',
    address: 'R. Barao do Rio Branco, 1686 - Centro, Feira de Santana - BA, 44001-232'
  }
];

export const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
