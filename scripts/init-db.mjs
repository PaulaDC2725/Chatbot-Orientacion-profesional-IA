import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const dataDir = join(rootDir, 'data');
const dbPath = join(dataDir, 'careers.db');

mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);

// 1. ELIMINACIÓN Y CREACIÓN DE TABLAS
db.exec(`
  DROP TABLE IF EXISTS messages;
  DROP TABLE IF EXISTS chats;
  DROP TABLE IF EXISTS users;
  DROP TABLE IF EXISTS careers;
  DROP TABLE IF EXISTS faculties;

  -- Tablas de conocimiento existentes
  CREATE TABLE faculties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE careers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    faculty_id INTEGER NOT NULL,
    name TEXT NOT NULL UNIQUE,
    keywords TEXT NOT NULL,
    context TEXT NOT NULL,
    FOREIGN KEY (faculty_id) REFERENCES faculties(id)
  );

  -- NUEVAS TABLAS PARA AUTENTICACIÓN E HISTORIAL --

  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    sender TEXT NOT NULL CHECK(sender IN ('user', 'bot')),
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
  );
`);

// 2. INSERCIÓN DE DATOS ESTÁTICOS (FACULTADES Y CARRERAS)
const insertFaculty = db.prepare(`
  INSERT INTO faculties (name)
  VALUES (?)
`);

const insertCareer = db.prepare(`
  INSERT INTO careers (
    faculty_id,
    name,
    keywords,
    context
  )
  VALUES (?, ?, ?, ?)
`);

const faculties = [
  'Facultad de Administración, Finanzas y Ciencias Económicas',
  'Facultad de Humanidades y Ciencias Sociales',
  'Facultad de Ingeniería',
];

const facultyIds = new Map();

for (const faculty of faculties) {
  const result = insertFaculty.run(faculty);
  facultyIds.set(faculty, result.lastInsertRowid);
}

