const badWords = [
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'bastard', 'slut', 'whore',
  'fag', 'faggot', 'nigger', 'nigga', 'cock', 'cocksucker', 'motherfucker', 'retard'
];

export const containsProfanity = (texts: (string | null | undefined)[]): boolean => {
  for (const text of texts) {
    if (!text) continue;
    const lowerText = text.toLowerCase();
    for (const word of badWords) {
      // Basic check for exact word boundary
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      if (regex.test(lowerText)) {
        return true;
      }
    }
  }
  return false;
};
