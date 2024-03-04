import { load } from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import removeQuotations from './removeQuotations';

/**
 * Remove Signatures from the HTML and return the signatures in plain text and html
 */
function removeSignatures(
  $: CheerioAPI,
  cleanedQuotations: boolean = false
): {
  didFindSignature: boolean;
  foundSignaturePlainText: string | null;
  foundSignatureHtml: string | null;
} {
  const returnData = {
    didFindSignature: false as boolean,
    foundSignaturePlainText: null as string | null,
    foundSignatureHtml: null as string | null
  };

  let cheerioToSearchForSignatures: CheerioAPI;
  let cheerioToSearchRemoveSignatures: CheerioAPI;
  // if cleanedQuotations is true, we assume that the quotations were already removed and we can just extract the first signature and return it
  if (cleanedQuotations) {
    cheerioToSearchForSignatures = $;
    cheerioToSearchRemoveSignatures = $;
  } else {
    // if cleanedQuotations is false, we need to remove the quotations first then run the signature extraction on the new cloned item, then run the signature removal on the original item
    const cloned$ = load($('*').html() || '');
    removeQuotations(cloned$);
    cheerioToSearchForSignatures = cloned$;
    cheerioToSearchRemoveSignatures = $;
  }

  // extract the signature for the return data from the html without the quotes
  const foundPrimarySignatureElements = findAllSignatures(
    cheerioToSearchForSignatures
  );
  const foundPrimarySignature = foundPrimarySignatureElements.first();

  // Iterate over divs and remove those that only contain a single div child
  foundPrimarySignature.find('div').each(function () {
    const div = $(this);
    // Check if the div only has one child and that child is a div
    if (div.children().length === 1 && div.children('div').length === 1) {
      const childDiv = div.children('div').first();
      // Replace the parent div with its child div directly
      div.replaceWith(childDiv);
    }
  });

  returnData.foundSignatureHtml = foundPrimarySignature.html();

  // Now proceed with inserting line breaks for plain text
  foundPrimarySignature.find('div').each(function (i, el) {
    if (i > 0) {
      // Skip the first div to avoid a leading newline
      $(el).before('\n');
    }
  });
  returnData.foundSignaturePlainText = foundPrimarySignature.text().trim();

  // remove all the signatures from the original email
  const allSignatureElementsForRemoval = findAllSignatures(
    cheerioToSearchRemoveSignatures
  );
  allSignatureElementsForRemoval.each((_, el) => void $(el).remove());

  returnData.didFindSignature = foundPrimarySignatureElements.length > 0;

  return returnData;
}

/**
 * Returns a selection of all signature elements
 */
function findAllSignatures($: CheerioAPI) {
  const signatureElements = $(
    [
      // Signatures.
      '.gmail_signature',
      'signature',
      '[class*="signature"]', // sig partial match for class names
      '[id*="signature"]' // sig partial match for id names
    ].join(', ')
  );

  return signatureElements;
}

export default removeSignatures;
