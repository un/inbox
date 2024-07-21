export const parseSpfIncludes = (data: string) => {
  const spf = data.match(/v=spf1 (.*)/);
  if (!spf?.[1]) {
    return null;
  }
  const includes = spf[1].match(/include:([^\s]+)/g);
  const all = spf[1].match(/(\+|-|~)all/g);

  if (!includes) {
    return {
      includes: [],
      all: all ? all[0] : '+all'
    };
  }
  return {
    includes: Array.from(includes.map((_) => _.replace('include:', ''))),
    all: all ? all[0] : '+all'
  };
};

export const buildSpfRecord = (includes: string[], all: string) =>
  `v=spf1 ${includes.map((_) => `include:${_}`).join(' ')} ${all}`;

export const parseDkim = (data: string) => {
  const dkim = data.replaceAll(' ', '').match(/v=DKIM1;(.*)/);
  if (!dkim?.[1]) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const values: Record<string, string> = Object.fromEntries(
    dkim[1].split(';').map((_) => _.split('='))
  );
  return values;
};

export const buildDkimRecord = (data: Record<string, string>) =>
  `v=DKIM1; ${Object.entries(data)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')};`;

export const parseDmarc = (data: string) => {
  const dmarc = data.replaceAll(' ', '').match(/v=DMARC1;(.*)/);
  if (!dmarc?.[1]) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const values: Record<string, string> = Object.fromEntries(
    dmarc[1].split(';').map((_) => _.split('='))
  );
  return values;
};

export const buildDmarcRecord = (data: Record<string, string>) =>
  `v=DMARC1; ${Object.entries(data)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')};`;
