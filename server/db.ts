import { promises as fs, existsSync, mkdirSync, writeFileSync } from 'fs';
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
