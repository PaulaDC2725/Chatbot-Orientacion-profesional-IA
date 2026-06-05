import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  constructor() {}

  sendMessage(message: string): Observable<any> {
  const sendRequest = async () => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.response || 'No se pudo conectar con el backend.');
    }

    return data;
  };

  const promise = sendRequest().catch(async () => {
    return sendRequest();
  });

  return from(promise);
}
}