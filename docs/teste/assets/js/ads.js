/* ==========================================================================
   Tabuada Divertida 3.0 — Anúncios (AdMob)
   - Banner fixo no rodapé em todas as telas (espaço reservado, sem pular layout)
   - Intersticial só em pausas naturais (ao sair de um resultado), com intervalo mínimo
   - Premiado (vídeo) opcional: dobrar moedas, vida extra, moedas grátis, baú em dobro
   ========================================================================== */
'use strict';
(function () {
    const TD = window.TD;

    // IDs de produção (os mesmos da versão 2.6.21)
    const IDS = {
        banner: 'ca-app-pub-1754235843684911/1890011753',
        interstitial: 'ca-app-pub-1754235843684911/1612854785',
        rewarded: 'ca-app-pub-1754235843684911/4691033591',
        // Guardados para referência; o plugin atual não tem estes formatos:
        appOpen: 'ca-app-pub-1754235843684911/6117778838',
        native: 'ca-app-pub-1754235843684911/4746873917'
    };
    const TEST_IDS = {
        banner: 'ca-app-pub-3940256099942544/6300978111',
        interstitial: 'ca-app-pub-3940256099942544/1033173712',
        rewarded: 'ca-app-pub-3940256099942544/5224354917'
    };

    const RULES = {
        interstitialGapMs: 60 * 1000,      // intervalo mínimo entre intersticiais
        interstitialFirstMs: 45 * 1000,    // nunca nos primeiros 45s da sessão
        shopRewardCooldownMs: 3 * 60 * 1000,
        dockLabel: 14,
        dockDefault: 56
    };

    const A = TD.ads = {
        IDS: IDS,
        RULES: RULES,
        P: null,
        ready: false,
        sim: false,
        test: false,
        session: Date.now(),
        lastInter: 0,
        fullscreen: false,
        banner: { live: false, requested: false, fails: 0, timer: null, mode: 'ADAPTIVE_BANNER', height: 0 },
        inter: { ready: false, loading: false, done: null },
        reward: { ready: false, loading: false, done: null, earned: false }
    };

    function id(slot) { return A.test ? TEST_IDS[slot] : IDS[slot]; }

    function useTestAds() {
        try {
            const forced = localStorage.getItem('tabuada_force_test_ads');
            if (forced === '1') return true;
            if (forced === '0') return false;
        } catch (e) {}
        const ua = (navigator.userAgent || '').toLowerCase();
        return /sdk_gphone|emulator|android sdk built for x86|generic_x86/.test(ua);
    }

    function setDock(bannerH) {
        const h = Math.max(50, Math.round(bannerH || RULES.dockDefault));
        A.banner.height = h;
        document.documentElement.style.setProperty('--dock-h', h + 'px');
        document.documentElement.style.setProperty('--dock-label', RULES.dockLabel + 'px');
        document.body.classList.add('has-dock');
    }

    const HOUSE = [
        ['🔥', 'Treine todo dia e <b>mantenha sua sequência</b>'],
        ['🎁', 'Seu <b>baú diário</b> tem moedas grátis'],
        ['🧠', 'O <b>Treino Inteligente</b> foca no que você mais erra'],
        ['🚀', 'Bata seu recorde na <b>Galáxia</b>'],
        ['🧮', 'Use a <b>Calculadora Explicada</b> no dever de casa']
    ];
    let houseIdx = 0;
    function rotateHouse() {
        const box = TD.$('#adHouse');
        if (!box) return;
        const h = HOUSE[houseIdx++ % HOUSE.length];
        box.innerHTML = '<span style="font-size:1.3rem">' + h[0] + '</span><span>' + h[1] + '</span>';
    }

    /* ---------------- Inicialização ---------------- */
    A.init = async function () {
        A.sim = /[?&]adsim=1/.test(location.search);
        rotateHouse();
        setInterval(rotateHouse, 9000);
        const P = TD.isNative() ? TD.plugin('AdMob') : null;
        if (!P) {
            if (A.sim) { setDock(RULES.dockDefault); simBanner(); }
            return;
        }
        A.P = P;
        A.test = useTestAds();
        setDock(RULES.dockDefault);
        bind(P);
        try {
            await P.initialize({
                tagForChildDirectedTreatment: true,
                tagForUnderAgeOfConsent: true,
                maxAdContentRating: 'General',
                initializeForTesting: A.test
            });
        } catch (e) { console.log('[ads] init', e); }
        A.ready = true;
        A.showBanner();
        A.loadInter();
        A.loadReward();
    };

    function bind(P) {
        const on = (ev, fn) => { try { P.addListener(ev, fn); } catch (e) {} };
        on('bannerAdLoaded', () => {
            A.banner.live = true; A.banner.fails = 0;
            document.body.classList.add('banner-live');
        });
        on('bannerAdSizeChanged', (s) => {
            if (s && s.height) setDock(s.height);
        });
        on('bannerAdFailedToLoad', () => {
            A.banner.live = false;
            document.body.classList.remove('banner-live');
            A.banner.fails++;
            if (A.banner.fails >= 2 && A.banner.mode === 'ADAPTIVE_BANNER') A.banner.mode = 'BANNER';
            scheduleBannerRetry();
        });
        on('interstitialAdShowed', () => { A.fullscreen = true; });
        on('interstitialAdDismissed', () => { if (A.inter.done) A.inter.done(true); });
        on('interstitialAdFailedToShow', () => { if (A.inter.done) A.inter.done(false); });
        on('onRewardedVideoAdShowed', () => { A.fullscreen = true; });
        on('onRewardedVideoAdReward', () => { A.reward.earned = true; });
        on('onRewardedVideoAdDismissed', () => { if (A.reward.done) A.reward.done(); });
        on('onRewardedVideoAdFailedToShow', () => { if (A.reward.done) A.reward.done(); });
    }

    /* ---------------- Banner do rodapé ---------------- */
    A.showBanner = async function () {
        if (!A.ready || A.banner.requested) return;
        A.banner.requested = true;
        try {
            await A.P.showBanner({ adId: id('banner'), adSize: A.banner.mode, position: 'BOTTOM_CENTER', margin: 0, isTesting: A.test });
        } catch (e) {
            A.banner.requested = false;
            A.banner.fails++;
            scheduleBannerRetry();
        }
    };
    function scheduleBannerRetry() {
        clearTimeout(A.banner.timer);
        const delay = Math.min(60000, 8000 * Math.pow(2, Math.max(0, A.banner.fails - 1)));
        A.banner.timer = setTimeout(async () => {
            if (A.fullscreen || document.hidden) { scheduleBannerRetry(); return; }
            try { await A.P.removeBanner(); } catch (e) {}
            A.banner.requested = false;
            A.showBanner();
        }, delay);
    }
    function afterFullscreen() {
        A.fullscreen = false;
        if (!A.ready) return;
        setTimeout(() => {
            if (A.banner.requested) A.P.resumeBanner().catch(() => {});
            else A.showBanner();
        }, 500);
    }
    A.onResume = function () {
        if (!A.ready || A.fullscreen) return;
        if (A.banner.requested) A.P.resumeBanner().catch(() => {});
        else A.showBanner();
    };
    A.onScreen = function () { /* banner é persistente em todas as telas */ };

    /* ---------------- Intersticial (pausas naturais) ---------------- */
    A.loadInter = async function () {
        if (!A.ready || A.inter.ready || A.inter.loading) return;
        A.inter.loading = true;
        try {
            await A.P.prepareInterstitial({ adId: id('interstitial'), isTesting: A.test, immersiveMode: true });
            A.inter.ready = true;
        } catch (e) {
            A.inter.ready = false;
            setTimeout(() => A.loadInter(), 45000);
        } finally { A.inter.loading = false; }
    };
    A.canInterstitial = function () {
        const now = Date.now();
        if (now - A.session < RULES.interstitialFirstMs) return false;
        if (now - A.lastInter < RULES.interstitialGapMs) return false;
        if (A.sim) return true;
        return A.ready && A.inter.ready && !A.fullscreen;
    };
    // Chamado nas pausas naturais (ex.: ao sair da tela de resultado). Resolve depois que o anúncio fecha.
    A.breakpoint = function () {
        if (!A.canInterstitial()) return Promise.resolve(false);
        if (A.sim) return simFullscreen('Intersticial', 'Aparece só em pausas naturais, no máximo 1 vez por minuto.', 3).then(() => { A.lastInter = Date.now(); return true; });
        return new Promise((resolve) => {
            let finished = false;
            const finish = (shown) => {
                if (finished) return;
                finished = true;
                A.inter.done = null;
                A.inter.ready = false;
                if (shown) A.lastInter = Date.now();
                afterFullscreen();
                A.loadInter();
                resolve(!!shown);
            };
            A.inter.done = finish;
            A.P.showInterstitial().then(() => setTimeout(() => finish(true), 120000)).catch(() => finish(false));
        });
    };

    /* ---------------- Premiado (vídeo opcional) ---------------- */
    A.loadReward = async function () {
        if (!A.ready || A.reward.ready || A.reward.loading) return;
        A.reward.loading = true;
        try {
            await A.P.prepareRewardVideoAd({ adId: id('rewarded'), isTesting: A.test, immersiveMode: true });
            A.reward.ready = true;
        } catch (e) {
            A.reward.ready = false;
            setTimeout(() => A.loadReward(), 30000);
        } finally { A.reward.loading = false; }
    };
    A.rewardAvailable = function () { return A.sim || A.ready; };
    // Retorna true se a pessoa assistiu até o fim e ganhou a recompensa.
    A.showReward = async function () {
        if (A.sim) { await simFullscreen('Vídeo premiado', 'A recompensa só é liberada quando o vídeo termina.', 4); return true; }
        if (!A.ready) return false;
        if (!A.reward.ready) {
            TD.ui.toast('Carregando vídeo…', 'Só um instante', '🎬');
            await A.loadReward();
            if (!A.reward.ready) { TD.ui.toast('Vídeo indisponível agora', 'Tente de novo em alguns segundos', '⏳'); return false; }
        }
        return new Promise((resolve) => {
            let finished = false;
            A.reward.earned = false;
            const finish = () => {
                if (finished) return;
                finished = true;
                A.reward.done = null;
                A.reward.ready = false;
                const ok = A.reward.earned;
                afterFullscreen();
                A.loadReward();
                resolve(ok);
            };
            A.reward.done = finish;
            A.P.showRewardVideoAd().then(() => { A.reward.earned = true; }).catch(() => finish());
            setTimeout(finish, 180000);
        });
    };
    // Botão padrão de vídeo premiado
    A.rewardButton = function (label, act, arg, cls) {
        if (!A.rewardAvailable()) return '';
        return '<button class="btn block ' + (cls || 'gold') + '" data-act="' + act + '"' + (arg != null ? ' data-arg="' + arg + '"' : '') + '>' +
            TD.icon('video', 20) + '<span>' + label + '</span><span class="badge-ad">vídeo</span></button>';
    };

    /* ---------------- Simulação no navegador (?adsim=1) ---------------- */
    function simBanner() {
        const dock = TD.$('#adDock');
        if (!dock || TD.$('#simBanner')) return;
        const b = document.createElement('div');
        b.id = 'simBanner';
        b.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:' + RULES.dockDefault + 'px;display:flex;align-items:center;justify-content:center;gap:10px;background:repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9 10px,#e2e8f0 10px,#e2e8f0 20px);color:#334155;font:800 .8rem Nunito,sans-serif;';
        b.innerHTML = '<span style="background:#facc15;color:#422006;padding:2px 6px;border-radius:4px;font-size:.65rem">AD</span> Banner AdMob (simulação) • 320×50 adaptativo';
        dock.appendChild(b);
        document.body.classList.add('banner-live');
    }
    function simFullscreen(title, text, secs) {
        return new Promise((resolve) => {
            const ov = document.createElement('div');
            ov.style.cssText = 'position:fixed;inset:0;z-index:9000;background:#0f172a;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;padding:24px;font-family:Nunito,sans-serif;';
            ov.innerHTML = '<div style="font-size:3rem">📺</div><div style="font:800 1.6rem Baloo 2,sans-serif">' + title + ' (simulação)</div><div style="opacity:.75;max-width:320px">' + text + '</div><button style="margin-top:12px;padding:12px 22px;border-radius:14px;background:#334155;color:#fff;font-weight:800" disabled>Fechar em ' + secs + '</button>';
            document.body.appendChild(ov);
            const btn = ov.querySelector('button');
            let n = secs;
            const t = setInterval(() => {
                n--;
                if (n > 0) { btn.textContent = 'Fechar em ' + n; return; }
                clearInterval(t);
                btn.disabled = false; btn.textContent = 'Fechar ✕'; btn.style.background = '#22c55e';
                btn.onclick = () => { ov.remove(); resolve(true); };
            }, 1000);
        });
    }
})();
