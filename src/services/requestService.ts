import api from './api';

export const requestService = {
  getRequests: async (district: string) => {
    const response = await api.get('/requests/', {
      params: { district }
    });
    return response.data;
  },

  getMyRequests: async () => {
    const response = await api.get('/requests/my');
    return response.data;
  },

  createRequest: async (data: any) => {
    const response = await api.post('/requests/', data);
    return response.data;
  },

  respondToRequest: async (requestId: string, data: any) => {
    const response = await api.post(`/requests/${requestId}/respond`, data);
    return response.data;
  },

  acceptResponse: async (responseId: string) => {
    const response = await api.put(`/requests/responses/${responseId}/accept`);
    return response.data;
  },

  updateRequest: async (requestId: string, data: any) => {
    const response = await api.put(`/requests/${requestId}`, data);
    return response.data;
  },

  deleteRequest: async (requestId: string) => {
    const response = await api.delete(`/requests/${requestId}`);
    return response.data;
  }
};
