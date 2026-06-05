import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
import { join } from 'node:path';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import { CareerContext, findCareerByMessage, getAvailableCareers } from './career-db';

const browserDistFolder = join(import.meta.dirname, '../browser');
const app = express();
const angularApp = new AngularNodeAppEngine();
app.use(express.json());

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function isGreeting(message: string): boolean {
  const normalizedMessage = normalizeText(message);

  const greetings = [
    'hola',
    'holaa',
    'buenas',
    'buenos dias',
    'buenas tardes',
    'buenas noches',
    'hey',
    'hello',
    'hi',
    'que tal',
    'como estas',
  ];

  return greetings.some((greeting) => normalizedMessage === greeting);
}

let lastCareerContext: CareerContext | null = null;

function mentionsUnsupportedCareer(message: string): boolean {
  const normalizedMessage = normalizeText(message);

  const unsupportedCareers = [
    'medicina',
    'enfermeria',
    'arquitectura',
    'odontologia',
    'veterinaria',
    'derecho',
    'psicologia',
    'diseno grafico',
    'contaduria',
    'contabilidad',
    'comunicacion social',
    'comunicación social',
    'periodismo',
    'educacion',
    'educación',
    'enfermería',
    'ingeniería de petróleos',
    'petroleos',
    'ingenieria aeroespacial',
    'ingeniería aeroespacial',
    'ingenieria civil',
    'ingeniería civil',
    'ingenieria industrial',
    'ingeniería industrial',
    'ingenieria mecanica',
    'ingeniería mecánica',
    'ingenieria mecatronica',
    'ingeniería mecatrónica',
    'ingenieria ambiental',
    'ingeniería ambiental',
    'ingenieria electronica',
    'ingeniería electrónica',
    'biologia',
    'biología',
    'quimica',
    'química',
    'fisica',
    'física',
    'matematicas',
    'matemáticas',
    'mercadeo',
    'negocios internacionales',
    'economia',
    'economía',
    'finanzas',
    'gastronomia',
    'gastronomía',
    'cine',
    'musica',
    'música',
    'artes',
    'publicidad',
    'relaciones internacionales',
    'ciencia politica',
    'ciencia política',
    'trabajo social',
    'terapia ocupacional',
    'fisioterapia',
    'nutricion',
    'nutrición',
  ];

  const mentionsUnsupportedName = unsupportedCareers.some((career) =>
    normalizedMessage.includes(normalizeText(career)),
  );

  return mentionsUnsupportedName;
}

