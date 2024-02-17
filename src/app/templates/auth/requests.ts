/**
 * Session request interface that will be sent to server to create session token
 */
export interface CreateSessionRequest {
  email: string,
  uid: string
}

export interface AuthUserRequest {
  sid: string
}

export interface CheckUserRequest {
  email: string
}
export interface LogoutSpedTransRequest {
  sid: string,
  initials: string
}

export interface ImportOrderRequest {
  sid: string,
  order: string
}
