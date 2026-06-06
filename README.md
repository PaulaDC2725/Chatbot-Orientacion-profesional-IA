# OurChatbot: Orientador profesional IA 

OurChatbot es una aplicación web impulsada por Inteligencia Artificial diseñada para orientar a estudiantes y futuros profesionales sobre el impacto de la IA en sus carreras. El sistema cuenta con autenticación de usuarios, persistencia de sesiones de chat y un bot conversacional integrado con la API de Groq.

Desarrollado con **Angular (SSR)**, **Node.js (Express)** y **SQLite**.

---

## Requisitos Previos

Asegúrate de tener instalados los siguientes programas en tu entorno de desarrollo antes de ejecutar el proyecto:

* [Node.js](https://nodejs.org/) (Versión 18 o superior recomendada).
* Gestor de paquetes `npm` (incluido con Node.js).
* Una API Key válida de [Groq](https://console.groq.com/).

---

## ⚙️ Instalación y Configuración Paso a Paso

Sigue estas instrucciones estrictamente para garantizar que la base de datos y el servidor funcionen correctamente.

### 1. Clonar el repositorio e instalar dependencias
Abre tu terminal, navega hasta la carpeta del proyecto y ejecuta:
\`\`\`bash
npm install
\`\`\`

### 2. Configurar las Variables de Entorno
Crea un archivo llamado `.env` en la raíz del proyecto (al mismo nivel que el `package.json`) y añade tu clave de la API de Groq:
\`\`\`env
GROQ_API_KEY=tu_clave_api_aqui
PORT=4000
\`\`\`

### 3. Inicializar la Base de Datos (¡Paso Crítico!)
El proyecto utiliza SQLite (`better-sqlite3`). Para que el inicio de sesión y el guardado del historial funcionen, es obligatorio crear y poblar la base de datos antes de iniciar el servidor.

Ejecuta el siguiente comando en la raíz del proyecto:
\`\`\`bash
node scripts/init-db.mjs
\`\`\`
*(Nota: Si alguna vez necesitas reiniciar la base de datos por completo, simplemente elimina la carpeta `data/` y vuelve a ejecutar este comando).*

Si el proceso es exitoso, verás en la consola mensajes confirmando la inserción de las facultades, carreras y la creación de las tablas `users`, `chats` y `messages`.

### 4. Limpieza de Caché (Recomendado)
Para evitar conflictos con compilaciones anteriores de Angular Vite, limpia la caché ejecutando:
\`\`\`bash
npm cache clean --force
\`\`\`
*(Puedes borrar la carpeta `.angular` manualmente si experimentas problemas visuales).*

### 5. Iniciar la Aplicación
Finalmente, levanta el servidor de desarrollo ejecutando:
\`\`\`bash
npm start
\`\`\`
La aplicación estará disponible en tu navegador en: `http://localhost:4000` (o el puerto que Angular/Express te indique en la consola, por ejemplo `http://localhost:4200`).

---

## Estructura de la Base de Datos (`careers.db`)

La base de datos se autogestiona en el archivo `data/careers.db` y se compone de:
* **users:** Almacena los correos institucionales y contraseñas encriptadas con `bcrypt`.
* **chats:** Gestiona las sesiones únicas de cada usuario.
* **messages:** Guarda el historial de preguntas del usuario y las respuestas de la IA.
* **faculties & careers:** Almacena el contexto académico predefinido utilizado para el prompt de la IA.

---

## Derechos de Autor y Licencia

**© 2026 Universidad Ean | Desarrollado por Alejandra, Laura y Paula.**

Este proyecto es de carácter académico e investigativo, desarrollado como requisito y proyecto de integración para la **Universidad Ean**. 

* El código fuente, diseño de interfaz y la lógica de integración de la base de datos son propiedad intelectual de sus autoras.
* Prohibida su reproducción, distribución o uso comercial sin la autorización expresa de las creadoras y/o la institución académica.
* Los contenidos académicos generados por el bot tienen fines orientativos y utilizan la tecnología de modelos de lenguaje de código abierto a través de Groq.
