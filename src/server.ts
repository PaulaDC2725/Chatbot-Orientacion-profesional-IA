import 'dotenv/config';
import express from 'express';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import { CareerContext, findCareerByMessage, getAvailableCareers } from './career-db';

const dbPath = join(process.cwd(), 'data', 'careers.db');
const dataDir = join(import.meta.dirname, '../data');

const browserDistFolder = join(import.meta.dirname, '../browser');
const app = express();
const angularApp = new AngularNodeAppEngine();
app.use(express.json());

// ==========================================
// CONEXIÓN A BASE DE DATOS
// ==========================================
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}
const db = new Database(dbPath);

// ==========================================
// ENDPOINT: REGISTRO DE USUARIO
// ==========================================
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  if (!email.endsWith('@universidadean.edu.co')) return res.status(400).json({ error: 'Solo correos institucionales.' });

  try {
    const checkUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (checkUser) return res.status(400).json({ error: 'El correo ya está registrado.' });

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const insert = db.prepare('INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
    const result = insert.run(email, passwordHash);

    return res.json({ message: 'Registro exitoso', userId: result.lastInsertRowid });
  } catch (error) {
    console.error('ERROR EN REGISTRO:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ==========================================
// ENDPOINT: INICIO DE SESIÓN
// ==========================================
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email.endsWith('@universidadean.edu.co')) return res.status(400).json({ error: 'Usa tu correo institucional.' });

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas o usuario no existe.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Credenciales incorrectas.' });

    return res.json({ message: 'Login exitoso', userId: user.id, email: user.email });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ==========================================
// ENDPOINT: OBTENER HISTORIAL DE CHATS
// ==========================================
app.get('/api/history/:userId', (req, res) => {
  const { userId } = req.params;
  try {
    const chats = db.prepare('SELECT * FROM chats WHERE user_id = ? ORDER BY id ASC').all(userId) as any[];
    const history: any = {};
    const tabs: any[] = [];

    chats.forEach(chat => {
      tabs.push({ id: chat.id, title: chat.title, isActive: false });
      const messages = db.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY id ASC').all(chat.id) as any[];

      history[chat.id] = messages.map(m => ({
        text: m.content,
        isBot: m.sender === 'bot'
      }));
    });

    return res.json({ tabs, history });
  } catch (error) {
    console.error('Error cargando historial:', error);
    return res.status(500).json({ error: 'Error al cargar el historial' });
  }
});

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================
function normalizeText(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function isGreeting(message: string): boolean {
  const normalizedMessage = normalizeText(message);
  const greetings = ['hola', 'holaa', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'hello', 'hi', 'que tal', 'como estas'];
  return greetings.some(greeting => normalizedMessage === greeting);
}

let lastCareerContext: CareerContext | null = null;

function mentionsUnsupportedCareer(message: string): boolean {
  const normalizedMessage = normalizeText(message);
  const unsupportedCareers = ['medicina', 'enfermeria', 'arquitectura', 'odontologia', 'veterinaria', 'derecho', 'psicologia', 'diseno grafico', 'contaduria', 'comunicacion social', 'periodismo', 'educacion', 'biologia', 'quimica', 'fisica', 'matematicas', 'mercadeo', 'economia', 'finanzas', 'artes', 'publicidad'];
  return unsupportedCareers.some(career => normalizedMessage.includes(normalizeText(career)));
}

// ==========================================
// ENDPOINT: CHATBOT (GROQ API) + GUARDADO Y ACTUALIZACIÓN DE TÍTULO
// ==========================================
app.post('/api/chat', async (req, res) => {
  const userMessage = req.body?.message;
  const userId = req.body?.userId;
  const chatId = req.body?.chatId;
  const chatTitle = req.body?.chatTitle || 'Consulta'; // Recibe el título actualizado desde Angular

  if (!userMessage || typeof userMessage !== 'string') {
    return res.status(400).json({ response: 'Debes escribir una pregunta para poder orientarte.' });
  }

  // Sincronización del Chat y Título en la Base de Datos
  if (userId && chatId) {
    try {
      const chatExists = db.prepare('SELECT id FROM chats WHERE id = ?').get(chatId);
      if (!chatExists) {
        // Crea el chat con el nuevo título generado
        db.prepare('INSERT INTO chats (id, user_id, title, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(chatId, userId, chatTitle);
      } else {
        // Si el chat ya existe, actualiza su título en la BD por si cambió de "Chat actual" al texto personalizado
        db.prepare('UPDATE chats SET title = ? WHERE id = ?').run(chatTitle, chatId);
      }
      db.prepare('INSERT INTO messages (chat_id, sender, content, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(chatId, 'user', userMessage);
    } catch (e) { console.error('Error guardando mensaje:', e); }
  }

  if (isGreeting(userMessage)) {
    const response = 'Hola, soy el asistente de orientación profesional de la Universidad EAN. Puedo ayudarte a comprender cómo la inteligencia artificial impacta carreras como Administración de Empresas, Lenguas Modernas e Ingeniería de Sistemas.';
    if (userId && chatId) db.prepare('INSERT INTO messages (chat_id, sender, content, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(chatId, 'bot', response);
    return res.json({ response });
  }

  const detectedCareer = findCareerByMessage(userMessage);
  if (detectedCareer) lastCareerContext = detectedCareer;
  const normalizedMessage = normalizeText(userMessage);
  const normalizedCareerName = detectedCareer ? normalizeText(detectedCareer.name) : '';

  if (detectedCareer && normalizedMessage === normalizedCareerName) {
    const formattedContext = detectedCareer.context.replace(/^La carrera de .*? pertenece a la Facultad .*?\.\s*/i, '').trim();
    const response = `Carrera: ${detectedCareer.name}\n\nFacultad: ${detectedCareer.faculty}\n\n${formattedContext}`;
    if (userId && chatId) db.prepare('INSERT INTO messages (chat_id, sender, content, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(chatId, 'bot', response);
    return res.json({ response });
  }

  if (!detectedCareer && mentionsUnsupportedCareer(userMessage)) {
    const response = `La carrera consultada no se encuentra disponible. Por ahora puedo orientarte sobre:\n\n- ${getAvailableCareers().split(', ').join('\n- ')}`;
    if (userId && chatId) db.prepare('INSERT INTO messages (chat_id, sender, content, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(chatId, 'bot', response);
    return res.json({ response });
  }

  const career = detectedCareer || lastCareerContext;
  if (!career) {
    const response = `Para poder orientarte mejor, dime sobre cuál de estas carreras quieres preguntar:\n\n- ${getAvailableCareers().split(', ').join('\n- ')}`;
    if (userId && chatId) db.prepare('INSERT INTO messages (chat_id, sender, content, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(chatId, 'bot', response);
    return res.json({ response });
  }

  const groqApiKey = process.env['GROQ_API_KEY'];
  if (!groqApiKey) return res.status(500).json({ response: 'No se encontró la API key.' });

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'Eres un asistente de orientación profesional de la EAN...' },
          { role: 'user', content: `Pregunta: ${userMessage}\nCarrera: ${career.name}\nContexto: ${career.context}` }
        ],
        temperature: 0.3,
      }),
    });

    const data = (await groqResponse.json()) as any;
    const finalResponse = data.choices?.[0]?.message?.content || 'No recibí respuesta.';

    if (userId && chatId) {
      db.prepare('INSERT INTO messages (chat_id, sender, content, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(chatId, 'bot', finalResponse);
    }
    return res.json({ response: finalResponse });
  } catch (error) {
    return res.status(500).json({ response: 'Ocurrió un error al generar la respuesta.' });
  }
});

app.use(express.static(browserDistFolder, { maxAge: '1y', index: false, redirect: false }));
app.use((req, res, next) => { angularApp.handle(req).then((response) => (response ? writeResponseToNodeResponse(response, res) : next())).catch(next); });

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => console.log(`Servidor en http://localhost:${port}`));
}

export const reqHandler = createNodeRequestHandler(app);
