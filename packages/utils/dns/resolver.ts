import { z } from 'zod';

const dnsLookupSchema = z
  .object({
    Status: z.number(),
    Answer: z
      .array(
        z.object({
          name: z.string(),
          type: z.number(),
          TTL: z.number(),
          data: z.string()
        })
      )
      .optional()
  })
  .transform(({ Status, Answer }) => {
    switch (Status) {
      case 0: {
        if (!Answer) {
          return {
            success: false,
            error: 'DNS server returned no answer',
            code: Status
          };
        } else {
          return {
            success: true,
            data: Answer
          };
        }
      }
      case 2:
        return {
          success: false,
          error: 'DNS server had a Server Failure',
          code: Status
        };
      case 3:
        return {
          success: false,
          error: 'The domain name does not exist',
          code: Status
        };
      case 5:
        return {
          success: false,
          error: 'DNS server refused the query',
          code: Status
        };
      default:
        return {
          success: false,
          error: 'Unhandled DNS server error',
          code: Status
        };
    }
  });

// https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/
const DNS_QUERY_SERVER = 'https://cloudflare-dns.com/dns-query';

// For more types, lookup and extend the zod schema as required
const allowedRecordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'] as const;

export default async function lookup(
  domain: string,
  recordType: (typeof allowedRecordTypes)[number]
) {
  try {
    const response = await fetch(
      `${DNS_QUERY_SERVER}?name=${domain}&type=${recordType}`,
      {
        method: 'GET',
        headers: {
          accept: 'application/dns-json'
        }
      }
    );

    if (response.status === 400) {
      return {
        success: false,
        error: 'Invalid domain or record type'
      };
    }

    if (response.status === 504) {
      return {
        success: false,
        error: 'DNS server timed out'
      };
    }

    const data = await response.json();
    const result = dnsLookupSchema.safeParse(data);
    if (result.success === false) {
      return {
        success: false,
        error: `Invalid response from DNS server: ${result.error.message}`
      };
    }
    return result.data;
  } catch (e) {
    if (e instanceof Error) {
      throw new Error(`Unhandled DNS query error: ${e.message}`);
    } else {
      throw e;
    }
  }
}