// Información de las carreras
const careers = [
  {
    faculty: 'Facultad de Administración, Finanzas y Ciencias Económicas',
    name: 'Administración de Empresas',
    keywords:
      'administracion, administración, administracion de empresas, administración de empresas, empresas, gestion, gestión, negocios',
    context:
      `La carrera de Administración de Empresas de la Universidad EAN pertenece a la Facultad de Administración, Finanzas y Ciencias Económicas. Esta carrera se relaciona con la gestión de organizaciones, liderazgo, innovación, toma de decisiones, análisis empresarial y desarrollo de estrategias.

      Impacto de la IA:
        La inteligencia artificial transforma la administración operativa en administración estratégica. Elimina el trabajo manual y permite simular escenarios de negocios, predecir tendencias de mercado y personalizar la atención al cliente a gran escala.

      Herramientas clave:

      - Microsoft Copilot para M365 y Google Workspace AI para productividad y análisis.
      - Tableau y Power BI usando Smart Narratives y DAX generado por IA para inteligencia de negocios.
      - Salesforce Einstein, SAP AI y HubSpot con integraciones de IA para CRM y ERP.

      Habilidades estratégicas:

      - Toma de decisiones basada en datos (Data-Driven Decision Making).
      - Gestión del cambio (Change Management) para liderar la adopción de IA.
      - Visión estratégica y resolución de problemas complejos.
      - Inteligencia emocional y liderazgo humano.

      Nuevos roles laborales:

      - Product Manager (Gestor de Productos Tecnológicos).
      - Gerente de Transformación Digital.
      - Analista de Inteligencia de Negocios (BI Analyst).
      - Consultor de Innovación Estratégica.

      Enfoque eanista:

        Esta carrera se centra en la innovación de modelos de negocio y el fomento del emprendimiento sostenible impulsado por el análisis de datos. El administrador eanista utiliza la inteligencia artificial no solo para automatizar procesos y optimizar la rentabilidad, sino para diseñar organizaciones ágiles, resilientes y con consciencia ambiental.
        El objetivo es liderar la transformación digital en empresas tradicionales o fundar startups que integren principios de economía circular, utilizando las herramientas tecnológicas para competir a nivel global, tomar decisiones estratégicas éticas y potenciar el talento humano como el diferencial competitivo que las máquinas no pueden replicar.`,
  },
  {
    faculty: 'Facultad de Humanidades y Ciencias Sociales',
    name: 'Lenguas Modernas',
    keywords:
      'lenguas modernas, lenguas, idiomas, traduccion, traducción, comunicacion intercultural, comunicación intercultural',
    context:
      `La carrera de Lenguas Modernas de la Universidad EAN pertenece a la Facultad de Humanidades y Ciencias Sociales. Esta carrera se relaciona con la comunicación intercultural, el dominio de idiomas, la traducción, la interpretación, la mediación cultural y la comunicación en contextos globales.

      Impacto de la IA:
        La inteligencia artificial automatiza la traducción literal y la corrección gramatical. Obliga al profesional a evolucionar hacia la revisión experta, la adaptación de productos a mercados locales y el análisis computacional del lenguaje.

      Herramientas clave:

      - Trados Studio con plugins de IA, Phrase y Smartling para traducción y localización automática.
      - DeepL Pro y Google Cloud Translation API para traducción neuronal.
      - Whisper de OpenAI, GrammarlyGO y Jasper para análisis, transcripción y generación de contenido multilingüe.

      Habilidades estratégicas:

      - Posedición de Traducción Automática (PEMT).
      - Localización y Tropicalización para adaptar el contexto cultural.
      - Lingüística computacional básica para entender cómo los modelos procesan el lenguaje.
      - Negociación y mediación intercultural.

      Nuevos roles laborales:

      - Especialista en Localización y Globalización.
      - Poseditor de Traducción Automática.
      - Lingüista Computacional y Entrenador de IA.
      - Consultor de Comunicación Intercultural.

      Enfoque eanista:
        Esta carrera proyecta al profesional como un estratega clave para la internacionalización de las empresas y el fomento del emprendimiento cultural. El experto en lenguas eanista trasciende la traducción automatizada por IA para convertirse en un mediador intercultural, facilitando que startups y negocios locales sostenibles rompan fronteras y logren escalar en mercados globales. El enfoque promueve la comunicación estratégica en negocios internacionales, el uso ético de tecnologías multilingües para garantizar que no se pierda la identidad cultural en las negociaciones y la creación de proyectos que conecten de manera efectiva y humana a las organizaciones con las dinámicas económicas mundiales.`,
  },
  {
    faculty: 'Facultad de Ingeniería',
    name: 'Ingeniería de Sistemas',
    keywords:
      'ingenieria de sistemas, ingeniería de sistemas, sistemas, software, programacion, programación, desarrollo de software, tecnologia, tecnología',
    context:
      `La carrera de Ingeniería de Sistemas de la Universidad EAN pertenece a la Facultad de Ingeniería. Esta carrera se relaciona con el desarrollo de software, arquitectura de sistemas, bases de datos, análisis de información, automatización, ciberseguridad y transformación digital.

      Impacto de la IA:
        La IA actúa como un copiloto que acelera el desarrollo (escribiendo código base y detectando errores). El enfoque del ingeniero pasa de la codificación manual al diseño de arquitecturas escalables, integración de modelos de lenguaje (LLMs) y seguridad.

       Herramientas clave:

       - Asistentes de Código: GitHub Copilot, AWS CodeWhisperer, Tabnine.
       - Frameworks de IA: LangChain, LlamaIndex, TensorFlow, PyTorch.
       - Infraestructura y Nube: Docker, Kubernetes, AWS, Azure, GCP con servicios de IA nativa.

      Habilidades estratégicas:

      - Arquitectura de software y diseño de sistemas complejos.
      - Integración de APIs y microservicios (especialmente APIs de IA).
      - Prompt Engineering avanzado para optimización de código y bases de datos.
      - Ciberseguridad enfocada en vulnerabilidades de IA como Prompt Injection.

      Nuevos roles laborales:

      - Ingeniero de Inteligencia Artificial / AI Integration Engineer.
      - Ingeniero MLOps (Operaciones de Machine Learning).
      - Arquitecto de Soluciones Cloud.
      - Desarrollador Full-Stack potenciado por IA.

        Enfoque eanista:
        Esta carrera se alinea con el propósito institucional de formar emprendedores y líderes en tecnología sostenible. El ingeniero eanista no solo ejecuta la infraestructura técnica, sino que utiliza la inteligencia artificial para fundamentar startups de base tecnológica (Tech Startups) que resuelvan problemáticas reales del entorno colombiano y latinoamericano. El enfoque está en el desarrollo de soluciones de software eficientes que optimicen los recursos corporativos, promuevan la eficiencia energética en la nube y generen un impacto positivo en la sociedad, integrando la tecnología como motor principal para la creación de empresas con modelos de triple impacto: económico, social y ambiental.`,
  },
];

for (const career of careers) {
  insertCareer.run(
    facultyIds.get(career.faculty),
    career.name,
    career.keywords,
    career.context
  );
}

console.log(`Base de datos creada correctamente en: ${dbPath}`);
console.log(`Facultades insertadas: ${faculties.length}`);
console.log(`Carreras insertadas: ${careers.length}`);
console.log(`Tablas de usuarios, chats y mensajes listas para operar.`);

db.close();
