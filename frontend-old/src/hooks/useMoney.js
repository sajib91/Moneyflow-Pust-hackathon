import { useState } from 'react';
import { api } from './services/api';
import { useAuth } from './context/AuthContext';

export function useTransfers() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const sendMoney = async (toUserId, amount) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.transfers.send({ toUserId, amount });
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getBalance = async () => {
    try {
      return await api.transfers.balance();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) return [];
    try {
      return await api.transfers.searchUsers(query);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { sendMoney, getBalance, searchUsers, loading, error };
}

export function useRequests() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const createRequest = async (fromUserId, amount) => {
    setLoading(true);
    setError(null);
    try {
      return await api.requests.create({ fromUserId, amount });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getRequests = async (limit, offset) => {
    try {
      return await api.requests.list(limit, offset);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const getPendingRequests = async () => {
    try {
      return await api.requests.pending();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const approveRequest = async (id) => {
    setLoading(true);
    setError(null);
    try {
      return await api.requests.approve(id);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const rejectRequest = async (id) => {
    setLoading(true);
    setError(null);
    try {
      return await api.requests.reject(id);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelRequest = async (id) => {
    setLoading(true);
    setError(null);
    try {
      return await api.requests.cancel(id);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createRequest, getRequests, getPendingRequests, approveRequest, rejectRequest, cancelRequest, loading, error };
}

export function useTransactions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getTransactions = async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      return await api.transactions.list(params);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getTransaction = async (id) => {
    try {
      return await api.transactions.get(id);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { getTransactions, getTransaction, loading, error };
}