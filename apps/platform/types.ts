export interface MailDomains {
  free: string[];
  premium: string[];
}

export interface TransactionalCredentials {
  apiUrl: string;
  apiKey: string;
  sendAsName: string;
  sendAsEmail: string;
}
