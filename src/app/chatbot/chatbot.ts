import { Component, ChangeDetectorRef, ViewChild, ElementRef, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatService } from '../services/chat';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.scss',
})
export class ChatbotComponent implements OnInit {
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  messages: any[] = [];
  chatSessions: { [id: number]: any[] } = {};

  userInput = '';
  isLoading = false;
  isSidebarOpen: boolean = true;
  latestTabId: number = 0;
  tabCounter: number = 0;
  isHistoryView: boolean = false;

  tabs: { id: number; title: string; isActive: boolean }[] = [];

  constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const userIdStr = sessionStorage.getItem('currentUserId');
      if (!userIdStr) {
        this.router.navigate(['/']);
        return;
      }

      const userId = Number(userIdStr);

      // PEDIMOS EL HISTORIAL A LA BASE DE DATOS REAL
      this.chatService.getHistory(userId).subscribe({
        next: (res: any) => {
          if (res.tabs && res.tabs.length > 0) {
            this.tabs = res.tabs;
            this.chatSessions = res.history;

            const lastTab = this.tabs[this.tabs.length - 1];
            lastTab.isActive = true;
            this.latestTabId = lastTab.id;
            this.tabCounter = Math.max(...this.tabs.map((t) => t.id));
            this.messages = this.chatSessions[this.latestTabId] || [];
          } else {
            this.iniciarChatVacio();
          }
          // Forza el renderizado en pantalla para evitar que se vea vacío
          this.cdr.detectChanges();
          this.scrollToBottom();
        },
        error: (err) => {
          console.error("Error cargando historial", err);
          this.iniciarChatVacio();
          this.cdr.detectChanges();
        }
      });
    }
  }

  iniciarChatVacio() {
    this.tabCounter = Date.now();
    this.latestTabId = this.tabCounter;
    this.tabs = [{ id: this.tabCounter, title: 'Chat actual', isActive: true }];
    this.chatSessions[this.tabCounter] = [
      { text: '¡Hola! He iniciado un canal para ti. ¿Qué inquietud tienes hoy sobre el futuro de tu profesión y la Inteligencia Artificial?', isBot: true }
    ];
    this.messages = this.chatSessions[this.tabCounter];
  }

  scrollToBottom(): void {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        try {
          if (this.myScrollContainer && this.myScrollContainer.nativeElement) {
            this.myScrollContainer.nativeElement.scrollTo({
              top: this.myScrollContainer.nativeElement.scrollHeight,
              behavior: 'smooth',
            });
          }
        } catch (err) {}
      }, 100);
    }
  }

  sendMessage() {
    if (!this.userInput.trim() || this.isHistoryView) return;

    const userMessage = this.userInput;
    const userId = Number(sessionStorage.getItem('currentUserId'));

    // 1. Calculamos el nuevo título visual localmente antes de enviar la API
    const currentTab = this.tabs.find((t) => t.isActive);
    if (currentTab && (currentTab.title === 'Chat actual' || currentTab.title === 'Consulta')) {
      let newTitle = userMessage.trim().split(' ').slice(0, 3).join(' ');
      if (newTitle.length > 20) newTitle = newTitle.substring(0, 20) + '...';
      currentTab.title = newTitle;
    }

    const chatTitle = currentTab ? currentTab.title : 'Consulta';

    this.messages.push({ sender: 'Tú', text: userMessage, isBot: false });
    this.userInput = '';
    this.isLoading = true;
    this.scrollToBottom();

    // 2. Enviamos el chatTitle definitivo para sincronizar con SQLite
    this.chatService.sendMessage(userMessage, this.latestTabId, userId, chatTitle).subscribe({
      next: (res: any) => {
        this.messages.push({ text: res.response, isBot: true });
        this.isLoading = false;
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      error: (err: any) => {
        this.messages.push({ text: 'Lo siento, tuve un error de conexión.', isBot: true });
        this.isLoading = false;
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
    });
  }

  createNewChat() {
    this.tabs.forEach((tab) => (tab.isActive = false));
    this.tabCounter = Date.now();
    this.latestTabId = this.tabCounter;

    this.tabs.push({ id: this.tabCounter, title: 'Chat actual', isActive: true });
    this.chatSessions[this.tabCounter] = [{ text: '¡Hola! He iniciado un nuevo canal para ti. ¿Qué inquietud tienes hoy?', isBot: true }];
    this.messages = this.chatSessions[this.tabCounter];

    this.isSidebarOpen = true;
    this.isHistoryView = false;
    this.cdr.detectChanges();
  }

  deleteTab(tabId: number, event: Event) {
    event.stopPropagation();
    this.tabs = this.tabs.filter((tab) => tab.id !== tabId);
    delete this.chatSessions[tabId];

    if (this.tabs.length > 0) {
      if (!this.tabs.find((t) => t.isActive)) {
        const maxId = Math.max(...this.tabs.map((t) => t.id));
        this.selectTab(maxId);
      }
    } else {
      this.createNewChat();
    }
    this.cdr.detectChanges();
  }

  selectTab(selectedId: number) {
    this.tabs.forEach((tab) => { tab.isActive = tab.id === selectedId; });
    this.latestTabId = selectedId;
    this.messages = this.chatSessions[selectedId] || [];

    const maxId = Math.max(...this.tabs.map((t) => t.id));
    this.isHistoryView = selectedId !== maxId;
    this.cdr.detectChanges();
    this.scrollToBottom();
  }

  logout() {
    sessionStorage.clear();
    this.router.navigate(['/']);
  }
}
