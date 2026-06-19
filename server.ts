import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { logger } from './frontend/src/utils/logger';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { 
  upsertGoogleUser, 
  createSession, 
  getSession, 
  deleteSession,
  getAllChatSessions,
  saveChatSessions,
  getAllChatMessages,
  saveChatMessages,
  ChatSession,
  ChatMessage
} from './server/db';
import apiRouter from './server/routes/v1/router';
import { generateContentWithRetryAndFallback } from './frontend/src/utils/gemini';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
const PORT = 3000;

// Structured Logging middleware
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.originalUrl}`);
  next();
});

// Define Google Auth APIs first so they don't get proxied to Python backend
app.use(express.json());

if (!process.env.GEMINI_API_KEY) {
  console.error("FATAL: GEMINI_API_KEY missing");
  process.exit(1);
}

// 1. Construct Google Auth URL endpoint
app.get('/api/auth/google/url', (req, res) => {
  const clientOrigin = req.query.origin as string || 'http://localhost:3000';
  
  if (!process.env.GOOGLE_CLIENT_ID) {
    logger.warn('GOOGLE_CLIENT_ID is not configured in environment variables.');
    return res.status(500).json({ error: 'OAuth setup is half-configured. GOOGLE_CLIENT_ID is missing.' });
  }

  const redirectUri = `${clientOrigin}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: clientOrigin, // Pass origin to keep track of dynamic preview host
    access_type: 'offline',
    prompt: 'select_account',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ url: authUrl });
});

// 2. Google OAuth Callback Redirect handler
app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const clientOrigin = (state as string) || 'http://localhost:3000';

  if (!code) {
    logger.error('No authorization code provided in Google OAuth callback');
    return res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_FAILURE', error: 'No authorization code' }, '*');
              window.close();
            } else {
              window.location.href = '${clientOrigin}?error=no_code';
            }
          </script>
          <p>Authentication failed. This window can now be closed.</p>
        </body>
      </html>
    `);
  }

  try {
    const redirectUri = `${clientOrigin}/api/auth/google/callback`;
    
    // Exchange Auth Code for tokens
    logger.info(`Exchanging OAuth authorization code with Google for client: ${clientOrigin}`);
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code as string,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Google token exchange failed: ${errText}`);
    }

    const tokens = await tokenResponse.json() as { access_token: string };
    
    // Fetch Google User Profile info
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      const errText = await profileResponse.text();
      throw new Error(`Google user profile fetch failed: ${errText}`);
    }

    const profile = await profileResponse.json() as {
      sub: string;
      name: string;
      email: string;
      picture?: string;
    };

    logger.info(`Successfully fetched Google profile for ${profile.email}`);

    // Create session and upsert profile in local database
    const user = await upsertGoogleUser(profile);
    const session = await createSession(user);

    logger.info(`Created secure session token for user: ${user.email}`);

    // Set cookie for authorization persistence (enhanced multi-tab security)
    res.cookie('sc_session_token', session.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Send successful OAUTH context to client container
    return res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                token: '${session.token}',
                user: ${JSON.stringify({ name: session.name, email: session.email, picture: session.picture })}
              }, '${clientOrigin}');
              window.close();
            } else {
              // Direct URL redirection fallback
              window.location.href = '${clientOrigin}/#token=${session.token}';
            }
          </script>
          <p>Authentication successful. Callback completed. Closing window...</p>
        </body>
      </html>
    `);

  } catch (error: any) {
    logger.error('Google OAuth callback handler encountered error:', { error: error?.message || error });
    return res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_FAILURE', error: 'Authentication exchange failed' }, '*');
              window.close();
            } else {
              window.location.href = '${clientOrigin}?error=invalid_exchange';
            }
          </script>
          <p>Authentication failed during token exchange. This window can now be closed.</p>
        </body>
      </html>
    `);
  }
});

// 3. Me state context validator callback
app.get('/api/auth/me', async (req, res) => {
  // Try retrieving token from Header or Cookies
  const authHeader = req.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // Fallback to cookie
    const cookiesRaw = req.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookiesRaw.split(';').map((c) => {
        const parts = c.trim().split('=');
        return [parts[0], parts.slice(1).join('=')];
      })
    );
    token = cookies['sc_session_token'];
  }

  if (!token) {
    return res.status(401).json({ authenticated: false, error: 'Unauthorized token reference' });
  }

  const session = await getSession(token);
  if (!session) {
    return res.status(401).json({ authenticated: false, error: 'Session expired or invalid' });
  }

  return res.json({
    authenticated: true,
    user: {
      name: session.name,
      email: session.email,
      picture: session.picture,
    },
  });
});

// 4. Secure Log-out helper
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    const cookiesRaw = req.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookiesRaw.split(';').map((c) => {
        const parts = c.trim().split('=');
        return [parts[0], parts.slice(1).join('=')];
      })
    );
    token = cookies['sc_session_token'];
  }

  if (token) {
    deleteSession(token);
  }

  res.clearCookie('sc_session_token', {
    secure: true,
    sameSite: 'none',
  });

  return res.json({ success: true });
});

async function getChatUser(req: express.Request) {
  const authHeader = req.headers.authorization;
  let userId = authHeader && authHeader.split(' ')[1];

  if (!userId) {
    const cookiesRaw = req.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookiesRaw.split(';').map((c) => {
        const parts = c.trim().split('=');
        return [parts[0], parts.slice(1).join('=')];
      })
    );
    const token = cookies['sc_session_token'];
    if (token) {
      const session = await getSession(token);
      if (session) {
        userId = session.user_id;
      }
    }
  }

  return userId || 'anonymous_user';
}

