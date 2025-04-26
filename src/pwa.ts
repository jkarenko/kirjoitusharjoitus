/**
 * PWA Manager
 * Handles PWA installation and related functionality
 */

// Define the BeforeInstallPromptEvent interface
// Must be declared globally to extend Window interface
declare global {
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
      outcome: 'accepted' | 'dismissed';
      platform: string;
    }>;
    prompt(): Promise<void>;
  }
  interface WindowEventMap {
    'beforeinstallprompt': BeforeInstallPromptEvent;
  }
}

export class PWAManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private installed = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize PWA event listeners
   */
  private initialize(): void {
    // Handle PWA install prompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.showInstallPrompt();
    });

    // Handle successful installation
    window.addEventListener('appinstalled', () => {
      this.installed = true;
      this.deferredPrompt = null;
      console.log('PWA installed successfully');
    });
  }

  /**
   * Show installation prompt to the user
   */
  private showInstallPrompt(): void {
    if (!this.deferredPrompt || this.installed) return;

    // Create and show install prompt UI
    const promptContainer = document.createElement('div');
    promptContainer.className = 'pwa-prompt';
    promptContainer.innerHTML = `
      <div class="pwa-prompt-content">
        <h3>Install App</h3>
        <p>Install this app on your device for the best experience.</p>
        <div class="pwa-prompt-buttons">
          <button class="btn btn-secondary" id="pwa-cancel">Not Now</button>
          <button class="btn btn-primary" id="pwa-install">Install</button>
        </div>
      </div>
    `;

    document.body.appendChild(promptContainer);

    // Handle install button click
    document.getElementById('pwa-install')?.addEventListener('click', async () => {
      if (this.deferredPrompt) {
        await this.deferredPrompt.prompt();
        const result = await this.deferredPrompt.userChoice;
        if (result.outcome === 'accepted') {
          console.log('PWA installation accepted');
        }
        this.deferredPrompt = null;
        promptContainer.remove();
      }
    });

    // Handle cancel button click
    document.getElementById('pwa-cancel')?.addEventListener('click', () => {
      promptContainer.remove();
    });
  }
}

