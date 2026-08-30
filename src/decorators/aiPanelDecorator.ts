import { Injectable, ApplicationRef, Injector, EnvironmentInjector, createComponent, ComponentRef } from '@angular/core'
import { HotkeysService, ConfigService } from 'tabby-core'
import { TerminalDecorator, BaseTerminalTabComponent } from 'tabby-terminal'
import { AiCliPanelComponent } from '../components/aiPanel.component'
import { TOGGLE_PANEL_HOTKEY } from '../hotkeys'

/**
 * Mounts an `AiCliPanelComponent` inside a terminal tab's own root element
 * (absolutely positioned, shrinking the terminal's `.content` to make room)
 * rather than as a single app-wide panel, so each terminal tab gets its own
 * independent chat bound to that tab's session/scrollback.
 */
@Injectable({ providedIn: 'root' })
export class AiCliPanelDecorator extends TerminalDecorator {
    private panels = new Map<BaseTerminalTabComponent<any>, ComponentRef<AiCliPanelComponent>>()

    constructor (
        private hotkeys: HotkeysService,
        private config: ConfigService,
        private appRef: ApplicationRef,
        private injector: Injector,
        private envInjector: EnvironmentInjector,
    ) {
        super()
    }

    attach (terminal: BaseTerminalTabComponent<any>): void {
        this.subscribeUntilDetached(
            terminal,
            this.hotkeys.hotkey$.subscribe(hotkey => {
                if (hotkey === TOGGLE_PANEL_HOTKEY && terminal.hasFocus) {
                    this.toggle(terminal)
                }
            }),
        )
    }

    detach (terminal: BaseTerminalTabComponent<any>): void {
        this.destroy(terminal)
        super.detach(terminal)
    }

    toggle (terminal: BaseTerminalTabComponent<any>): void {
        if (this.panels.has(terminal)) {
            this.destroy(terminal)
        } else {
            this.show(terminal)
        }
    }

    private show (terminal: BaseTerminalTabComponent<any>): void {
        const ref = createComponent(AiCliPanelComponent, {
            environmentInjector: this.envInjector,
            elementInjector: this.injector,
        })
        ref.instance.tab = terminal
        ref.instance.closed.subscribe(() => this.destroy(terminal))

        const hostElement: HTMLElement = terminal.element.nativeElement
        const panelElement: HTMLElement = ref.location.nativeElement
        const widthPercent = this.config.store.aiCliLauncher?.chat?.panelWidthPercent ?? 38
        panelElement.style.cssText = `
            position: absolute;
            top: 0;
            right: 0;
            width: ${widthPercent}%;
            height: 100%;
            z-index: 100;
            display: flex;
            flex-direction: column;
            background: var(--theme-bg, #171717);
        `

        hostElement.appendChild(panelElement)
        this.appRef.attachView(ref.hostView)
        ref.changeDetectorRef.detectChanges()

        this.panels.set(terminal, ref)
        this.resizeContent(terminal, widthPercent)
    }

    private destroy (terminal: BaseTerminalTabComponent<any>): void {
        const ref = this.panels.get(terminal)
        if (!ref) {
            return
        }
        this.appRef.detachView(ref.hostView)
        ref.destroy()
        this.panels.delete(terminal)
        this.resizeContent(terminal, 0)
    }

    private resizeContent (terminal: BaseTerminalTabComponent<any>, panelWidthPercent: number): void {
        const contentEl = terminal.element.nativeElement.querySelector('.content') as HTMLElement | null
        if (contentEl) {
            contentEl.style.width = panelWidthPercent > 0 ? `${100 - panelWidthPercent}%` : ''
        }
        setTimeout(() => {
            (terminal.frontend as any)?.resizeHandler?.()
        }, 100)
    }
}
