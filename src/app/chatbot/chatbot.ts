import {
  Component,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
  Inject,
  PLATFORM_ID,
  OnInit,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  latestTabId: number = 1;
  tabCounter: number = 1; // ID interno (nunca se muestra al usuario)
  isHistoryView: boolean = false;

  tabs: { id: number; title: string; isActive: boolean }[] = [];

  constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const savedTabs = sessionStorage.getItem('chatbotTabs');
      const savedSessions = sessionStorage.getItem('chatbotSessions');

      if (savedTabs && savedSessions) {
        this.tabs = JSON.parse(savedTabs);
        this.chatSessions = JSON.parse(savedSessions);
        this.tabCounter = Math.max(...this.tabs.map((t) => t.id), 1);

        const activeTab = this.tabs.find((t) => t.isActive);
        this.latestTabId = activeTab ? activeTab.id : this.tabs[this.tabs.length - 1].id;
        this.messages = this.chatSessions[this.latestTabId] || [];

        const maxId = Math.max(...this.tabs.map((t) => t.id));
        this.isHistoryView = this.latestTabId !== maxId;
        return;
      }
    }

    // Inicializamos con "Chat actual"
    this.tabs = [{ id: 1, title: 'Chat actual', isActive: true }];
    this.chatSessions[1] = [
      {
        text: '¡Hola! He iniciado un canal para ti. ¿Qué inquietud tienes hoy sobre el futuro de tu profesión y la Inteligencia Artificial?',
        isBot: true,
      },
    ];
    this.messages = this.chatSessions[1];
    this.saveSession();
  }

  saveSession() {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem('chatbotTabs', JSON.stringify(this.tabs));
      sessionStorage.setItem('chatbotSessions', JSON.stringify(this.chatSessions));
    }
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
        } catch (err) {
          console.error('Error en scroll:', err);
        }
      }, 100);
    }
  }

  sendMessage() {
    if (!this.userInput.trim() || this.isHistoryView) return;

    const userMessage = this.userInput;

    // MAGIA 1: Renombrar con las palabras del usuario solo si se llama "Chat actual"
    const currentTab = this.tabs.find((t) => t.isActive);
    if (currentTab && currentTab.title === 'Chat actual') {
      let newTitle = userMessage.trim().split(' ').slice(0, 3).join(' ');
      if (newTitle.length > 20) newTitle = newTitle.substring(0, 20) + '...';
      currentTab.title = newTitle;
    }

    this.messages.push({
      sender: 'Tú',
      text: userMessage,
      isBot: false,
    });

    this.userInput = '';
    this.isLoading = true;
    this.saveSession();
    this.scrollToBottom();

    this.chatService.sendMessage(userMessage).subscribe({
      next: (res: any) => {
        this.messages.push({ text: res.response, isBot: true });
        this.isLoading = false;
        this.saveSession();
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      error: (err: any) => {
        console.error('Error:', err);
        this.messages.push({ text: 'Lo siento, tuve un error de conexión.', isBot: true });
        this.isLoading = false;
        this.saveSession();
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
    });
  }

  createNewChat() {
    const currentActive = this.tabs.find((t) => t.isActive);

    // MAGIA 2: Calcular el consecutivo VISUAL real (Consulta 1, Consulta 2, etc.)
    if (currentActive && currentActive.title === 'Chat actual') {
      let maxConsulta = 0;

      // Escaneamos las pestañas que existen actualmente en la pantalla
      this.tabs.forEach((t) => {
        if (t.title.startsWith('Consulta ')) {
          // Extraemos el número de la palabra "Consulta X"
          const num = parseInt(t.title.replace('Consulta ', ''), 10);
          if (!isNaN(num) && num > maxConsulta) {
            maxConsulta = num;
          }
        }
      });

      // Lo nombramos con el número que sigue
      currentActive.title = `Consulta ${maxConsulta + 1}`;
    }

    this.tabs.forEach((tab) => (tab.isActive = false));

    this.tabCounter++; // El ID interno sigue sumando normal para no dañar la memoria
    this.latestTabId = this.tabCounter;

    // El nuevo chat nace como "Chat actual"
    this.tabs.push({
      id: this.tabCounter,
      title: 'Chat actual',
      isActive: true,
    });

    this.chatSessions[this.tabCounter] = [
      {
        text: '¡Hola! He iniciado un nuevo canal para ti. ¿Qué inquietud tienes hoy?',
        isBot: true,
      },
    ];

    this.messages = this.chatSessions[this.tabCounter];
    this.userInput = '';
    this.isSidebarOpen = true;
    this.isHistoryView = false;

    this.saveSession();
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
      this.tabCounter = 0;
      this.createNewChat();
    }
    this.saveSession();
  }

  selectTab(selectedId: number) {
    this.tabs.forEach((tab) => {
      tab.isActive = tab.id === selectedId;
    });

    this.latestTabId = selectedId;
    this.messages = this.chatSessions[selectedId] || [];

    const maxId = Math.max(...this.tabs.map((t) => t.id));
    this.isHistoryView = selectedId !== maxId;

    this.saveSession();
    this.scrollToBottom();
  }
}
