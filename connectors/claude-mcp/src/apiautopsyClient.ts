export type RequestOptions = {
  body?: unknown;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  tokenRequired?: boolean;
};

export class ApiAutopsyClient {
  private readonly baseUrl: URL;
  private readonly token?: string;

  constructor(baseUrl: string, token?: string) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.token = token;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? 'GET';
    const tokenRequired = options.tokenRequired ?? true;
    if (tokenRequired && !this.token) {
      throw new Error('APIAUTOPSY_TOKEN is required for this tool.');
    }

    const response = await fetch(new URL(path, this.baseUrl), {
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      headers: this.headers(options.body !== undefined, tokenRequired),
      method
    });

    if (!response.ok) {
      throw new Error(await toApiError(response));
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  private headers(hasBody: boolean, tokenRequired: boolean): HeadersInit {
    const headers: Record<string, string> = {
      Accept: 'application/json'
    };
    if (hasBody) {
      headers['Content-Type'] = 'application/json';
    }
    if (tokenRequired && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }
}

export function encodeSegment(value: string): string {
  if (!value.trim()) {
    throw new Error('Path parameter cannot be empty.');
  }
  return encodeURIComponent(value);
}

export function formatResult(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

function normalizeBaseUrl(value: string): URL {
  if (!value.trim()) {
    throw new Error('APIAUTOPSY_BASE_URL is required.');
  }
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('APIAUTOPSY_BASE_URL must use http or https.');
  }
  if (!url.pathname.endsWith('/')) {
    url.pathname = `${url.pathname}/`;
  }
  return url;
}

async function toApiError(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) {
    return `APIAutopsy API failed with HTTP ${response.status}.`;
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    return `APIAutopsy API failed with HTTP ${response.status}: ${JSON.stringify(parsed)}`;
  } catch {
    return `APIAutopsy API failed with HTTP ${response.status}: ${text.slice(0, 500)}`;
  }
}
