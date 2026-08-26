import {
  DashboardSummary,
  RecoveryCase,
  RecoveryCaseDetail,
  AnalyzeResponse,
  ExecuteResponse,
  AuditLog,
  Payment,
  Customer,
  User,
  LoginResponse,
  NotificationListResponse,
  NotificationItem,
  SearchResponse,
  RecoveryPressure,
  FatigueAssessment,
  TransactionRisk,
  StrategySimulationResponse,
  GuardrailsOverviewResponse,
  AnalyticsOverview,
  DemoScenario
} from '../types';

function resolveApiBase(): string {
  let envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  
  // If empty or default fallback, check if we can safely infer cloud backend
  if (!envUrl || envUrl === '/api' || envUrl === '') {
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;
      if (hostname.includes('revenueai-web.onrender.com')) {
        return 'https://revenueai-api.onrender.com/api';
      }
      if (hostname.endsWith('.onrender.com') && hostname.includes('-web.')) {
        return `https://${hostname.replace('-web.', '-api.')}/api`;
      }
    }
    return '/api';
  }

  let cleanUrl = envUrl.replace(/\/+$/, '');

  // Prepend protocol if host was provided without scheme (e.g. from Render host reference)
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('/')) {
    const isLocal = cleanUrl.startsWith('localhost') || cleanUrl.startsWith('127.0.0.1');
    cleanUrl = `${isLocal ? 'http://' : 'https://'}${cleanUrl}`;
  }

  if (cleanUrl === '/api' || cleanUrl.endsWith('/api')) {
    return cleanUrl;
  }
  return `${cleanUrl}/api`;
}

const API_BASE = resolveApiBase();
const TOKEN_KEY = 'revenueai_auth_token';
const USER_KEY = 'revenueai_auth_user';

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string, remember = false): void {
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  },
  getUser(): User | null {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setUser(user: User, remember = false): void {
    const raw = JSON.stringify(user);
    if (remember) {
      localStorage.setItem(USER_KEY, raw);
    } else {
      sessionStorage.setItem(USER_KEY, raw);
    }
  },
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }
};

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: any = null;

  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      authStorage.clear();
    }
    const detail =
      data?.detail ||
      (text && text.length < 200 && !text.trim().startsWith('<') ? text : null) ||
      res.statusText ||
      `Request failed with status ${res.status}`;
    throw new Error(detail);
  }

  if (data === null) {
    if (res.status === 204 || res.headers.get('content-length') === '0' || !text.trim()) {
      return {} as T;
    }
    throw new Error(`API server returned non-JSON response (status ${res.status})`);
  }

  return data as T;
}

function getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders
  };
  const token = authStorage.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Authentication
  async login(email: string, password: string, rememberMe = false): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, remember_me: rememberMe })
    });
    const data = await handleResponse<LoginResponse>(res);
    authStorage.setToken(data.token, rememberMe);
    authStorage.setUser(data.user, rememberMe);
    return data;
  },

  async register(name: string, email: string, password: string, rememberMe = false): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, remember_me: rememberMe })
    });
    const data = await handleResponse<LoginResponse>(res);
    authStorage.setToken(data.token, rememberMe);
    authStorage.setUser(data.user, rememberMe);
    return data;
  },

  async googleSignIn(credential: string, rememberMe = false): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, remember_me: rememberMe })
    });
    const data = await handleResponse<LoginResponse>(res);
    authStorage.setToken(data.token, rememberMe);
    authStorage.setUser(data.user, rememberMe);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getHeaders()
      });
    } catch (e) {
      console.warn('Backend logout warning:', e);
    } finally {
      authStorage.clear();
    }
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    const user = await handleResponse<User>(res);
    authStorage.setUser(user, true);
    return user;
  },

  async getDemoCredentials(): Promise<{ demo_email: string; role: string; project: string }> {
    const res = await fetch(`${API_BASE}/auth/demo-credentials`);
    return handleResponse(res);
  },

  // Universal Search
  async search(query: string): Promise<SearchResponse> {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`, {
      headers: getHeaders()
    });
    return handleResponse<SearchResponse>(res);
  },

  // Notifications
  async getNotifications(): Promise<NotificationListResponse> {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getHeaders()
    });
    return handleResponse<NotificationListResponse>(res);
  },

  async markNotificationRead(id: string): Promise<NotificationItem> {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse<NotificationItem>(res);
  },

  async markAllNotificationsRead(): Promise<{ message: string; updated_count: number }> {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE}/dashboard/summary`, {
      headers: getHeaders()
    });
    return handleResponse<DashboardSummary>(res);
  },

  // Analytics
  async getAnalytics(): Promise<AnalyticsOverview> {
    const res = await fetch(`${API_BASE}/analytics`, {
      headers: getHeaders()
    });
    return handleResponse<AnalyticsOverview>(res);
  },

  // Guardrails Overview
  async getGuardrails(): Promise<GuardrailsOverviewResponse> {
    const res = await fetch(`${API_BASE}/guardrails`, {
      headers: getHeaders()
    });
    return handleResponse<GuardrailsOverviewResponse>(res);
  },

  // Audit Trail
  async getAuditTrail(params?: { case_id?: string; event_type?: string; actor?: string; limit?: number; offset?: number }): Promise<AuditLog[]> {
    const query = new URLSearchParams();
    if (params?.case_id) query.append('case_id', params.case_id);
    if (params?.event_type) query.append('event_type', params.event_type);
    if (params?.actor) query.append('actor', params.actor);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());

    const res = await fetch(`${API_BASE}/audit-trail?${query.toString()}`, {
      headers: getHeaders()
    });
    return handleResponse<AuditLog[]>(res);
  },

  // Recovery Cases
  async getRecoveryCases(params?: { status?: string; priority?: string; search?: string; limit?: number; offset?: number }): Promise<RecoveryCase[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    
    const res = await fetch(`${API_BASE}/recovery-cases?${query.toString()}`, {
      headers: getHeaders()
    });
    return handleResponse<RecoveryCase[]>(res);
  },

  async getRecoveryCase(caseId: string): Promise<RecoveryCaseDetail> {
    const res = await fetch(`${API_BASE}/recovery-cases/${caseId}`, {
      headers: getHeaders()
    });
    return handleResponse<RecoveryCaseDetail>(res);
  },

  async runRecoveryAgent(caseId: string): Promise<import('../types').AgentPipelineResponse> {
    const res = await fetch(`${API_BASE}/recovery-cases/${caseId}/run-agent`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse<import('../types').AgentPipelineResponse>(res);
  },

  async analyzeRecoveryCase(caseId: string): Promise<AnalyzeResponse> {
    const res = await fetch(`${API_BASE}/recovery-cases/${caseId}/analyze`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({})
    });
    return handleResponse<AnalyzeResponse>(res);
  },

  async executeRecoveryCase(caseId: string, actionType?: string): Promise<ExecuteResponse> {
    const res = await fetch(`${API_BASE}/recovery-cases/${caseId}/execute`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ action_type: actionType })
    });
    return handleResponse<ExecuteResponse>(res);
  },

  async getCaseAuditTrail(caseId: string): Promise<AuditLog[]> {
    const res = await fetch(`${API_BASE}/recovery-cases/${caseId}/audit`, {
      headers: getHeaders()
    });
    return handleResponse<AuditLog[]>(res);
  },

  async getCasePressure(caseId: string): Promise<RecoveryPressure> {
    const res = await fetch(`${API_BASE}/recovery-cases/${caseId}/pressure`, {
      headers: getHeaders()
    });
    return handleResponse<RecoveryPressure>(res);
  },

  async getCaseFatigue(caseId: string): Promise<FatigueAssessment> {
    return this.getCasePressure(caseId);
  },

  async getCaseTransactionRisk(caseId: string): Promise<TransactionRisk> {
    const res = await fetch(`${API_BASE}/recovery-cases/${caseId}/transaction-risk`, {
      headers: getHeaders()
    });
    return handleResponse<TransactionRisk>(res);
  },

  async simulateStrategy(caseId: string, strategies?: string[]): Promise<StrategySimulationResponse> {
    const res = await fetch(`${API_BASE}/recovery-cases/${caseId}/simulate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ strategies })
    });
    return handleResponse<StrategySimulationResponse>(res);
  },

  // Payments
  async getPayments(params?: { status?: string; payment_method?: string; limit?: number }): Promise<Payment[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.payment_method) query.append('payment_method', params.payment_method);
    if (params?.limit) query.append('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/payments?${query.toString()}`, {
      headers: getHeaders()
    });
    return handleResponse<Payment[]>(res);
  },

  // Customers
  async getCustomers(params?: { search?: string; consent?: boolean; limit?: number }): Promise<Customer[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.consent !== undefined) query.append('consent', params.consent.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/customers?${query.toString()}`, {
      headers: getHeaders()
    });
    return handleResponse<Customer[]>(res);
  },

  // Demo & Simulation
  async getDemoScenarios(): Promise<DemoScenario[]> {
    const res = await fetch(`${API_BASE}/demo/scenarios`, {
      headers: getHeaders()
    });
    return handleResponse<DemoScenario[]>(res);
  },

  async simulateDemoScenario(scenarioId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/simulate-scenario/${scenarioId}`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async seedDemoData(numCustomers = 100, numPayments = 300, resetExisting = true): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/seed`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        num_customers: numCustomers,
        num_payments: numPayments,
        reset_existing: resetExisting
      })
    });
    return handleResponse(res);
  },

  async simulateFailure(payload?: { customer_id?: string; amount?: number; failure_reason?: string; payment_method?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/simulate-failure`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload || {})
    });
    return handleResponse(res);
  },

  async simulateRecovery(recoveryCaseId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/simulate-recovery`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        recovery_case_id: recoveryCaseId,
        payment_link_paid: true
      })
    });
    return handleResponse(res);
  }
};
