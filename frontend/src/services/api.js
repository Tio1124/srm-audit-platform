/**
 * services/api.js — Centralized API calls (FIXED)
 * Perbaikan:
 * - Fix typo: nist_function → nistFunction
 * - Fix AI calls: pastikan semua field dikirim dengan benar
 * - Tambahan: helper untuk cek status AI
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60 detik untuk AI calls yang butuh lebih lama
  headers: { 'Content-Type': 'application/json' }
});

// ── Interceptors ──────────────────────────────────────────

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════

export const authAPI = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),
  register: (userData) =>
    api.post('/auth/register', userData),
  getMe: () =>
    api.get('/auth/me'),
  listUsers: () =>
    api.get('/auth/users'),
};

// ════════════════════════════════════════════
// ORGANIZATION
// ════════════════════════════════════════════

export const orgAPI = {
  create: (data) => api.post('/organizations', data),
  list: () => api.get('/organizations'),
  get: (id) => api.get(`/organizations/${id}`),
};

// ════════════════════════════════════════════
// ASSETS
// ════════════════════════════════════════════

export const assetAPI = {
  create: (data) => api.post('/assets', data),
  list: (orgId = null) =>
    api.get('/assets', { params: orgId ? { organization_id: orgId } : {} }),
  get: (id) => api.get(`/assets/${id}`),
  delete: (id) => api.delete(`/assets/${id}`),
};

// ════════════════════════════════════════════
// VULNERABILITY & RISK
// ════════════════════════════════════════════

export const vulnAPI = {
  list: (category = null) =>
    api.get('/vulnerabilities', { params: category ? { category } : {} }),
  categories: () =>
    api.get('/vulnerabilities/categories'),
};

export const riskAPI = {
  assess: (data) => api.post('/risk/assess', data),
  getAssetRisk: (assetId) => api.get(`/risk/asset/${assetId}`),
  getRiskMatrix: (orgId) => api.get(`/risk/matrix/${orgId}`),
  deleteMapping: (id) => api.delete(`/risk/mapping/${id}`),
};

// ════════════════════════════════════════════
// AUDIT
// ════════════════════════════════════════════

export const auditAPI = {
  createAssignment: (data) =>
    api.post('/audits', data),

  listAssignments: () =>
    api.get('/audits'),

  // FIX: typo nist_function → nistFunction (parameter name consistent)
  getChecklist: (auditId, nistFunction = null) =>
    api.get(`/audits/${auditId}/checklist`, {
      params: nistFunction ? { nist_function: nistFunction } : {}
    }),

  updateChecklistItem: (itemId, data) =>
    api.put(`/audits/checklist/${itemId}`, data),

  uploadEvidence: (itemId, file, description = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', description);
    return api.post(`/audits/checklist/${itemId}/evidence`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  listEvidence: (itemId) =>
    api.get(`/audits/checklist/${itemId}/evidence`),

  getCompliance: (auditId) =>
    api.get(`/audits/${auditId}/compliance`),

  generateFindings: (auditId) =>
    api.post(`/audits/${auditId}/findings/auto-generate`),

  getFindings: (auditId) =>
    api.get(`/audits/${auditId}/findings`),
};

// ════════════════════════════════════════════
// AI — FIXED: semua field dikirim dengan benar
// ════════════════════════════════════════════

export const aiAPI = {
  /**
   * Cek apakah AI sudah terkonfigurasi dengan benar.
   * Buka http://localhost:8000/ai/status untuk detail.
   */
  checkStatus: () =>
    api.get('/ai/status'),

  /**
   * Vulnerability Explainer — Module 10D
   * Menjelaskan kerentanan ke manajemen non-teknis.
   */
  explainVulnerability: (vulnerabilityName, query, organizationName = '') =>
    api.post('/ai/explain-vulnerability', {
      query: query || `Jelaskan ${vulnerabilityName}`,         // pastikan tidak kosong
      vulnerability_name: vulnerabilityName || null,
      organization_name: organizationName || null,
      context: 'vulnerability'
    }),

  /**
   * Audit Advisor — Module 10A
   * Saran teknis seputar audit NIST CSF.
   */
  auditAdvice: (query) =>
    api.post('/ai/audit-advice', {
      query: query,
      context: 'audit'
    }),

  /**
   * Control Recommendation — Module 10C
   * Rekomendasi langkah mitigasi.
   */
  recommendControls: (query, vulnerabilityName = '', organizationName = '') =>
    api.post('/ai/recommend-controls', {
      query: query,
      vulnerability_name: vulnerabilityName || null,
      organization_name: organizationName || null,
      context: 'recommendation'
    }),

  /**
   * Executive Summary Generator — Module 10B
   */
  generateExecSummary: (auditId) =>
    api.post(`/ai/generate-executive-summary/${auditId}`),

  /**
   * General Chat — Module 10 (ARIA)
   */
  chat: (query) =>
    api.post('/ai/chat', {
      query: query,
      context: 'general'
    }),
};

// ════════════════════════════════════════════
// REPORTS
// ════════════════════════════════════════════

export const reportAPI = {
  downloadPDF: async (auditId) => {
    const response = await api.get(`/reports/audit/${auditId}/pdf`, {
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Audit_Report_${auditId}_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};

export default api;
