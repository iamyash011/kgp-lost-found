import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const CATEGORIES = [
  'Electronics', 'Documents & IDs', 'Clothing & Accessories', 'Bags & Wallets',
  'Keys', 'Stationery', 'Sports Equipment', 'Books', 'Water Bottles', 'Other'
];

const COLORS = [
  'Black', 'White', 'Silver', 'Blue', 'Red', 'Green', 'Brown', 'Gold',
  'Pink', 'Orange', 'Yellow', 'Purple', 'Grey', 'Transparent', 'Other'
];

export interface NLPResult {
  title: string;
  category: string;
  color: string;
  brand: string;
  dateOccurred: string;
  description: string;
  location: string;
  identifyingMarks: string;
  isComplete: boolean;
  followUpQuestion: string;
}

export async function extractItemFeatures(text: string): Promise<{ result?: NLPResult, error?: string }> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️ GEMINI_API_KEY is not set. NLP extraction is disabled.');
    return { error: 'GEMINI_API_KEY environment variable is not set.' };
  }

  const prompt = `
  You are an expert information extractor.
  Analyze the following natural language description of a lost or found item.
  You must extract the details into a valid JSON object. Do NOT wrap it in markdown block quotes (no \`\`\`json). Just the raw JSON object.

  Fields required:
  1. "title": A short, descriptive title of the item (max 5 words, e.g. "Black Apple iPhone 13" or "Blue Milton Water Bottle").
  2. "category": Choose the MOST ACCURATE category strictly from this exact list: [${CATEGORIES.join(', ')}]. If unsure, use "Other".
  3. "color": Choose the primary color strictly from this exact list: [${COLORS.join(', ')}]. If unsure, use "Other".
  4. "brand": The brand name of the item if mentioned (e.g. "Apple", "Milton", "Nike"). If no brand is mentioned, return an empty string "".
  5. "dateOccurred": The date mentioned (if any), formatted as ISO string (e.g. "2026-06-23T00:00:00.000Z") assuming current year is 2026 if not specified. If no date is mentioned, return "".
  6. "description": A concise summary of the item based on the text.
  7. "location": The location where it was lost/found if mentioned (e.g. "Nalanda", "Tech Market"). If not mentioned, return "".
  8. "identifyingMarks": Any unique identifying marks (e.g., scratches, stickers, custom name) mentioned. If not, return "".
  9. "isComplete": Boolean. Set to true if the text clearly identifies what the item is AND where it was lost/found. Set to false if crucial details like the item identity (title) or location are completely missing.
  10. "followUpQuestion": If isComplete is false, provide a short, conversational question asking the user for the missing crucial details (e.g., "Could you please mention where you lost it?"). If isComplete is true, return "".

  User Description:
  "${text}"

  Example output (complete):
  {
    "title": "Black Milton Water Bottle",
    "category": "Water Bottles",
    "color": "Black",
    "brand": "Milton",
    "dateOccurred": "2026-06-23T00:00:00.000Z",
    "description": "Black Milton water bottle with a scratch on the bottom, lost near Nalanda on June 23rd.",
    "location": "Nalanda",
    "identifyingMarks": "Scratch on the bottom",
    "isComplete": true,
    "followUpQuestion": ""
  }

  Example output (missing location):
  {
    "title": "Black Milton Water Bottle",
    "category": "Water Bottles",
    "color": "Black",
    "brand": "Milton",
    "dateOccurred": "",
    "description": "Lost a black milton water bottle.",
    "location": "",
    "identifyingMarks": "",
    "isComplete": false,
    "followUpQuestion": "Got it. Could you also tell me where you lost it?"
  }
  `;

  const modelsToTry = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];
  let lastError: any = null;

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        
        // Clean up potential markdown formatting
        const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        const parsed = JSON.parse(cleanJson);
        
        return {
          result: {
            title: parsed.title || 'Item',
            category: CATEGORIES.includes(parsed.category) ? parsed.category : 'Other',
            color: COLORS.includes(parsed.color) ? parsed.color : 'Other',
            brand: parsed.brand || '',
            dateOccurred: parsed.dateOccurred || '',
            description: parsed.description || text,
            location: parsed.location || '',
            identifyingMarks: parsed.identifyingMarks || '',
            isComplete: parsed.isComplete ?? true,
            followUpQuestion: parsed.followUpQuestion || '',
          }
        };
      } catch (error: any) {
        console.warn(`⚠️ Model ${modelName} failed on attempt ${attempt}:`, error.message);
        lastError = error;
      }
    }

    const isOverloaded = lastError?.message?.includes('503') || lastError?.message?.includes('429');
    
    if (isOverloaded && attempt < maxRetries) {
      console.log(`🔄 Google AI overloaded. Waiting 30 seconds before retry ${attempt + 1}/${maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, 30000));
    } else {
      break;
    }
  }

  console.error('All NLP extraction models and retries failed. Last error:', lastError);
  return { error: lastError?.message || 'Unknown AI error' };
}
