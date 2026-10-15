/* ==========================================================================
   Tabuada Divertida 3.0 — Inicialização
   Criado por David Duarte
   ========================================================================== */
'use strict';
(function () {
    const TD = window.TD;

    // Versão web no iPhone/iPad: ensina a "instalar" pela Tela de Início (abre em tela cheia, como app)
    TD.isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    TD.isStandalone = () => window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    TD.maybeIosHint = function (delay) {
        if (TD.isNative() || !TD.isIOS() || TD.isStandalone()) return;
        try { if (localStorage.getItem('td3_ioshint')) return; } catch (e) { return; }
        setTimeout(() => {
            if (TD.ui.sheets.length) return;
            try { localStorage.setItem('td3_ioshint', '1'); } catch (e) {}
            TD.ui.sheet('<div class="center">' + TD.mascot('wave', 80, 'wave') + '<h3>Coloque o app no seu iPhone</h3><p class="muted" style="margin:0">Ele abre em tela cheia, igual a um app de verdade. Leva 10 segundos:</p></div>' +
                '<div class="steps mt16">' +
                '<div class="step"><span class="n">1</span><div>No Safari, toque em <b>Compartilhar</b> (o quadrado com a seta ⬆️ na barra de baixo).</div></div>' +
                '<div class="step"><span class="n">2</span><div>Role e toque em <b>Adicionar à Tela de Início</b>.</div></div>' +
                '<div class="step"><span class="n">3</span><div>Toque em <b>Adicionar</b>. Pronto! O ícone do Pi aparece na sua tela.</div></div></div>' +
                '<div class="actions"><button class="btn green block" data-act="closeSheet">Entendi!</button></div>');
        }, delay || 2500);
    };

    function boot() {
        TD.applyTheme(TD.state.settings.theme);
        TD.bg.init();
        TD.daily.ensure();
        TD.native.init();
        if (TD.state.onboarded) { TD.nav.go('home', {}, { root: true }); TD.maybeIosHint(3000); }
        else TD.nav.go('onboard', {}, { root: true });
        TD.ads.init().catch((e) => console.log('[ads]', e));
        const unlock = () => { TD.unlockAudio(); window.removeEventListener('pointerdown', unlock, true); };
        window.addEventListener('pointerdown', unlock, true);
        window.addEventListener('nativeinsets', () => window.dispatchEvent(new Event('resize')));
        const splash = document.getElementById('splash');
        if (splash) setTimeout(() => { splash.classList.add('out'); setTimeout(() => splash.remove(), 600); }, 1100);
        if (!TD.isNative() && 'serviceWorker' in navigator && location.protocol === 'https:') {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
