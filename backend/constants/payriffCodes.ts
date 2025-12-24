export const PayriffResultCodes = {
  SUCCESS: '00000',
  SUCCESS_GATEWAY: '00',
  SUCCESS_GATEWAY_APPROVE: 'APPROVED',
  SUCCESS_GATEWAY_PREAUTH_APPROVE: 'PREAUTH-APPROVED',
  WARNING: '01000',
  ERROR: '15000',
  INVALID_PARAMETERS: '15400',
  UNAUTHORIZED: '14010',
  TOKEN_NOT_PRESENT: '14013',
  INVALID_TOKEN: '14014',
} as const;

export const PayriffResultMessages = {
  OK: 'OK',
  SUCCESS: 'Operation performed successfully',
  ERROR: 'Internal Error',
  UNAUTHORIZED: 'Unauthorized',
  NOT_FOUND: 'Not found',
  TOKEN_NOT_PRESENT: 'Token not present',
  INVALID_TOKEN: 'Invalid Token',
  TOKEN_EXPIRED: 'Token expired',
  DEACTIVE_TOKEN: 'Token is not active',
  LINK_EXPIRED: 'Link is expired!',
  NO_RECORD_FOUND: 'No record found!',
  NO_INVOICE_FOUND: 'No invoice found!',
  APPLICATION_NOT_FOUND: 'Application not found!',
  USER_NOT_FOUND: 'User not found!',
  USER_ALREADY_EXISTS: 'User already exists!',
  UNEXPECTED_GATEWAY_ERROR: 'Occurred problem with Processing',
  INVALID_CREDENTIALS: 'Username or Password is incorrect',
} as const;

export type PayriffResponse<T = any> = {
  code: string;
  message: string;
  route?: string;
  internalMessage?: string | null;
  responseId?: string;
  payload?: T;
};

export function isPayriffSuccess(response: PayriffResponse): boolean {
  return (
    response.code === PayriffResultCodes.SUCCESS ||
    response.code === PayriffResultCodes.SUCCESS_GATEWAY ||
    response.payload?.orderStatus === PayriffResultCodes.SUCCESS_GATEWAY_APPROVE ||
    response.payload?.orderStatus === PayriffResultCodes.SUCCESS_GATEWAY_PREAUTH_APPROVE
  );
}

export function getPayriffErrorMessage(response: PayriffResponse, defaultMessage?: string): string {
  if (!response) {
    return defaultMessage || PayriffResultMessages.ERROR;
  }
  return response.message || response.internalMessage || defaultMessage || PayriffResultMessages.ERROR;
}
