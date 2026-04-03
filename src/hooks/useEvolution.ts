import { useState, useCallback } from 'react';
import { evolutionService } from '../services/evolutionApi';

export function useEvolution() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createInstance = useCallback(async (instanceName: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await evolutionService.createInstance(instanceName);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const listInstances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await evolutionService.listInstances();
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (instanceName: string, number: string, message: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await evolutionService.sendMessage(instanceName, number, message);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMessages = useCallback(async (instanceName: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await evolutionService.getMessages(instanceName);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getContacts = useCallback(async (instanceName: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await evolutionService.getContacts(instanceName);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createInstance,
    listInstances,
    sendMessage,
    getMessages,
    getContacts
  };
}
