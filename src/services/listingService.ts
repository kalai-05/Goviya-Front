import api from './api';

export const listingService = {
  getListings: async (district: string, crop?: string) => {
    const response = await api.get('/listings/', {
      params: { 
        district,
        ...(crop && { crop })
      }
    });
    return response.data;
  },

  getListing: async (id: string) => {
    const response = await api.get(`/listings/${id}`);
    return response.data;
  },
  
  createListing: async (data: any) => {
    const response = await api.post('/listings/', data);
    return response.data;
  },

  deleteListing: async (id: string) => {
    const response = await api.delete(`/listings/${id}`);
    return response.data;
  },

  updateListing: async (id: string, data: any) => {
    const response = await api.put(`/listings/${id}`, data);
    return response.data;
  },

  getMyListings: async () => {
    const response = await api.get('/listings/my');
    return response.data;
  }
};
