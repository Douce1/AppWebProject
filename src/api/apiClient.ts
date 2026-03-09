// apiClient: 화면/컨텍스트에서 사용하는 단일 진입점.
// 현재는 실제 백엔드(httpClient)만 사용합니다.
import { httpClient } from './httpClient';

export const apiClient = httpClient;

