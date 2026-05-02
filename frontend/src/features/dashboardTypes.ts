import type { ApiRequest, HttpMethod } from '../types/domain';

export type AppPage = 'requests' | 'scheduler' | 'flows' | 'settings';
export type BuilderTab = 'params' | 'headers' | 'body' | 'auth';
export type RequestBodyMode = 'none' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary' | 'graphql';
export type RawBodyFormat = 'JSON' | 'Text';

export interface RequestDraft {
  id: string;
  collectionId: string;
  name: string;
  method: HttpMethod;
  url: string;
  params: string;
  headers: string;
  bodyMode: RequestBodyMode;
  rawBodyFormat: RawBodyFormat;
  body: string;
  authType: ApiRequest['authType'];
  authToken: string;
  apiKeyHeader: string;
  apiKeyValue: string;
  basicUsername: string;
  basicPassword: string;
}

export function emptyRequestDraft(collectionId = ''): RequestDraft {
  return {
    id: '',
    collectionId,
    name: 'Untitled Request',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/todos/1',
    params: '{}',
    headers: '{\n  "Accept": "application/json"\n}',
    bodyMode: 'raw',
    rawBodyFormat: 'JSON',
    body: '{}',
    authType: 'NONE',
    authToken: '',
    apiKeyHeader: 'X-API-Key',
    apiKeyValue: '',
    basicUsername: '',
    basicPassword: ''
  };
}
