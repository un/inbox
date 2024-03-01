import type { PrepareMessageOptions } from "../../prepareMessage";

const testOptions: PrepareMessageOptions = {
  noQuotations: true,
  autolink: true,
  enhanceLinks: true,
  noRemoteContent: true,
  forceViewport: '<meta name="viewport" content="width=device-width" />',
  includeStyle: ".customStyle { background: red; }",
};

export default testOptions;
