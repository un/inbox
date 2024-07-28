import lookup from './resolver';

type SuccessType<T> =
  | { success: false; error: string; code: number }
  | {
      success: true;
      data: T;
    };

const mapOverSuccess = <T, U>(
  data: {
    success: boolean;
    data?: T;
    error?: string;
    code?: number;
  },
  transform: (data: T) => U
) =>
  (data.success
    ? {
        success: true,
        data: transform(data.data!)
      }
    : {
        success: false,
        error: data.error,
        code: data.code
      }) as SuccessType<U>;

export const lookupA = async (domain: string) =>
  mapOverSuccess(await lookup(domain, 'A'), (data) => data.map((d) => d.data));

export const lookupAAAA = async (domain: string) =>
  mapOverSuccess(await lookup(domain, 'AAAA'), (data) =>
    data.map((d) => d.data)
  );

export const lookupCNAME = async (domain: string) =>
  mapOverSuccess(await lookup(domain, 'CNAME'), (data) =>
    data.map((d) => d.data.replace(/\.$/, ''))
  );

export const lookupMX = async (domain: string) =>
  mapOverSuccess(await lookup(domain, 'MX'), (data) =>
    data
      .map((entry) => {
        const [priority, exchange] = entry.data.split(/\s/);
        return {
          priority: parseInt(priority ?? '0'),
          exchange: exchange?.replace(/\.$/, '') ?? ''
        };
      })
      .sort((a, b) => a.priority - b.priority)
  );

export const lookupTXT = async (domain: string) =>
  mapOverSuccess(await lookup(domain, 'TXT'), (data) =>
    data.map((d) => d.data.replace(/"/g, ''))
  );

export const lookupNS = async (domain: string) =>
  mapOverSuccess(await lookup(domain, 'NS'), (data) =>
    data.map((d) => d.data.replace(/\.$/, ''))
  );

export * from './txtParsers';
export { dnsVerifier } from './verifier';