app.post('/api/chat', async (req, res) => {
  const userMessage = req.body?.message;

  if (!userMessage || typeof userMessage !== 'string') {
    return res.status(400).json({
      response: 'Debes escribir una pregunta para poder orientarte.',
    });
  }

  if (isGreeting(userMessage)) {
    return res.json({
      response:
        'Hola, soy el asistente de orientación profesional de la Universidad EAN. Puedo ayudarte a comprender cómo la inteligencia artificial impacta carreras como Administración de Empresas, Lenguas Modernas e Ingeniería de Sistemas, y qué habilidades puedes desarrollar para adaptarte.',
    });
  }

const detectedCareer = findCareerByMessage(userMessage);

if (detectedCareer) {
  lastCareerContext = detectedCareer;
}

const normalizedMessage = normalizeText(userMessage);

const normalizedCareerName = detectedCareer
  ? normalizeText(detectedCareer.name)
  : '';

if (detectedCareer && normalizedMessage === normalizedCareerName) {
  const formattedContext = detectedCareer.context
    .replace(/^La carrera de .*? pertenece a la Facultad .*?\.\s*/i, '')
    .replace(/Impacto de la IA:/g, 'Impacto de la inteligencia artificial:')
    .replace(/Herramientas clave:/g, 'Herramientas clave que debes dominar:')
    .replace(/Habilidades estratégicas:/g, 'Habilidades estratégicas a fortalecer:')
    .replace(/Nuevos roles laborales:/g, 'Nuevos roles laborales (salidas):')
    .replace(/Enfoque eanista:/g, 'Tu ventaja Eanista:')
    .trim();

  return res.json({
    response: `Carrera: ${detectedCareer.name}

Facultad: ${detectedCareer.faculty}

${formattedContext}

¿Te gustaría saber cómo empezar a aprender alguna de estas herramientas o qué cursos específicos te pueden servir?`,
  });
}

if (!detectedCareer && mentionsUnsupportedCareer(userMessage)) {
  const availableCareers = getAvailableCareers();

  return res.json({
    response: `La carrera consultada no se encuentra disponible dentro de la base de carreras de la Universidad EAN para este asistente.

Por ahora puedo orientarte sobre:

- ${availableCareers.split(', ').join('\n- ')}`,
  });
}

const career = detectedCareer || lastCareerContext;

if (!career) {
  const availableCareers = getAvailableCareers();

  return res.json({
    response: `Para poder orientarte mejor, dime sobre cuál de estas carreras quieres preguntar:

- ${availableCareers.split(', ').join('\n- ')}

Por ejemplo: "¿Cómo impacta la IA en Ingeniería de Sistemas?"`,
  });
}

  const groqApiKey = process.env['GROQ_API_KEY'];

  if (!groqApiKey) {
    return res.status(500).json({
      response: 'No se encontró la API key de Groq en el backend.',
    });
  }

  const careerContext = `
Facultad: ${career.faculty}
Carrera: ${career.name}
Contexto: ${career.context}
`;

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content:
              'Eres un asistente virtual de orientación profesional para estudiantes próximos a egresar de la Universidad EAN. Tu objetivo es ayudarles a comprender cómo la inteligencia artificial impacta su carrera y cómo pueden adaptarse profesionalmente. Responde de forma empática, académica, clara y motivadora. Usa únicamente el contexto de carrera entregado por la base de datos.',
          },
          {
            role: 'user',
            content: `
Pregunta del estudiante:
${userMessage}

Carrera activa:
${career.name}

Contexto de la base de datos:
${careerContext}

Instrucciones de respuesta:
- La pregunta del estudiante es lo principal. Responde directamente lo que preguntó.
- Usa la carrera activa como contexto, pero no copies todo el contexto de la base de datos.
- Si el estudiante pregunta por cursos, responde solo sobre cursos recomendados para la carrera activa.
- Si pregunta por empleos, trabajos, áreas mejor pagadas o salidas laborales, responde solo sobre oportunidades laborales.
- Si pregunta por habilidades, responde solo sobre habilidades.
- Si pregunta por herramientas, responde solo sobre herramientas.
- Si pregunta cómo adaptarse, responde solo con recomendaciones de adaptación.
- Si el estudiante usa frases como "esta carrera", "mi carrera", "la carrera" o "este programa", entiende que habla de la carrera activa.
- No vuelvas a escribir Carrera, Facultad, Impacto de la IA, Habilidades recomendadas ni Consejo final, excepto si el estudiante pide explícitamente una explicación general desde cero.
- No empieces la respuesta repitiendo la pregunta del estudiante.
- No uses la pregunta del estudiante como título.
- Está prohibido usar Markdown o símbolos ** en cualquier parte de la respuesta.
- Si necesitas un título, escríbelo sin formato, por ejemplo: Herramientas útiles:
- Usa máximo 2 secciones con títulos naturales según la pregunta, por ejemplo: Cursos recomendados, Habilidades clave, Salidas laborales, Herramientas útiles o Recomendaciones.
- Usa listas cortas con guiones si ayuda.
- Mantén un tono claro, profesional y directo.
`,
          },
        ],
        temperature: 0.3,
      }),
    });

    const data = (await groqResponse.json()) as any;

    if (!groqResponse.ok) {
      console.error('Groq API error:', data);

      return res.status(500).json({
        response: 'No pude conectarme correctamente con Groq.',
      });
    }

    return res.json({
      response: data.choices?.[0]?.message?.content || 'No recibí una respuesta válida de Groq.',
    });
  } catch (error) {
    console.error('Chat backend error:', error);

    return res.status(500).json({
      response: 'Ocurrió un error al generar la respuesta del asistente.',
    });
  }
});

app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  const apiKey = process.env['OPENAI_API_KEY'];

  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured.' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Eres un asistente amigable y claro.' },
          { role: 'user', content: message },
        ],
      }),
    });

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: 'OpenAI request failed.', details: error });
  }
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
