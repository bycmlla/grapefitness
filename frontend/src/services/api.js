import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3333/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('uva_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const getApiMessage = (error) =>
  error.response?.data?.message || 'Nao foi possivel concluir a operacao.';

