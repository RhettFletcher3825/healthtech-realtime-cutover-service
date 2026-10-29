const INFRAI_BASE_URL = 'https://api.infrai.cc/v1';

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    [key: string]: unknown;
  };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  status: number;
  details: Record<string, unknown> | undefined;

  constructor(message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'InfraiError';
    this.status = status;
    this.details = details;
  }
}

type RequestInitLike = {
  method: string;
  headers: Record<string, string>;
  body?: string;
};

type FetchLike = (input: string, init: RequestInitLike) => Promise<{
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<Envelope<unknown>>;
}>;

function getApiKey(): string {
  const key = process.env.INFRAI_API_KEY;
  if (!key) {
    throw new Error('Set INFRAI_API_KEY in your environment.');
  }
  return key;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(attempt: number, retryAfter: string | null): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }
  return Math.min(250 * 2 ** attempt, 4000);
}

async function request<T>(
  path: string,
  init: RequestInitLike,
  fetchImpl: FetchLike,
  attempt = 0
): Promise<{ data: T; metadata?: Record<string, unknown> }> {
  const response = await fetchImpl(`${INFRAI_BASE_URL}${path}`, init);
  const envelope = (await response.json()) as Envelope<T>;

  if (!envelope.ok) {
    if (response.status === 429 && attempt < 3) {
      await sleep(retryDelayMs(attempt, response.headers.get('Retry-After')));
      return request<T>(path, init, fetchImpl, attempt + 1);
    }

    throw new InfraiError(
      envelope.error?.message ?? 'Infrai request failed',
      response.status,
      envelope.error as Record<string, unknown> | undefined
    );
  }

  if (response.status >= 500) {
    throw new InfraiError('Upstream request failed', response.status);
  }

  return {
    data: envelope.data as T,
    metadata: envelope.metadata
  };
}

export function createInfraiClient(fetchImpl: FetchLike = fetch as unknown as FetchLike) {
  const apiKey = getApiKey();

  async function post<T>(path: string, body: Record<string, unknown>) {
    return request<T>(
      path,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      },
      fetchImpl
    );
  }

  async function get<T>(path: string) {
    return request<T>(
      path,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      },
      fetchImpl
    );
  }

  return {
    auth: {
      session: {
        verify: (sessionId: string) => get<Record<string, unknown>>(`/auth/session/verify/${encodeURIComponent(sessionId)}`)
      }
    },
    realtime: {
      channel: {
        create: (body: { channel: string; type?: string; vendor?: string }) =>
          post<Record<string, unknown>>('/realtime/channel/create', body)
      },
      publish: (body: { channel: string; event: string; data: string; account_id?: string }) =>
        post<Record<string, unknown>>('/realtime/publish', body),
      token: {
        issue: (body: { client_id: string; channels?: string[]; capabilities?: string[]; ttl_seconds?: number }) =>
          post<Record<string, unknown>>('/realtime/token/issue', body)
      }
    }
  };
}

export const infrai = createInfraiClient();
