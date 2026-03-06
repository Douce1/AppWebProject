// apiClient: 화면/컨텍스트에서 사용하는 단일 진입점.
// 현재는 mockClient 를 사용하고, 추후 환경 변수로 httpClient 로 교체할 수 있습니다.

import { mockClient } from './mockClient';
import { httpClient } from './httpClient';

const USE_MOCK = true;

export const apiClient = USE_MOCK ? mockClient : httpClient;

