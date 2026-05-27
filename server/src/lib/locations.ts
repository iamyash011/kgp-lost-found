export const LOCATION_SYNONYMS: Record<string, string[]> = {
  'Main Building': ['main building', 'library', 'central library', 'maggu room', 'f127'],
  'Main Building Auditoriums': ['netaji auditorium', 'raman audi', 'f142', 'sn bose audi', 'f134', 'bhatnagar audi', 'f116'],
  'Ramanujan Complex': ['ramanujan complex', 'ramanujan', 'vikramshila', 'v1', 'v2', 'v3', 'v4', 'jc bose', 'sir jc bose laboratory', 'diy lab', 'cic', 'takshila', 'computer informatics centre', 'kalidas', 'gargi', 'maitree'],
  'Nalanda Classroom Complex': ['nalanda classroom complex', 'nalanda', 'nr', 'nc', 'nehru side', 'subway side', 'smst side'],
  'Tech Market': ['tech market', 'techm'],
  'Clock Tower': ['clock tower', 'clock-tower', 'roundabout'],
  'Gymkhana': ['gymkhana', 'technology students gymkhana', 'tsg'],
  '2.2': ['2.2', 'central loop'],
  'BC Roy Hospital': ['bc roy hospital', 'bcrth', 'hospital'],
  'Helipad': ['helipad'],
  'LBS Hall': ['lbs', 'lal bahadur shastri'],
  'SNVH-IGH Hall': ['snvh', 'igh', 'sarojini naidu', 'indira gandhi'],
};

/**
 * Returns the standardized parent location name if a synonym is found.
 * Otherwise, returns the original input.
 */
export const getStandardLocation = (input: string): string => {
  if (!input) return '';
  const lowerInput = input.toLowerCase().trim();
  
  for (const [standardName, synonyms] of Object.entries(LOCATION_SYNONYMS)) {
    if (standardName.toLowerCase() === lowerInput || synonyms.some(syn => lowerInput.includes(syn))) {
      return standardName;
    }
  }
  return input.trim();
};

/**
 * Returns all synonyms for a given standard location, including the standard location itself.
 */
export const getSynonymsForLocation = (standardLoc: string): string[] => {
  const synonyms = LOCATION_SYNONYMS[standardLoc] || [];
  return [standardLoc.toLowerCase(), ...synonyms];
};
