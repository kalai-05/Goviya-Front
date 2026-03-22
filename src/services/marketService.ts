import api from './api';

export const marketService = {
  getPrices: async (crop?: string) => {
    const response = await api.get('/prices/', {
      params: { crop: crop === 'All' ? undefined : crop }
    });
    return response.data;
  }
};
