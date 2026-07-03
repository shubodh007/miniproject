// ⚠️ RAILWAY DEPLOYMENT WARNING:
// This module stores data in local JSON files on disk.
// Railway's filesystem is ephemeral — all data is wiped on every redeploy.
// For production use, migrate this storage to Supabase tables or another persistent database.
// For now, this works for demos and testing but users will be logged out on each redeploy.

import { promises as fs, existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface User {
  id: string; // google sub id or local user id
  name: string;
  email: string;
  picture?: string;
  provider: string; // 'google' or 'local'
  created_at: string;
  last_login: string;
}

export interface Session {
  token: string;
  email: string;
  user_id: string;
  name: string;
  picture?: string;
  expires_at: string;
}

export interface LegalDocument {
  id: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  sanitizedContent: string;
  hash: string;
  documentType: string;
}

export interface LegalDocumentChunk {
  id: string;
  documentId: string;
  heading: string;
  chunkText: string;
  categories: string[];
  embedding: number[];
  sequenceIndex: number;
}

export interface LegalReport {
  id: string;
  documentId: string;
  analyzedBy: string;
  analyzedAt: string;
  overallRiskScore: number;
  overallRiskLevel: string;
  overallConfidence: number;
  healthScore: number;
  healthGrade: string;
  findings: any[];
  contradictions: any[];
  missingClauses: any[];
  totalClausesAnalyzed: number;
  jurisdiction: string;
  primaryParties: { party_a: string; party_b: string };
  partyFavored: string;
  partyFavoredReason: string;
  registrationRequired: boolean;
  registrationNote: string;
  escalationRequired: boolean;
  escalationReason: string;
  finalSummary: string;
  disclaimer: string;
  negotiationChecklist?: any[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users_db.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions_db.json');
const DOCUMENTS_FILE = path.join(DATA_DIR, 'documents_db.json');
const CHUNKS_FILE = path.join(DATA_DIR, 'document_chunks_db.json');
const REPORTS_FILE = path.join(DATA_DIR, 'reports_db.json');
const CHAT_SESSIONS_FILE = path.join(DATA_DIR, 'chat_sessions_db.json');
const CHAT_MESSAGES_FILE = path.join(DATA_DIR, 'chat_messages_db.json');
const SCHEMES_FILE = path.join(DATA_DIR, 'schemes_db.json');
const SCHEME_VERSIONS_FILE = path.join(DATA_DIR, 'scheme_versions_db.json');
const SCHEME_ANALYTICS_FILE = path.join(DATA_DIR, 'scheme_analytics_db.json');

const locks = new Map<string, Promise<void>>();

async function safeWrite(filePath: string, data: unknown) {
  const prev = locks.get(filePath) ?? Promise.resolve();
  const next = prev.then(() =>
    fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  );
  locks.set(filePath, next.catch(() => {}));
  return next;
}

// Helper to ensure files exist and subdirectories are present
async function ensureDatabase() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(USERS_FILE)) {
    writeFileSync(USERS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
  if (!existsSync(SESSIONS_FILE)) {
    writeFileSync(SESSIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
  if (!existsSync(DOCUMENTS_FILE)) {
    writeFileSync(DOCUMENTS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
  if (!existsSync(CHUNKS_FILE)) {
    writeFileSync(CHUNKS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
  if (!existsSync(REPORTS_FILE)) {
    writeFileSync(REPORTS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
  if (!existsSync(CHAT_SESSIONS_FILE)) {
    writeFileSync(CHAT_SESSIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
  if (!existsSync(CHAT_MESSAGES_FILE)) {
    writeFileSync(CHAT_MESSAGES_FILE, JSON.stringify([], null, 2), 'utf-8');
  }

  // Auto-seed schemes registry from static JSON mapping if empty or missing
  if (!existsSync(SCHEMES_FILE)) {
    try {
      const freshSchemesPath = path.join(process.cwd(), 'frontend', 'src', 'utils', 'fresh_schemes_mapped.json');
      if (existsSync(freshSchemesPath)) {
        const rawSchemes = JSON.parse(readFileSync(freshSchemesPath, 'utf-8'));
        const dbSchemes = rawSchemes.map((sc: any) => ({
          id: sc.scheme_id,
          name: sc.name_en,
          name_te: sc.name_te || '',
          description: sc.name_en + " detailed scheme benefits.",
          description_te: sc.name_te || '',
          benefit_details: sc.benefit_amount || '',
          benefit_details_te: sc.benefit_amount || '',
          eligibility_rules: {
            min_age: sc.min_age ?? 0,
            max_age: sc.max_age ?? 120,
            max_income: sc.max_income ?? 1000000,
            requires_land: sc.requires_land ?? false,
            applicable_states: sc.states || []
          },
          docs_required: sc.documents_required || [],
          docs_required_te: [] as string[],
          state: sc.source === "Central" ? "Central" : (sc.states && sc.states[0] ? sc.states[0] : "Andhra Pradesh"),
          district: null as string | null,
          category: sc.category || "Social Welfare",
          external_url: sc.apply_link || "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'PUBLISHED'
        }));
        writeFileSync(SCHEMES_FILE, JSON.stringify(dbSchemes, null, 2), 'utf-8');
      } else {
        writeFileSync(SCHEMES_FILE, JSON.stringify([], null, 2), 'utf-8');
      }
    } catch (e) {
      console.error('[DB] Failed to auto-seed local schemes registry:', e);
      writeFileSync(SCHEMES_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  if (!existsSync(SCHEME_VERSIONS_FILE)) {
    writeFileSync(SCHEME_VERSIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }

  if (!existsSync(SCHEME_ANALYTICS_FILE)) {
    writeFileSync(SCHEME_ANALYTICS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

export interface SchemeVersion {
  id: string;
  scheme_id: string;
  version_data: any;
  created_at: string;
}

export interface QueryAnalytic {
  id: string;
  query_text: string;
  language: string;
  latency_ms: number;
  match_count: number;
  rag_mode: 'vector' | 'fallback' | 'cached';
  matched_schemes: string[];
  timestamp: string;
  profile_snapshot?: any;
}

export async function getAllSchemes(): Promise<any[]> {
  await ensureDatabase();
  try {
    const raw = await fs.readFile(SCHEMES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveSchemes(schemes: any[]): Promise<void> {
  await ensureDatabase();
  try {
    await safeWrite(SCHEMES_FILE, schemes);
  } catch (error) {
    console.error('Failed to write schemes:', error);
  }
}

export async function getAllSchemeVersions(): Promise<SchemeVersion[]> {
  await ensureDatabase();
  try {
    const raw = await fs.readFile(SCHEME_VERSIONS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveSchemeVersions(versions: SchemeVersion[]): Promise<void> {
  await ensureDatabase();
  try {
    await safeWrite(SCHEME_VERSIONS_FILE, versions);
  } catch (error) {
    console.error('Failed to write scheme versions:', error);
  }
}

export async function getAllQueryAnalytics(): Promise<QueryAnalytic[]> {
  await ensureDatabase();
  try {
    const raw = await fs.readFile(SCHEME_ANALYTICS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveQueryAnalytics(analytics: QueryAnalytic[]): Promise<void> {
  await ensureDatabase();
  try {
    await safeWrite(SCHEME_ANALYTICS_FILE, analytics);
  } catch (error) {
    console.error('Failed to write scheme analytics:', error);
  }
}

export async function recordQueryAnalytic(analytic: Omit<QueryAnalytic, 'id' | 'timestamp'>): Promise<void> {
  const analytics = await getAllQueryAnalytics();
  const item: QueryAnalytic = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...analytic
  };
  analytics.unshift(item);
  if (analytics.length > 500) {
    analytics.pop();
  }
  await saveQueryAnalytics(analytics);
}

// ----------------------------------------------------
// USER METHODS
// ----------------------------------------------------

export async function getAllUsers(): Promise<User[]> {
  await ensureDatabase();
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to read users database:', error);
    return [];
  }
}

export async function saveUsers(users: User[]): Promise<void> {
  await ensureDatabase();
  try {
    await safeWrite(USERS_FILE, users);
  } catch (error) {
    console.error('Failed to write users database:', error);
  }
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const users = await getAllUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function getUserById(id: string): Promise<User | undefined> {
  const users = await getAllUsers();
  return users.find((u) => u.id === id);
}

export async function upsertGoogleUser(googleProfile: {
  sub: string;
  name: string;
  email: string;
  picture?: string;
}): Promise<User> {
  const users = await getAllUsers();
  const existingIndex = users.findIndex(
    (u) => u.email.toLowerCase() === googleProfile.email.toLowerCase()
  );

  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    const existingUser = users[existingIndex];
    existingUser.name = googleProfile.name || existingUser.name;
    existingUser.picture = googleProfile.picture || existingUser.picture;
    existingUser.last_login = now;
    users[existingIndex] = existingUser;
    await saveUsers(users);
    return existingUser;
  } else {
    const newUser: User = {
      id: googleProfile.sub || crypto.randomUUID(),
      name: googleProfile.name,
      email: googleProfile.email,
      picture: googleProfile.picture,
      provider: 'google',
      created_at: now,
      last_login: now,
    };
    users.push(newUser);
    await saveUsers(users);
    return newUser;
  }
}

// ----------------------------------------------------
// SESSION METHODS
// ----------------------------------------------------

export async function getAllSessions(): Promise<Session[]> {
  await ensureDatabase();
  try {
    const raw = await fs.readFile(SESSIONS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to read sessions database:', error);
    return [];
  }
}

export async function saveSessions(sessions: Session[]): Promise<void> {
  await ensureDatabase();
  try {
    await safeWrite(SESSIONS_FILE, sessions);
  } catch (error) {
    console.error('Failed to write sessions database:', error);
  }
}

export async function createSession(user: User): Promise<Session> {
  const sessions = await getAllSessions();
  const token = crypto.randomBytes(32).toString('hex');
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const newSession: Session = {
    token,
    email: user.email,
    user_id: user.id,
    name: user.name,
    picture: user.picture,
    expires_at,
  };

  sessions.push(newSession);
  await saveSessions(sessions);
  return newSession;
}

export async function getSession(token: string): Promise<Session | undefined> {
  const sessions = await getAllSessions();
  const session = sessions.find((s) => s.token === token);

  if (!session) return undefined;

  if (new Date(session.expires_at).getTime() < Date.now()) {
    await deleteSession(token);
    return undefined;
  }

  return session;
}

export async function deleteSession(token: string): Promise<void> {
  const sessions = await getAllSessions();
  const filtered = sessions.filter((s) => s.token !== token);
  await saveSessions(filtered);
}

export async function pruneSessions(): Promise<void> {
  const sessions = await getAllSessions();
  const now = Date.now();
  const filtered = sessions.filter((s) => new Date(s.expires_at).getTime() >= now);
  await saveSessions(filtered);
}

// ----------------------------------------------------
// LEGAL PLATFORM persistence METHODS
// ----------------------------------------------------

export async function getAllDocuments(): Promise<LegalDocument[]> {
  await ensureDatabase();
  try {
    const raw = await fs.readFile(DOCUMENTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveDocuments(docs: LegalDocument[]): Promise<void> {
  await ensureDatabase();
  try {
    await safeWrite(DOCUMENTS_FILE, docs);
  } catch (error) {
    console.error('Failed code to persist documents:', error);
  }
}

export async function getDocument(id: string): Promise<LegalDocument | undefined> {
  return (await getAllDocuments()).find(d => d.id === id);
}

export async function getDocumentByHash(hash: string, email: string): Promise<LegalDocument | undefined> {
  return (await getAllDocuments()).find(d => d.hash === hash && d.uploadedBy?.toLowerCase() === email?.toLowerCase());
}

export async function getAllDocumentChunks(): Promise<LegalDocumentChunk[]> {
  await ensureDatabase();
  try {
    const raw = await fs.readFile(CHUNKS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveDocumentChunks(chunks: LegalDocumentChunk[]): Promise<void> {
  await ensureDatabase();
  try {
    await safeWrite(CHUNKS_FILE, chunks);
  } catch (error) {
    console.error('Failed to write chunks DB:', error);
  }
}

export async function getDocumentChunks(docId: string): Promise<LegalDocumentChunk[]> {
  return (await getAllDocumentChunks()).filter(c => c.documentId === docId);
}

export async function getAllReports(): Promise<LegalReport[]> {
  await ensureDatabase();
  try {
    const raw = await fs.readFile(REPORTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveReports(reports: LegalReport[]): Promise<void> {
  await ensureDatabase();
  try {
    await safeWrite(REPORTS_FILE, reports);
  } catch (error) {
    console.error('Failed to save reports DB:', error);
  }
}

export async function getReportByDocId(docId: string): Promise<LegalReport | undefined> {
  return (await getAllReports()).find(r => r.documentId === docId);
}

export async function getReport(id: string): Promise<LegalReport | undefined> {
  return (await getAllReports()).find(r => r.id === id);
}

export async function getReportsByUser(email: string): Promise<LegalReport[]> {
  return (await getAllReports()).filter(r => r.analyzedBy?.toLowerCase() === email?.toLowerCase());
}

export async function addFullLegalRecord(
  doc: LegalDocument,
  chunks: LegalDocumentChunk[],
  report: LegalReport
): Promise<void> {
  const allDocs = await getAllDocuments();
  const allChunks = await getAllDocumentChunks();
  const allReports = await getAllReports();

  // Remove stale copies if they exist
  const cleanDocs = allDocs.filter(d => d.id !== doc.id && d.hash !== doc.hash);
  const cleanChunks = allChunks.filter(c => c.documentId !== doc.id);
  const cleanReports = allReports.filter(r => r.documentId !== doc.id);

  cleanDocs.push(doc);
  cleanChunks.push(...chunks);
  cleanReports.push(report);

  await saveDocuments(cleanDocs);
  await saveDocumentChunks(cleanChunks);
  await saveReports(cleanReports);
}

// ----------------------------------------------------
// CHAT SESSION & MESSAGE PERSISTENCE METHODS
// ----------------------------------------------------

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  widgets?: any;
  sources?: any;
  created_at: string;
}

export async function getAllChatSessions(): Promise<ChatSession[]> {
  await ensureDatabase();
  try {
    const raw = await fs.readFile(CHAT_SESSIONS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveChatSessions(sessions: ChatSession[]): Promise<void> {
  await ensureDatabase();
  try {
    await safeWrite(CHAT_SESSIONS_FILE, sessions);
  } catch (error) {
    console.error('Failed to write chat sessions:', error);
  }
}

export async function getAllChatMessages(): Promise<ChatMessage[]> {
  await ensureDatabase();
  try {
    const raw = await fs.readFile(CHAT_MESSAGES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveChatMessages(messages: ChatMessage[]): Promise<void> {
  await ensureDatabase();
  try {
    await safeWrite(CHAT_MESSAGES_FILE, messages);
  } catch (error) {
    console.error('Failed to write chat messages:', error);
  }
}
