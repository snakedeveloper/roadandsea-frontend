
/**
 * /checkUser reply packet
 */

export interface CheckUserReply {
  result: boolean,
  message: string
}

/**
 * /createSession reply packet
 */

 export interface CreateSessionReply {
  id: number,
  idPrac: number,
  sid: string,
  uid: string,
  firstName: string,
  lastName: string,
  email: string,
  isAdmin: boolean,
  result: boolean
}

/**
 * /authUser reply packet
 */

export interface AuthUserReply {
  uid: string,
  result: boolean
}

/**
 * /LogOutUser reply packet
 */
 export interface LogoutSpedTransReply {
  result: boolean;
}

export interface ImportOrderReply {
  result: boolean;
  message: string;
}
