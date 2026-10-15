/* ==========================================================================
   Tabuada Divertida 3.0 — Perfil, Mapa do Cérebro, Loja e Configurações
   ========================================================================== */
'use strict';
(function () {
    const TD = window.TD;
    const HEAT = ['#ef4444', '#f97316', '#f59e0b', '#a3e635', '#22c55e', '#10b981'];
    TD.CREDIT = 'David Duarte';

    /* ---------------- Perfil ---------------- */
    TD.screens.profile = {
        tab: 'profile', topbar: 'profile', title: 'Seu perfil',
        render() {
            const s = TD.state, p = s.profile, lv = TD.levelInfo(s.xp);
            const total = s.stats.correct + s.stats.wrong;
            const acc = total ? Math.round(s.stats.correct / total * 100) : 0;
            const avg = s.stats.timed ? (s.stats.totalMs / s.stats.timed / 1000) : 0;
            const nBadges = Object.keys(s.badges).length;
            let html = '<div class="card mt8 prof-head"><div class="ring-wrap">' + TD.ui.ring(lv.pct, 104, 7, '#fbbf24') + '<div style="position:absolute">' + TD.avatarHtml(p.avatar, 84) + '</div></div>' +
                '<div class="grow"><div class="h3" style="font-size:1.4rem">' + TD.esc(p.name || 'Jogador') + '</div><div class="small muted">Nível ' + lv.level + ' • ' + lv.cur + '/' + lv.need + ' XP</div>' +
                '<div class="row mt8"><button class="btn sm ghost" data-act="go" data-arg="settings">' + TD.icon('settings', 18) + 'Ajustes</button><button class="btn sm gold" data-act="go" data-arg="shop">' + TD.icon('bag', 18) + 'Loja</button></div></div></div>';
            html += '<div class="stat-grid mt12">' +
                tile(TD.fmt(s.stats.correct), 'acertos') + tile(acc + '%', 'precisão') + tile(TD.daily.streak() + '🔥', 'dias seguidos') +
                tile(TD.fmt(s.coins), 'moedas') + tile(avg ? String(avg.toFixed(1)).replace('.', ',') + 's' : '—', 'tempo médio') + tile(nBadges + '/' + TD.BADGES.length, 'conquistas') + '</div>';
            html += '<div class="h2">Esta semana</div><div class="card">' + weekBars() + '</div>';
            const mastered = TD.learn.masteredCount();
            html += '<div class="h2">Mapa do Cérebro <small>' + mastered + '/100 dominadas</small></div><div class="card"><p class="small muted" style="margin:0 0 10px">Cada quadrinho é uma conta da tabuada. Toque para treinar.</p>' + heatmap() +
                '<div class="legend"><span><i style="background:var(--surface-2)"></i>Nunca vista</span><span><i style="background:' + HEAT[0] + '"></i>Treinar</span><span><i style="background:' + HEAT[2] + '"></i>Quase</span><span><i style="background:' + HEAT[5] + '"></i>Dominada</span></div></div>';
            html += '<div class="h2">Recordes</div><div class="list">' + TD.games.order.map((id) => {
                const d = TD.games.defs[id];
                return '<button class="card tap list-item" data-act="openGame" data-arg="' + id + '"><div style="font-size:1.8rem;width:44px;text-align:center">' + d.emoji + '</div><div class="grow"><b>' + d.name + '</b><small>' + (d.unit || 'pontos') + '</small></div><div class="num" style="font-size:1.4rem;color:var(--gold)">' + (s.best[id] || 0) + '</div></button>';
            }).join('') + '</div>';
            html += '<div class="h2">Conquistas <small>' + nBadges + ' de ' + TD.BADGES.length + '</small></div><div class="badge-grid">' + TD.BADGES.map((b) => '<button class="badge-it' + (s.badges[b.id] ? ' got' : '') + '" data-act="badgeInfo" data-arg="' + b.id + '"><div class="bi">' + b.e + '</div>' + b.n + '</button>').join('') + '</div>';
            html += credit();
            return html;
        },
        mount(el) {
            TD.$$('.wb i', el).forEach((i) => { const h = i.dataset.h; i.style.height = '0%'; requestAnimationFrame(() => setTimeout(() => { i.style.height = h; }, 60)); });
        }
    };
    function tile(v, k) { return '<div class="stat-tile"><b>' + v + '</b><small>' + k + '</small></div>'; }
    function weekBars() {
        const days = [], names = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
        for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push({ k: TD.dateKey(d), n: names[d.getDay()], today: i === 0 }); }
        const max = Math.max(10, ...days.map((d) => TD.state.activity[d.k] || 0));
        return '<div class="week-bars">' + days.map((d) => { const v = TD.state.activity[d.k] || 0; return '<div class="wb' + (d.today ? ' today' : '') + '"><b>' + (v || '') + '</b><i data-h="' + Math.max(4, Math.round(v / max * 100)) + '%"></i><small>' + d.n + '</small></div>'; }).join('') + '</div>' +
            '<p class="small muted center" style="margin:10px 0 0">Respostas por dia • recorde de sequência: ' + (TD.state.daily.bestStreak || 0) + ' dias</p>';
    }
    function heatmap() {
        let h = '<div class="heat"><div class="hh">×</div>';
        for (let b = 1; b <= 10; b++) h += '<div class="hh">' + b + '</div>';
        for (let a = 1; a <= 10; a++) {
            h += '<button class="hrow" data-act="openTable" data-arg="' + a + '">' + a + '</button>';
            for (let b = 1; b <= 10; b++) {
                const box = TD.learn.box(a + 'x' + b);
                const bg = box < 0 ? 'var(--surface-2)' : HEAT[Math.min(5, Math.round(box))];
                h += '<button class="hc" style="background:' + bg + (box >= 5 ? ';box-shadow:0 0 8px #10b981' : '') + '" data-act="factPractice" data-arg="' + a + 'x' + b + '">' + (box >= 0 ? a * b : '') + '</button>';
            }
        }
        return h + '</div>';
    }
    function credit() {
        return '<div class="center mt24 muted small" style="padding-bottom:6px">' + TD.mascot('happy', 54) + '<div><b style="color:var(--text)">Tabuada Divertida</b> v' + TD.VERSION + '</div><div>Criado com ❤️ por <b style="color:var(--text)">' + TD.CREDIT + '</b></div></div>';
    }
    TD.creditHtml = credit;
    TD.act.factPractice = (key) => {
        const p = key.split('x');
        TD.ui.sheet('<div class="center"><h3>' + p[0] + ' × ' + p[1] + '</h3><p class="muted">Vamos treinar esta conta e as parecidas?</p>' + TD.learn.dotGrid(Number(p[0]), Number(p[1])) + '</div>' +
            '<div class="actions"><button class="btn green block" data-act="factGo" data-arg="' + key + '">' + TD.icon('play', 20) + 'Treinar agora</button></div>');
    };
    TD.act.factGo = (key) => { TD.ui.closeTop(); TD.learn.start({ kind: 'fact', key: key, title: 'Treino da conta ' + key.replace('x', ' × ') }); };
    TD.act.badgeInfo = (id) => {
        const b = TD.BADGES.find((x) => x.id === id), got = TD.state.badges[id];
        TD.ui.sheet('<div class="center"><div class="badge-it' + (got ? ' got' : '') + '" style="display:inline-flex"><div class="bi" style="width:84px;height:84px;font-size:2.6rem">' + b.e + '</div></div><h3 class="mt12">' + b.n + '</h3><p class="muted">' + b.d + '</p><p>' + (got ? '✅ Conquistada em ' + new Date(got).toLocaleDateString('pt-BR') : '🔒 Ainda não conquistada • vale 40 moedas') + '</p></div>', { center: true });
    };

    /* ---------------- Loja ---------------- */
    let shopTab = 'avatars';
    TD.screens.shop = {
        tab: 'profile', topbar: 'back', tabbar: false, title: 'Loja', sub: 'Personalize do seu jeito',
        render() {
            const s = TD.state;
            const left = Math.max(0, TD.ads.RULES.shopRewardCooldownMs - (Date.now() - (s.ads.shopReward || 0)));
            let html = '<div class="card-grad gold mt8 row"><div style="font-size:2.4rem">🪙</div><div class="grow"><div class="small" style="opacity:.8">Suas moedas</div><div class="num" style="font-size:2rem">' + TD.fmt(s.coins) + '</div></div></div>';
            if (TD.ads.rewardAvailable()) {
                html += '<div class="mt12" id="shopRw">' + (left > 0 ? '<button class="btn ghost block" disabled>' + TD.icon('clock', 18) + 'Novo vídeo em ' + Math.ceil(left / 60000) + ' min</button>' : TD.ads.rewardButton('Ganhar 40 moedas grátis', 'shopReward')) + '</div>';
            }
            html += '<div class="seg mt16"><button class="' + (shopTab === 'avatars' ? 'active' : '') + '" data-act="shopTab" data-arg="avatars">Avatares</button><button class="' + (shopTab === 'themes' ? 'active' : '') + '" data-act="shopTab" data-arg="themes">Temas</button></div>';
            if (shopTab === 'avatars') {
                html += '<div class="shop-grid mt12">' + TD.AVATARS.map((a) => {
                    const owned = a.price === 0 || s.owned.avatars[a.id], eq = s.profile.avatar === a.id;
                    return '<button class="shop-item' + (eq ? ' equipped' : '') + '" data-act="shopAvatar" data-arg="' + a.id + '">' + TD.avatarHtml(a.id, 58) +
                        '<span class="price">' + (eq ? '✅ Usando' : owned ? 'Usar' : TD.icon('star', 14, ' style="color:var(--gold)"') + a.price) + '</span></button>';
                }).join('') + '</div>';
            } else {
                html += '<div class="shop-grid mt12">' + TD.THEMES.map((t) => {
                    const owned = t.price === 0 || s.owned.themes[t.id], eq = s.settings.theme === t.id;
                    return '<button class="shop-item' + (eq ? ' equipped' : '') + '" data-act="shopTheme" data-arg="' + t.id + '"><div class="theme-swatch" style="background:' + t.sw + '"></div><b class="small">' + t.name + '</b>' +
                        '<span class="price">' + (eq ? '✅ Usando' : owned ? 'Usar' : TD.icon('star', 14, ' style="color:var(--gold)"') + t.price) + '</span></button>';
                }).join('') + '</div>';
            }
            html += '<p class="small muted center mt16">Ganhe moedas jogando, completando missões, abrindo o baú diário e subindo de nível.</p>';
            return html;
        }
    };
    TD.act.shopTab = (t) => { shopTab = t; TD.nav.refresh(); };
    TD.act.shopAvatar = async (id) => {
        const s = TD.state, a = TD.avatarById(id);
        const owned = a.price === 0 || s.owned.avatars[id];
        if (!owned) {
            if (s.coins < a.price) { TD.ui.toast('Moedas insuficientes', 'Faltam ' + (a.price - s.coins) + ' moedas', '🪙'); TD.sfx('wrong'); return; }
            const ok = await TD.ui.confirm('Comprar avatar?', 'Usar ' + a.price + ' moedas para liberar ' + a.e + '?', 'Comprar');
            if (!ok) return;
            TD.spend(a.price); s.owned.avatars[id] = 1; TD.sfx('chest'); TD.fx.confetti(60);
        }
        s.profile.avatar = id; TD.save(); TD.checkBadges(); TD.nav.refresh();
    };
    TD.act.shopTheme = async (id) => {
        const s = TD.state, t = TD.THEMES.find((x) => x.id === id);
        const owned = t.price === 0 || s.owned.themes[id];
        if (!owned) {
            if (s.coins < t.price) { TD.ui.toast('Moedas insuficientes', 'Faltam ' + (t.price - s.coins) + ' moedas', '🪙'); TD.sfx('wrong'); return; }
            const ok = await TD.ui.confirm('Comprar tema?', 'Usar ' + t.price + ' moedas no tema ' + t.name + '?', 'Comprar');
            if (!ok) return;
            TD.spend(t.price); s.owned.themes[id] = 1; TD.sfx('chest'); TD.fx.confetti(60);
        }
        s.settings.theme = id; TD.save(); TD.applyTheme(id); TD.checkBadges(); TD.nav.refresh();
    };
    TD.act.shopReward = async (a, btn) => {
        btn.disabled = true;
        const ok = await TD.ads.showReward();
        if (ok) { TD.state.ads.shopReward = Date.now(); TD.addCoins(40, btn); TD.ui.toast('+40 moedas!', 'Obrigado por assistir', '🎁'); }
        TD.nav.refresh();
    };

    /* ---------------- Lembrete diário (notificação local) ---------------- */
    TD.reminder = {
        available() { return TD.isNative() && !!TD.plugin('LocalNotifications'); },
        async set(on, hour) {
            const LN = TD.plugin('LocalNotifications');
            const s = TD.state.settings;
            if (!LN) { s.reminder = false; return false; }
            try { await LN.cancel({ notifications: [{ id: 3001 }] }); } catch (e) {}
            if (!on) { s.reminder = false; TD.save(); return true; }
            try {
                let perm = await LN.checkPermissions();
                if (perm.display !== 'granted') perm = await LN.requestPermissions();
                if (perm.display !== 'granted') { s.reminder = false; TD.save(); TD.ui.toast('Notificações bloqueadas', 'Ative nas configurações do celular', '🔕'); return false; }
                await LN.schedule({ notifications: [{ id: 3001, title: 'Hora de treinar! 🧠', body: 'Suas missões e o baú diário estão te esperando. Não perca sua sequência! 🔥', schedule: { on: { hour: hour, minute: 0 }, allowWhileIdle: true } }] });
                s.reminder = true; s.reminderHour = hour; TD.save();
                return true;
            } catch (e) { console.log('[reminder]', e); s.reminder = false; TD.save(); return false; }
        }
    };

    /* ---------------- Portão para adultos (links externos) ---------------- */
    const WORDS = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    TD.parentGate = function (onPass) {
        const d = [TD.rand(1, 9), TD.rand(0, 9), TD.rand(0, 9)];
        TD.ui.sheet('<h3>Peça ajuda a um adulto</h3><p class="muted">Para continuar, digite os números: <b>' + d.map((x) => WORDS[x]).join(', ') + '</b></p>' +
            '<input class="inp" id="pgIn" inputmode="numeric" maxlength="3" autocomplete="off" style="text-align:center;letter-spacing:.3em">' +
            '<div class="actions"><button class="btn block" id="pgOk">Continuar</button></div>', {
            center: true,
            mount(el, api) {
                const go = () => { if (TD.$('#pgIn', el).value.trim() === d.join('')) { api.close(); onPass(); } else { TD.sfx('wrong'); TD.$('#pgIn', el).value = ''; TD.ui.toast('Números incorretos', 'Tente de novo', '🔒'); } };
                TD.$('#pgOk', el).onclick = go;
                setTimeout(() => TD.$('#pgIn', el).focus(), 300);
            }
        });
    };
    TD.openExternal = function (url) {
        if (TD.isNative()) { window.location.href = url; return; }
        window.open(url, '_blank', 'noopener');
    };

    /* ---------------- Configurações ---------------- */
    TD.screens.settings = {
        tab: 'profile', topbar: 'back', tabbar: false, title: 'Ajustes', sub: 'Do seu jeito',
        render() {
            const s = TD.state, st = s.settings, p = s.profile;
            const tg = (key, ic, t, d) => '<button class="set-row" data-act="toggleSet" data-arg="' + key + '"><div class="ico-badge smart" style="width:42px;height:42px;border-radius:14px">' + TD.icon(ic, 20) + '</div><div class="grow"><b>' + t + '</b><small>' + d + '</small></div><span class="toggle' + (st[key] ? ' on' : '') + '"></span></button>';
            let html = '<div class="h2">Perfil</div><div class="card">' +
                '<button class="set-row" data-act="editName">' + TD.avatarHtml(p.avatar, 42) + '<div class="grow"><b>' + TD.esc(p.name || 'Jogador') + '</b><small>Toque para mudar o nome</small></div>' + TD.icon('edit', 20) + '</button>' +
                '<div class="set-row" style="display:block"><b>Quem usa o app</b><div class="seg mt8">' + [['kid', '🧒 Criança'], ['teen', '🧑 Jovem'], ['adult', '🧑‍💼 Adulto']].map((o) => '<button class="' + (p.age === o[0] ? 'active' : '') + '" data-act="setAge" data-arg="' + o[0] + '">' + o[1] + '</button>').join('') + '</div><small class="muted">Ajusta a dificuldade e o jeito de responder.</small></div>' +
                '<div class="set-row" style="display:block"><b>Jeito de responder</b><div class="seg mt8">' + [['auto', 'Automático'], ['options', 'Opções'], ['type', 'Digitar']].map((o) => '<button class="' + (st.answerMode === o[0] ? 'active' : '') + '" data-act="setAnswer" data-arg="' + o[0] + '">' + o[1] + '</button>').join('') + '</div></div></div>';
            html += '<div class="h2">Som e sensações</div><div class="card">' + tg('sound', 'sound', 'Efeitos sonoros', 'Sons de acerto, jogos e botões') + tg('haptics', 'vibrate', 'Vibração', 'Pequenas vibrações ao tocar') + '</div>';
            if (TD.reminder.available()) {
                html += '<div class="h2">Lembrete diário</div><div class="card">' + tg('reminder', 'bell', 'Lembrar de treinar', 'Uma notificação por dia para não perder a sequência') +
                    (st.reminder ? '<div class="chips mt8">' + [8, 12, 15, 18, 20].map((h) => '<button class="chip' + (st.reminderHour === h ? ' active' : '') + '" data-act="setHour" data-arg="' + h + '">' + h + 'h</button>').join('') + '</div>' : '') + '</div>';
            }
            html += '<div class="h2">Sobre</div><div class="card">' +
                '<button class="set-row" data-act="privacy"><div class="ico-badge learn" style="width:42px;height:42px;border-radius:14px">' + TD.icon('shield', 20) + '</div><div class="grow"><b>Política de privacidade</b><small>Não coletamos dados pessoais</small></div>' + TD.icon('chev', 18) + '</button>' +
                '<button class="set-row" data-act="about"><div class="ico-badge gold" style="width:42px;height:42px;border-radius:14px">' + TD.icon('info', 20) + '</div><div class="grow"><b>Sobre o app</b><small>Versão ' + TD.VERSION + (TD.isNative() ? '' : ' (navegador)') + ' • Novidades</small></div>' + TD.icon('chev', 18) + '</button>' +
                (TD.isNative() ? '' : '<button class="set-row" data-act="getAndroid"><div class="ico-badge tools" style="width:42px;height:42px;border-radius:14px">' + TD.icon('play', 20) + '</div><div class="grow"><b>Baixar o app Android</b><small>Grátis na Google Play</small></div>' + TD.icon('chev', 18) + '</button>') +
                '<button class="set-row" data-act="resetAll"><div class="ico-badge fire" style="width:42px;height:42px;border-radius:14px">' + TD.icon('trash', 20) + '</div><div class="grow"><b>Apagar progresso</b><small>Começar tudo do zero</small></div></button></div>';
            html += credit();
            return html;
        }
    };
    TD.act.toggleSet = async (key) => {
        const st = TD.state.settings;
        if (key === 'reminder') { await TD.reminder.set(!st.reminder, st.reminderHour || 18); TD.nav.refresh(); if (st.reminder) TD.ui.toast('Lembrete ativado', 'Todos os dias às ' + st.reminderHour + 'h', '🔔'); return; }
        st[key] = !st[key]; TD.save();
        if (key === 'sound' && st.sound) TD.sfx('correct');
        TD.nav.refresh();
    };
    TD.act.setHour = async (h) => { await TD.reminder.set(true, Number(h)); TD.nav.refresh(); TD.ui.toast('Lembrete às ' + h + 'h', 'Combinado!', '🔔'); };
    TD.act.setAge = (a) => { TD.state.profile.age = a; TD.save(); TD.nav.refresh(); };
    TD.act.setAnswer = (m) => { TD.state.settings.answerMode = m; TD.save(); TD.nav.refresh(); };
    TD.act.editName = () => {
        TD.ui.sheet('<h3>Seu nome</h3><input class="name-input mt12" id="nmIn" maxlength="18" value="' + TD.esc(TD.state.profile.name) + '"><div class="actions"><button class="btn green block" id="nmOk">Salvar</button></div>', {
            center: true,
            mount(el, api) {
                TD.$('#nmOk', el).onclick = () => { const v = TD.$('#nmIn', el).value.trim().slice(0, 18); if (v) { TD.state.profile.name = v; TD.save(); } api.close(); TD.nav.refresh(); };
                setTimeout(() => TD.$('#nmIn', el).focus(), 300);
            }
        });
    };
    TD.act.privacy = () => TD.parentGate(() => TD.openExternal(TD.PRIVACY_URL));
    TD.act.getAndroid = () => TD.parentGate(() => TD.openExternal(TD.PLAY_URL));
    TD.act.resetAll = async () => {
        const ok = await TD.ui.confirm('Apagar todo o progresso?', 'Moedas, níveis, recordes e conquistas serão apagados. Isso não pode ser desfeito.', 'Apagar tudo', true);
        if (!ok) return;
        const fresh = TD.defaults();
        fresh.onboarded = true;
        fresh.profile = TD.state.profile;
        fresh.settings = TD.state.settings;
        fresh.settings.theme = 'cosmos';
        TD.state = fresh; TD.save(true); TD.applyTheme('cosmos');
        TD.ui.toast('Progresso apagado', 'Vamos começar de novo!', '🌱');
        TD.nav.go('home', {}, { root: true });
    };
    TD.CHANGELOG = [
        'Visual totalmente novo, com 5 temas e o mascote Pi',
        'Treino Inteligente: foca nas contas que você mais erra',
        'Jogos em 3D: Galáxia, Corrida Neon e Balões',
        'Novos jogos: Ninja dos Números, Memória, Relâmpago e Que Horas São?',
        'Trilhas de ×, +, − e ÷ em mapa de fases',
        'Mapa do Cérebro, conquistas, missões e baú diário',
        '9 ferramentas: calculadora explicada, porcentagem, juros e mais',
        'Sons novos e musicais, vibração e lembrete diário'
    ];
    TD.act.about = () => {
        TD.ui.sheet('<div class="center">' + TD.mascot('wave', 90) + '<h3>Tabuada Divertida</h3><p class="muted" style="margin:0">Versão ' + TD.VERSION + '</p><p>Criado com ❤️ por <b>' + TD.CREDIT + '</b></p></div>' +
            '<div class="h2" style="margin-top:8px">Novidades desta versão</div><div class="steps">' + TD.CHANGELOG.map((c) => '<div class="step"><span class="n">✓</span><div>' + c + '</div></div>').join('') + '</div>' +
            '<p class="tiny muted center mt16">Fontes Baloo 2 e Nunito (SIL OFL) • Motor 3D three.js (MIT)</p>');
    };
})();
