import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface CareerContext {
  faculty: string;
  name: string;
  keywords: string;
  context: string;
}

const dbPath = join(process.cwd(), 'data', 'careers.db');

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function findCareerByMessage(message: string): CareerContext | null {
  if (!existsSync(dbPath)) {
    console.error(`No se encontró la base de datos en: ${dbPath}`);
    return null;
  }

  const db = new Database(dbPath);

  try {
    const careers = db
      .prepare(
        `
        SELECT
          careers.name AS name,
          careers.keywords AS keywords,
          careers.context AS context,
          faculties.name AS faculty
        FROM careers
        JOIN faculties ON careers.faculty_id = faculties.id
        `
      )
      .all() as CareerContext[];

    const normalizedMessage = normalizeText(message);

    const career = careers.find((careerItem) => {
      const keywords = careerItem.keywords
        .split(',')
        .map((keyword) => normalizeText(keyword.trim()))
        .filter(Boolean);

      return keywords.some((keyword) => normalizedMessage.includes(keyword));
    });

    return career || null;
  } finally {
    db.close();
  }
}

export function getAvailableCareers(): string {
  if (!existsSync(dbPath)) {
    return 'Administración de Empresas, Lenguas Modernas e Ingeniería de Sistemas';
  }

  const db = new Database(dbPath);

  try {
    const careers = db
      .prepare(
        `
        SELECT name
        FROM careers
        ORDER BY name
        `
      )
      .all() as { name: string }[];

    return careers.map((career) => career.name).join(', ');
  } finally {
    db.close();
  }
}