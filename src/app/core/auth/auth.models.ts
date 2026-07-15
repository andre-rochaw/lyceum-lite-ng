export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  lastLogin: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  /** Formato API: 999.999.999-99 */
  cpf: string;
}

/** Contrato da API real (`AccessTokenDTO`). */
export interface AccessTokenResponse {
  token: string;
}

/** Contrato do mock (`/auth/*`). */
export interface MockAccessTokenResponse {
  accessToken: string;
}
