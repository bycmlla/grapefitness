export const notFoundHandler = (req, res) => {
  res.status(404).json({
    message: 'Rota nao encontrada.'
  });
};

const getDuplicateField = (error) => {
  if (error.fields) {
    return Object.keys(error.fields)[0];
  }

  const duplicateMessage = error.original?.sqlMessage || error.parent?.sqlMessage || '';
  const match = duplicateMessage.match(/key '([^']+)'/);

  if (!match) {
    return null;
  }

  const [, key] = match;
  return key.split('.').pop();
};

const getDuplicateMessage = (error) => {
  const duplicateField = getDuplicateField(error);
  const sqlMessage = error.original?.sqlMessage || error.parent?.sqlMessage || '';

  if (duplicateField === 'sku' && sqlMessage.includes('produto_variacoes')) {
    return 'Ja existe uma variacao com este SKU. Use outro SKU para a variacao.';
  }

  if (duplicateField === 'sku') {
    return 'Ja existe um produto com este SKU. Use outro SKU para cadastrar o produto.';
  }

  if (duplicateField === 'slug') {
    return 'Ja existe um cadastro com este nome. Altere o nome ou o slug.';
  }

  if (duplicateField) {
    return `Ja existe um cadastro com este ${duplicateField}.`;
  }

  return 'Ja existe um cadastro com estes dados.';
};

export const errorHandler = (error, req, res, next) => {
  const isDuplicateError = error.name === 'SequelizeUniqueConstraintError'
    || error.original?.code === 'ER_DUP_ENTRY'
    || error.parent?.code === 'ER_DUP_ENTRY';
  const status = isDuplicateError ? 409 : error.status || 500;
  const message = isDuplicateError ? getDuplicateMessage(error) : error.message;

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    message: message || 'Erro interno do servidor.',
    details: error.details || undefined
  });
};
