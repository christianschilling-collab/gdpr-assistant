import { createTrainingCategory, getTrainingCategories } from '../lib/firebase/trainingCategories';
import { ERROR_CATEGORIES } from '../lib/training/categories';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function initializeTrainingCategories() {
  console.log('🔥 Initializing Training Categories in Firestore...\n');

  try {
    // Check if categories already exist
    const existingCategories = await getTrainingCategories();
    
    if (existingCategories.length > 0 && existingCategories[0].id !== ERROR_CATEGORIES[0].id) {
      console.log('⚠️  Warning: Firestore already contains categories with different IDs.');
      console.log('   This script will add the default categories with their original IDs.\n');
    }

    // Add each default category to Firestore (preserving their IDs)
    for (const category of ERROR_CATEGORIES) {
      try {
        console.log(`📝 Adding category: ${category.title} (ID: ${category.id})`);
        
        await createTrainingCategory(category);
        
        console.log(`✅ Added successfully!\n`);
      } catch (error: any) {
        console.error(`❌ Error adding ${category.title}:`, error.message);
      }
    }

    console.log('\n🎉 All training categories initialized!');
    console.log('\n📋 Summary:');
    console.log(`   - ${ERROR_CATEGORIES.length} categories added to Firestore`);
    console.log(`   - Categories are now accessible via their IDs (e.g., 'incorrect-identification')`);
    console.log(`   - Visit http://localhost:3000/training to see them!\n`);

  } catch (error: any) {
    console.error('\n❌ Error initializing categories:', error.message);
    console.error('\nPlease make sure:');
    console.error('1. Firebase is configured in .env.local');
    console.error('2. Firestore rules allow write access');
    console.error('3. The dev server is running');
    process.exit(1);
  }
}

// Run the script
initializeTrainingCategories();
