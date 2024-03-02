import type { CheerioAPI } from 'cheerio';

/**
 * Remove specific style attributes from all dom elements.
 * Returns true once completed
 */
function removeStyles($: CheerioAPI): boolean {
  const cssAttributesToRemove = [
    'color',
    'background-color',
    'font-family',
    'font-size'
  ];
  $('*').each((index, element) => {
    const style = $(element).attr('style');
    if (style !== undefined && style.trim() === '') {
      $(element).removeAttr('style');
    } else if (style) {
      const styles = style.split(';');
      const filteredStyles = styles.filter((style) => {
        const propertyName = style.split(':')[0].trim();
        return !cssAttributesToRemove.includes(propertyName);
      });
      if (
        filteredStyles.length === 0 ||
        (filteredStyles.length === 1 && filteredStyles[0] === '')
      ) {
        $(element).removeAttr('style');
      } else {
        $(element).attr('style', filteredStyles.join(';'));
      }
    }
  });
  return true;
}

export default removeStyles;
