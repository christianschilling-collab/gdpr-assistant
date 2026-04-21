/**
 * List available Gemini models
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

config({ path: resolve(process.cwd(), '.env.local') });

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  
  try {
    // Try to list models
    const models = await genAI.listModels();
    console.log('Available models:');
    models.forEach((model: any) => {
      console.log(`  - ${model.name}`);
    });
  } catch (error: any) {
    console.error('Error listing models:', error.message);
    // Try common model names
    console.log('\nTrying common model names:');
    const commonModels = [
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash-latest',
      'models/gemini-pro',
      'models/gemini-1.5-pro',
    ];
    
    for (const modelName of commonModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('test');
        console.log(`✅ ${modelName} works!`);
        break;
      } catch (e: any) {
        console.log(`❌ ${modelName}: ${e.message.split('\n')[0]}`);
      }
    }
  }
}

listModels();
