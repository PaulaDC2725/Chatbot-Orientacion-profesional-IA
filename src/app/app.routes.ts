import { Routes } from '@angular/router';
import { AuthComponent } from './auth/auth.component';
import { ChatbotComponent } from './chatbot/chatbot';

export const routes: Routes = [
  { path: '', component: AuthComponent },
  { path: 'chat', component: ChatbotComponent },
  { path: '**', redirectTo: '' }
];