// Chat Sessions endpoints
app.get('/api/sessions', async (req, res) => {
  try {
    const userId = await getChatUser(req);
    const sessions = await getAllChatSessions();
    const userSessions = sessions.filter(s => s.user_id === userId);
    userSessions.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    res.json(userSessions);
  } catch (err: any) {
    logger.error('Error in GET /api/sessions:', err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

app.post('/api/sessions', async (req, res) => {
  try {
    const userId = await getChatUser(req);
    const { title } = req.body;
    const sessions = await getAllChatSessions();
    
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      user_id: userId,
      title: title || 'New Conversation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    sessions.push(newSession);
    await saveChatSessions(sessions);
    res.status(201).json(newSession);
  } catch (err: any) {
    logger.error('Error in POST /api/sessions:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

app.delete('/api/sessions/:session_id', async (req, res) => {
  try {
    const userId = await getChatUser(req);
    const { session_id } = req.params;
    const sessions = await getAllChatSessions();
    const filtered = sessions.filter(s => !(s.id === session_id && s.user_id === userId));
    
    await saveChatSessions(filtered);
    
    // Also delete associated messages
    const messages = await getAllChatMessages();
    const filteredMessages = messages.filter(m => m.session_id !== session_id);
    await saveChatMessages(filteredMessages);
    
    res.json({ success: true });
  } catch (err: any) {
    logger.error('Error in DELETE /api/sessions:', err);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

app.get('/api/sessions/:session_id/messages', async (req, res) => {
  try {
    const { session_id } = req.params;
    const messages = await getAllChatMessages();
    const sessionMessages = messages.filter(m => m.session_id === session_id);
    sessionMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    res.json(sessionMessages);
  } catch (err: any) {
    logger.error('Error in GET messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/sessions/:session_id/messages', async (req, res) => {
  try {
    const { session_id } = req.params;
    const { role, content, widgets, sources, msg_id } = req.body;
    const messages = await getAllChatMessages();
    
    const newMessage: ChatMessage = {
      id: msg_id || crypto.randomUUID(),
      session_id,
      role: role || 'user',
      content: content || '',
      widgets,
      sources,
      created_at: new Date().toISOString()
    };
    
    const existingIdx = messages.findIndex(m => m.id === newMessage.id);
    if (existingIdx !== -1) {
      messages[existingIdx] = newMessage;
    } else {
      messages.push(newMessage);
    }
    
    await saveChatMessages(messages);
    
    // Update session's updated_at
    const sessions = await getAllChatSessions();
    const sessionIdx = sessions.findIndex(s => s.id === session_id);
    if (sessionIdx !== -1) {
      sessions[sessionIdx].updated_at = new Date().toISOString();
      await saveChatSessions(sessions);
    }
    
    res.status(201).json(newMessage);
  } catch (err: any) {
    logger.error('Error in POST message:', err);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

app.patch('/api/sessions/:session_id/title', async (req, res) => {
  try {
    const { session_id } = req.params;
    const userId = await getChatUser(req);
    
    // Find the session and verify ownership
    const sessions = await getAllChatSessions();
    const sessionIdx = sessions.findIndex(s => s.id === session_id && s.user_id === userId);
    if (sessionIdx === -1) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Get messages for this session
    const messages = await getAllChatMessages();
    const sessionMessages = messages.filter(m => m.session_id === session_id);
    const firstUserMsg = sessionMessages.find(m => m.role === 'user');
    
    let generatedTitle = 'Active Conversation';
    
    if (firstUserMsg && firstUserMsg.content) {
      try {
        const prompt = `Based on the following first user message in a chat, generate an extremely concise title of EXACTLY 4 to 6 words. Do not use quotes, do not include any extra text or preamble. Just return the 4 to 6 words.
        
First user message: "${firstUserMsg.content}"`;
        
        const response: any = await generateContentWithRetryAndFallback({
          contents: prompt,
          fallbackModel: 'gemini-3.1-flash-lite',
          config: {
            temperature: 0.7,
          }
        });
        
        let replyText = '';
        if (response && response.text) {
          replyText = response.text;
        } else if (typeof response === 'string') {
          replyText = response;
        }
        
        if (replyText) {
          generatedTitle = replyText.replace(/["']/g, '').trim();
        }
      } catch (geminiErr) {
        logger.error('Failed to generate title using Gemini, using fallback:', geminiErr);
        // Fallback title from text substring
        const cleanContent = firstUserMsg.content.trim();
        const words = cleanContent.split(/\s+/);
        if (words.length > 5) {
          generatedTitle = words.slice(0, 5).join(' ') + '...';
        } else {
          generatedTitle = cleanContent;
        }
      }
    }
    
    // Update session title
    sessions[sessionIdx].title = generatedTitle;
    sessions[sessionIdx].updated_at = new Date().toISOString();
    await saveChatSessions(sessions);
    
    res.json(sessions[sessionIdx]);
  } catch (err: any) {
    logger.error('Error in PATCH session title:', err);
    res.status(500).json({ error: 'Failed to update session title' });
  }
});

// Mount Node.js Express API router to handle scheme-matching, advisor chat, and legal document reviews
app.use('/api', apiRouter);

// Proxy /api requests to the Python FastAPI backend on Port 8000
app.use('/api', createProxyMiddleware({
  target: process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000',
  changeOrigin: true,
  ws: true,
  logger: console, // compatible with v3 log configuration
}));

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    logger.info('Starting server in Node development environment');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    logger.info('Starting server in production environment');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server successfully started on http://0.0.0.0:${PORT}`);
  });
}

startServer();
export default app;
