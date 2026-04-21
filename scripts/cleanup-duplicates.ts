/**
 * Script to remove duplicate categories based on nameEn
 * Run with: npm run cleanup-duplicates OR npx tsx scripts/cleanup-duplicates.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getCategories, deleteCategory } from '../lib/firebase/categories';
import { getRequesterTypes, deleteRequesterType } from '../lib/firebase/requesterTypes';

async function cleanupDuplicates() {
  console.log('🧹 Starting duplicate cleanup...\n');

  try {
    // Cleanup Categories
    console.log('📋 Checking Categories for duplicates...');
    const categories = await getCategories(false); // Get all, including inactive
    
    const seenCategories = new Map<string, string>(); // nameEn -> first ID
    const duplicateCategoryIds: string[] = [];

    for (const cat of categories) {
      const key = cat.nameEn.toLowerCase();
      if (seenCategories.has(key)) {
        // This is a duplicate
        duplicateCategoryIds.push(cat.id);
        console.log(`  ❌ Duplicate found: ${cat.name} (${cat.nameEn}) - ID: ${cat.id}`);
      } else {
        seenCategories.set(key, cat.id);
        console.log(`  ✅ Keeping: ${cat.name} (${cat.nameEn}) - ID: ${cat.id}`);
      }
    }

    // Delete duplicate categories
    for (const id of duplicateCategoryIds) {
      await deleteCategory(id, false); // Hard delete
      console.log(`  🗑️  Deleted duplicate category: ${id}`);
    }

    console.log(`\n📊 Categories: Kept ${seenCategories.size}, Deleted ${duplicateCategoryIds.length}`);

    // Cleanup Requester Types
    console.log('\n👥 Checking Requester Types for duplicates...');
    const types = await getRequesterTypes(false); // Get all, including inactive
    
    const seenTypes = new Map<string, string>(); // nameEn -> first ID
    const duplicateTypeIds: string[] = [];

    for (const type of types) {
      const key = type.nameEn.toLowerCase();
      if (seenTypes.has(key)) {
        // This is a duplicate
        duplicateTypeIds.push(type.id);
        console.log(`  ❌ Duplicate found: ${type.name} (${type.nameEn}) - ID: ${type.id}`);
      } else {
        seenTypes.set(key, type.id);
        console.log(`  ✅ Keeping: ${type.name} (${type.nameEn}) - ID: ${type.id}`);
      }
    }

    // Delete duplicate types
    for (const id of duplicateTypeIds) {
      await deleteRequesterType(id, false); // Hard delete
      console.log(`  🗑️  Deleted duplicate requester type: ${id}`);
    }

    console.log(`\n📊 Requester Types: Kept ${seenTypes.size}, Deleted ${duplicateTypeIds.length}`);

    console.log('\n✨ Cleanup complete!');
  } catch (err: any) {
    console.error('❌ Error during cleanup:', err);
    process.exit(1);
  }

  process.exit(0);
}

cleanupDuplicates();
