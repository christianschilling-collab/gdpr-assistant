/**
 * Template Version History Management
 */

import { getDb } from './config';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { TemplateVersion } from '../types';

const TEMPLATE_VERSIONS_COLLECTION = 'templateVersions';

function getDbOrThrow() {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase is not configured. Please set up Firebase in .env.local');
  }
  return db;
}

/**
 * Save a template version
 */
export async function saveTemplateVersion(
  templateId: string,
  version: TemplateVersion
): Promise<string> {
  const db = getDbOrThrow();
  const docRef = await addDoc(collection(db, TEMPLATE_VERSIONS_COLLECTION), {
    templateId,
    version: version.version,
    templateText: version.templateText,
    changedBy: version.changedBy || null,
    changedAt: Timestamp.fromDate(version.changedAt),
    changeReason: version.changeReason || null,
  });
  return docRef.id;
}

/**
 * Get version history for a template
 */
export async function getTemplateVersions(templateId: string): Promise<TemplateVersion[]> {
  const db = getDbOrThrow();
  const q = query(
    collection(db, TEMPLATE_VERSIONS_COLLECTION),
    where('templateId', '==', templateId),
    orderBy('version', 'desc')
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      version: data.version,
      templateText: data.templateText,
      changedBy: data.changedBy,
      changedAt: data.changedAt?.toDate() || new Date(),
      changeReason: data.changeReason,
    };
  });
}

/**
 * Get a specific version
 */
export async function getTemplateVersion(
  templateId: string,
  version: number
): Promise<TemplateVersion | null> {
  const db = getDbOrThrow();
  const q = query(
    collection(db, TEMPLATE_VERSIONS_COLLECTION),
    where('templateId', '==', templateId),
    where('version', '==', version)
  );
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const data = querySnapshot.docs[0].data();
  return {
    version: data.version,
    templateText: data.templateText,
    changedBy: data.changedBy,
    changedAt: data.changedAt?.toDate() || new Date(),
    changeReason: data.changeReason,
  };
}
