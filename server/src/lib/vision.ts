import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
// We won't crash if the key is missing, we'll just fail gracefully during the call
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const CATEGORIES = [
  'Electronics', 'Documents & IDs', 'Clothing & Accessories', 'Bags & Wallets',
  'Keys', 'Stationery', 'Sports Equipment', 'Books', 'Water Bottles', 'Other'
];

const COLORS = [
  'Black', 'White', 'Silver', 'Blue', 'Red', 'Green', 'Brown', 'Gold',
  'Pink', 'Orange', 'Yellow', 'Purple', 'Grey', 'Transparent', 'Other'
];

export interface AIVisionResult {
  title: string;
  category: string;
  color: string;
  brand: string;
}

export async function analyzeItemImage(buffer: Buffer, mimeType: string): Promise<{ result?: AIVisionResult, error?: string }> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️ GEMINI_API_KEY is not set. AI Vision is disabled.');
    return { error: 'GEMINI_API_KEY environment variable is not set.' };
  }

  const prompt = `
  Analyze this image of a lost/found item. 
  You must extract the following 4 details and return ONLY a valid JSON object. Do NOT wrap it in markdown block quotes (no \`\`\`json). Just the raw JSON object.

  Fields required:
  1. "title": A short, descriptive title of the item (max 5 words, e.g. "Black Apple iPhone 13" or "Blue Milton Water Bottle").
  2. "category": Choose the MOST ACCURATE category strictly from this exact list: [${CATEGORIES.join(', ')}]. If unsure, use "Other".
  3. "color": Choose the primary color strictly from this exact list: [${COLORS.join(', ')}]. If unsure, use "Other".
  4. "brand": The brand name of the item if visible or obvious (e.g. "Apple", "Milton", "Nike"). If no brand is visible, return an empty string "".

  Example output:
  {
    "title": "Black Milton Water Bottle",
    "category": "Water Bottles",
    "color": "Black",
    "brand": "Milton"
  }
  `;

  const imagePart = {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType: mimeType
    }
  };

  const modelsToTry = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([prompt, imagePart]);
      const responseText = result.response.text().trim();
      
      // Clean up potential markdown formatting just in case the model ignored instructions
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const parsed = JSON.parse(cleanJson);
      
      // Validate output
      return {
        result: {
          title: parsed.title || 'Found Item',
          category: CATEGORIES.includes(parsed.category) ? parsed.category : 'Other',
          color: COLORS.includes(parsed.color) ? parsed.color : 'Other',
          brand: parsed.brand || '',
        }
      };
    } catch (error: any) {
      console.warn(`⚠️ Model ${modelName} failed:`, error.message);
      lastError = error;
      // If it's a 503 Overloaded error, loop and try the next model.
      // If it's a 400 Bad Request (e.g. image too large) we shouldn't necessarily skip, but we'll try the next anyway.
    }
  }

  console.error('All AI Vision models failed. Last error:', lastError);
  return { error: lastError?.message || 'Unknown AI error' };
}
