/**
 * API Service — HTTP calls to our Node.js backend
 */
import { SERVER_URL } from '../utils/constants';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = SERVER_URL;
  }

  /** Update server URL at runtime (e.g., after user config) */
  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`[API] ${options.method || 'GET'} ${url}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data as T;
    } catch (error) {
      console.error(`[API] Error: ${endpoint}`, error);
      throw error;
    }
  }

  // ─── Token Registration ────────────────────────────────

  async registerToken(userId: string, token: string, tokenType: string) {
    return this.request('/api/register-token', {
      method: 'POST',
      body: JSON.stringify({ userId, token, tokenType }),
    });
  }

  // ─── Call Management ───────────────────────────────────

  async initiateCall(callerId: string, calleeId: string) {
    return this.request<{ serverCallId: string }>('/api/initiate-call', {
      method: 'POST',
      body: JSON.stringify({ callerId, calleeId }),
    });
  }

  async answerCall(serverCallId: string) {
    return this.request('/api/answer', {
      method: 'POST',
      body: JSON.stringify({ serverCallId }),
    });
  }

  async declineCall(serverCallId: string) {
    return this.request('/api/decline', {
      method: 'POST',
      body: JSON.stringify({ serverCallId }),
    });
  }

  async hangupCall(serverCallId: string) {
    return this.request('/api/hangup', {
      method: 'POST',
      body: JSON.stringify({ serverCallId }),
    });
  }

  // ─── User Discovery ────────────────────────────────────

  async getUsers() {
    return this.request<{ users: Array<{ userId: string; online: boolean }> }>(
      '/api/users'
    );
  }
}

export const api = new ApiService();
