import api from './api';

export const weatherService = {
  getWeather: async (district: string) => {
    try {
      const response = await api.get('/weather/', {
        params: { district }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching weather:', error);
      throw error;
    }
  }
};
