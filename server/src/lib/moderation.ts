// @ts-ignore
const Filter = require('bad-words');

// Initialize the filter
const filter = new Filter();

// Optionally add more custom words specific to the college environment if needed
// filter.addWords('some_custom_bad_word');

/**
 * Scans the provided text fields for profanity.
 * @param texts An array of strings to check.
 * @returns true if any objectionable content is found, false otherwise.
 */
export const containsProfanity = (texts: (string | null | undefined)[]): boolean => {
  for (const text of texts) {
    if (text && filter.isProfane(text)) {
      return true;
    }
  }
  return false;
};
