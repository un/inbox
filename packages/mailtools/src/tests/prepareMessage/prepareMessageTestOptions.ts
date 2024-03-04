import type { ParseMessageOptions } from '../../parseMessage';

const testOptions: ParseMessageOptions = {
  cleanQuotations: true,
  cleanSignatures: true,
  autolink: true,
  enhanceLinks: true,
  noRemoteContent: true,
  forceViewport: '<meta name="viewport" content="width=device-width" />',
  includeStyle: '.customStyle { background: red; }'
};

export default testOptions;
