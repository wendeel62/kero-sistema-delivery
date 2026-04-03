import axios from 'axios';

const API_URL = import.meta.env.VITE_EVOLUTION_API_URL || 'http://evolution-api:8080';
const API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY;

const evolutionAPI = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

export interface Instance {
  instanceName: string;
  status: string;
  qrcode?: string;
}

export interface Message {
  instanceName: string;
  number: string;
  message: string;
}

export const evolutionService = {
  // Instâncias
  async createInstance(instanceName: string): Promise<any> {
    try {
      const response = await evolutionAPI.post('/instance/create', {
        instanceName,
        qrcode: true
      });
      return response.data;
    } catch (error) {
      console.error('Error creating instance:', error);
      throw error;
    }
  },

  async listInstances(): Promise<any> {
    try {
      const response = await evolutionAPI.get('/instance/fetchInstances');
      return response.data;
    } catch (error) {
      console.error('Error listing instances:', error);
      throw error;
    }
  },

  async getInstanceDetails(instanceName: string): Promise<any> {
    try {
      const response = await evolutionAPI.get(`/instance/fetchInstances/${instanceName}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching instance:', error);
      throw error;
    }
  },

  async deleteInstance(instanceName: string): Promise<any> {
    try {
      const response = await evolutionAPI.delete(`/instance/delete/${instanceName}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting instance:', error);
      throw error;
    }
  },

  // Mensagens
  async sendMessage(instanceName: string, number: string, message: string): Promise<any> {
    try {
      const response = await evolutionAPI.post(`/message/sendText/${instanceName}`, {
        number,
        text: message
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  async getMessages(instanceName: string): Promise<any> {
    try {
      const response = await evolutionAPI.get(`/chat/messages/${instanceName}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  },

  // Contatos
  async getContacts(instanceName: string): Promise<any> {
    try {
      const response = await evolutionAPI.get(`/chat/contacts/${instanceName}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching contacts:', error);
      throw error;
    }
  }
};
