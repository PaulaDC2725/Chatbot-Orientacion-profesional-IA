import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  constructor() {}

  // Obtiene el historial de la base de datos
  getHistory(userId: number): Observable<any> {
    const fetchHistory = async () => {
      const response = await fetch(`/api/history/${userId}`);
      if (!response.ok) throw new Error('Error al cargar historial');
      return await response.json();
    };
    return from(fetchHistory());
  }

  // Envía un mensaje nuevo incluyendo el título del chat actualizado
  sendMessage(message: string, chatId: number, userId: number, chatTitle: string): Observable<any> {
    const sendRequest = async () => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, chatId, userId, chatTitle }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.response || 'Error de conexión.');
      return data;
    };

    return from(sendRequest().catch(async () => sendRequest()));
  }
}
