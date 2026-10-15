/* ==========================================================================
   Tabuada Divertida 3.0 — Início, Jogos, Apresentação e Baú diário
   ========================================================================== */
'use strict';
(function () {
    const TD = window.TD, G = TD.games;
    G.order = ['galaxy', 'racer', 'balloons', 'ninja', 'memory', 'flash', 'clock'].filter((id) => G.defs[id]);

    G.ART_BG = {
        galaxy: 'linear-gradient(160deg,#1a0b4d,#070320)', racer: 'linear-gradient(160deg,#3b0a6b,#12052e)', balloons: 'linear-gradient(160deg,#38bdf8,#e0f2fe)',
        ninja: 'linear-gradient(160deg,#0c1445,#0f172a)', memory: 'linear-gradient(160deg,#7c3aed,#db2777)', flash: 'linear-gradient(160deg,#f97316,#e11d48)', clock: 'linear-gradient(160deg,#14b8a6,#0e7490)'
    };
    const SUBS = { galaxy: 'Destrua asteroides', racer: 'Corra pelos portais', balloons: 'Estoure a resposta', ninja: 'Corte as frutas', memory: 'Ache os pares', flash: '60 segundos', clock: 'Leia o relógio' };
    G.cardHtml = (id, cls) => {
        const d = G.defs[id], best = TD.state.best[id] || 0;
        return '<button class="game-card ' + (cls || '') + '" data-act="openGame" data-arg="' + id + '" style="background:' + G.ART_BG[id] + '">' +
            '<canvas class="art" data-art="' + (d.art || id) + '"></canvas><div class="shade"></div>' +
            (d.tag ? '<span class="gc-tag">' + d.tag + '</span>' : '') + (best ? '<span class="gc-best">🏆 ' + best + '</span>' : '') +
            '<div class="gc-txt"><b>' + d.name + '</b><small>' + (SUBS[id] || '') + '</small></div></button>';
    };

    function greet() {
        const h = new Date().getHours();
        return h < 12 ? 'Bom dia! ☀️' : h < 18 ? 'Boa tarde! 🌤️' : 'Boa noite! 🌙';
    }
    function pickSpeech() {
        const s = TD.state, st = TD.daily.streak(), name = s.profile.name ? s.profile.name.split(' ')[0] : '';
        if (!s.daily.chest) return 'Seu baú de hoje está pronto! Abre aí 🎁';
        if (st >= 2 && s.daily.lastActive !== TD.today()) return 'Bora manter a sequência de ' + st + ' dias? 🔥';
        if (s.stats.correct === 0) return 'Oi' + (name ? ', ' + name : '') + '! Que tal começar pelo Treino Inteligente?';
        const done = s.daily.missions.filter((m) => m.done).length;
        if (done < 3) return 'Faltam ' + (3 - done) + ' missões para o bônus de hoje!';
        return TD.pick(['Você está mandando muito bem! 🚀', 'Que tal bater um recorde hoje?', 'Já conhece a Calculadora Explicada?']);
    }

    /* ---------------- Início ---------------- */
    TD.screens.home = {
        tab: 'home', topbar: 'profile', greet: greet,
        render() {
            TD.daily.ensure();
            const s = TD.state, d = s.daily;
            const done = d.missions.filter((m) => m.done).length;
            let html = '<div class="hello">' + TD.mascot('wave', 74, 'wave') + '<div class="speech">' + TD.esc(pickSpeech()) + '</div></div>';
            html += '<button class="card-grad smart smart-cta" data-act="smartStart" style="width:100%;text-align:left"><div class="play-orb">' + TD.icon('play', 30) + '</div><div><div class="h3" style="color:#fff;font-size:1.3rem">Treino Inteligente</div><div class="small" style="opacity:.92">O Pi escolhe 10 contas certas para você evoluir mais rápido.</div></div></button>';
            html += '<div class="card mt12"><div class="row"><div class="ring-wrap">' + TD.ui.ring(done / 3 * 100, 58, 7, '#22c55e') + '<div class="ring-label" style="font-size:.95rem">' + done + '/3</div></div><div class="grow"><div class="h3">Missões de hoje</div><div class="small muted">' + (d.allBonus ? 'Bônus conquistado! 🏆' : 'Complete as 3 e ganhe +60 moedas') + '</div></div></div>' +
                '<div class="mission-list">' + d.missions.map((m) => '<div class="mission' + (m.done ? ' done' : '') + '" style="background:var(--surface)"><div class="mi" style="background:' + (m.done ? '#22c55e' : 'var(--surface-2)') + '">' + (m.done ? TD.icon('check', 18) : m.icon) + '</div><div class="mt">' + m.text + '<div class="bar green" style="height:7px;margin-top:5px"><i style="width:' + Math.round(m.prog / m.target * 100) + '%"></i></div></div><div class="mr" style="color:var(--gold)">' + TD.icon('star', 14) + m.reward + '</div></div>').join('') + '</div></div>';
            html += '<button class="card tap mt12 chest-btn" data-act="openChest"><div class="chest-ico' + (d.chest ? '' : ' ready') + '">' + (d.chest ? '📭' : '🎁') + '</div><div class="grow"><div class="h3">Baú diário</div><div class="small muted">' + (d.chest ? 'Já aberto hoje. Volte amanhã!' : 'Toque para abrir e ganhar moedas') + '</div></div>' + (d.chest ? '' : '<span class="btn sm gold">Abrir</span>') + '</button>';
            const nx = TD.learn.nextPathSuggestion(), W = TD.learn.WORLDS[nx.world], node = W.nodes[nx.idx];
            html += '<div class="h2">Continue sua trilha</div><button class="card tap list-item" data-act="openPath" data-arg="' + nx.world + '"><div class="ico-badge learn" style="font:800 1.6rem var(--font-display)">' + W.sym + '</div><div class="grow"><b>' + node.t + '</b><small>' + W.name + ' • fase ' + (nx.idx + 1) + ' de ' + W.nodes.length + '</small></div><span class="chev">' + TD.icon('chev', 20) + '</span></button>';
            html += '<div class="h2">Jogos <small><button data-act="tab" data-arg="games" style="color:var(--primary-2)">Ver todos</button></small></div><div class="hscroll">' + G.order.map((id) => G.cardHtml(id)).join('') + '</div>';
            html += '<div class="h2">Ferramentas rápidas</div><div class="quick-grid">' + ['calc', 'percent', 'split', 'convert'].map((id) => {
                const t = TD.TOOLS.find((x) => x.id === id);
                return '<button class="quick" data-act="openTool" data-arg="' + id + '"><div class="ico-badge ' + t.g + '" style="font:800 1.4rem var(--font-display)">' + t.e + '</div>' + t.n.split(' ')[0] + '</button>';
            }).join('') + '</div>';
            const m = TD.learn.masteredCount();
            html += '<button class="card tap mt16 list-item" data-act="tab" data-arg="profile"><div class="ico-badge smart">' + TD.icon('brain', 26) + '</div><div class="grow"><b>Mapa do Cérebro</b><small>' + m + ' de 100 contas dominadas</small><div class="bar gold mt8" style="height:8px"><i style="width:' + m + '%"></i></div></div></button>';
            html += TD.creditHtml();
            return html;
        },
        mount(el) { G.paintArts(el); }
    };

    /* ---------------- Jogos ---------------- */
    TD.screens.games = {
        tab: 'games', topbar: 'profile', title: 'Jogos',
        render() {
            return '<h1 class="h-display mt8">Jogos</h1><p class="muted" style="margin:4px 0 14px">Jogue aprendendo. Cada acerto treina o seu cérebro.</p>' +
                '<div class="games-list">' + G.cardHtml('galaxy', 'wide') + G.order.filter((id) => id !== 'galaxy').map((id) => G.cardHtml(id)).join('') + '</div>' +
                '<p class="small muted center mt16">Os jogos ficam mais difíceis conforme você acerta.</p>';
        },
        mount(el) { G.paintArts(el); }
    };

    /* ---------------- Baú diário ---------------- */
    TD.act.openChest = () => {
        const d = TD.state.daily;
        if (d.chest) { TD.ui.toast('Baú já aberto hoje', 'Volte amanhã para mais moedas!', '📭'); return; }
        const amount = 20 + Math.round(Math.random() * 8) * 5 + Math.min(30, TD.daily.streak() * 3);
        d.chest = true; TD.save();
        TD.ui.sheet('<div class="center"><div id="chestBig" style="font-size:6rem;line-height:1;margin:10px 0" class="chest-ico ready">🎁</div><h3 id="chestTitle">Abrindo…</h3><p class="muted" id="chestSub">&nbsp;</p></div><div class="actions" id="chestAct"></div>', {
            center: true, dismissable: false,
            mount(el, api) {
                TD.sfx('whoosh');
                setTimeout(() => {
                    const big = TD.$('#chestBig', el); big.classList.remove('ready'); big.textContent = '💰';
                    big.animate([{ transform: 'scale(.4)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 500, easing: 'cubic-bezier(.3,1.6,.5,1)' });
                    TD.sfx('chest'); TD.fx.confetti(90); TD.buzz('success');
                    TD.$('#chestTitle', el).textContent = '+' + amount + ' moedas!';
                    TD.$('#chestSub', el).textContent = TD.daily.streak() > 1 ? 'Bônus de sequência incluído 🔥' : 'Volte amanhã para mais!';
                    TD.addCoins(amount, big);
                    api.dismissable = true;
                    TD.$('#chestAct', el).innerHTML = TD.ads.rewardButton('Dobrar (+' + amount + ')', 'chestDouble', amount) + '<button class="btn ghost block" data-act="closeSheet">Pegar e fechar</button>';
                }, 1100);
            },
            onClose: () => { if (TD.nav.current && TD.nav.current.name === 'home') TD.nav.refresh(); }
        });
    };
    TD.act.chestDouble = async (amount, btn) => {
        btn.disabled = true;
        const ok = await TD.ads.showReward();
        if (!ok) { btn.disabled = false; return; }
        TD.addCoins(Number(amount), btn);
        btn.outerHTML = '<p class="center" style="color:var(--gold)">Dobrado! +' + amount + ' 🎉</p>';
    };

    /* ---------------- Apresentação (primeiro acesso) ---------------- */
    const ob = { step: 0, name: '', avatar: 'fox', age: '' };
    TD.screens.onboard = {
        topbar: 'none', tabbar: false,
        render(p) {
            const st = ob.step;
            const steps = '<div class="steps">' + [0, 1, 2].map((i) => '<i class="' + (i <= st ? 'on' : '') + '"></i>').join('') + '</div>';
            if (st === 0) {
                return '<div class="onb">' + steps + '<div class="onb-hero">' + TD.mascot('wave', 170, 'wave') +
                    '<h2>Oi! Eu sou o <span class="grad-text">Pi</span> 👋</h2><p>Vou te ajudar a ficar craque em matemática — jogando, treinando e se divertindo.</p></div>' +
                    '<div class="list mt24">' +
                    feat('brain', 'smart', 'Treino Inteligente', 'Aprende com seus erros e foca no que importa') +
                    feat('games', 'play', 'Jogos em 3D', 'Galáxia, Corrida Neon, Balões e muito mais') +
                    feat('tools', 'tools', 'Ferramentas úteis', 'Calculadora explicada, porcentagem, juros…') + '</div>' +
                    '<div class="onb-foot"><button class="btn green lg block" data-act="obNext">Vamos lá!</button><p class="center tiny muted mt12">Criado por <b>' + TD.CREDIT + '</b></p></div></div>';
            }
            if (st === 1) {
                return '<div class="onb">' + steps + '<div class="onb-hero"><h2>Como você se chama?</h2><p>Escolha também o seu avatar.</p></div>' +
                    '<input class="name-input mt16" id="obName" maxlength="18" placeholder="Seu nome ou apelido" value="' + TD.esc(ob.name) + '">' +
                    '<div class="avatar-grid mt16">' + TD.AVATARS.filter((a) => a.price === 0).map((a) => '<button class="avatar-pick' + (ob.avatar === a.id ? ' active' : '') + '" data-act="obAvatar" data-arg="' + a.id + '">' + TD.avatarHtml(a.id, 62) + '</button>').join('') + '</div>' +
                    '<p class="center tiny muted mt12">Mais avatares na loja, com moedas que você ganha jogando.</p>' +
                    '<div class="onb-foot"><button class="btn green lg block" data-act="obNext">Continuar</button></div></div>';
            }
            return '<div class="onb">' + steps + '<div class="onb-hero"><h2>Quem vai usar o app?</h2><p>Assim o Pi ajusta a dificuldade para você.</p></div>' +
                '<div class="age-cards mt16">' +
                age('kid', '🧒', 'Criança', 'Até 9 anos • contas visuais e respostas com opções') +
                age('teen', '🧑', 'Jovem', '10 a 14 anos • desafios na medida') +
                age('adult', '🧑‍💼', 'Adulto', '15 anos ou mais • treino do cérebro e ferramentas') + '</div>' +
                '<div class="onb-foot"><button class="btn green lg block" data-act="obFinish"' + (ob.age ? '' : ' disabled') + '>Começar a jogar!</button></div></div>';
        },
        mount(el) {
            const inp = TD.$('#obName', el);
            if (inp) inp.addEventListener('input', () => { ob.name = inp.value; });
        },
        onBack() { if (ob.step > 0) { ob.step--; TD.nav.refresh(); return false; } }
    };
    function feat(ic, g, t, d) { return '<div class="card list-item"><div class="ico-badge ' + g + '">' + TD.icon(ic, 26) + '</div><div class="grow"><b>' + t + '</b><small>' + d + '</small></div></div>'; }
    function age(id, e, t, d) { return '<button class="age-card' + (ob.age === id ? ' active' : '') + '" data-act="obAge" data-arg="' + id + '"><div class="emo">' + e + '</div><div class="grow"><b style="font:800 1.15rem var(--font-display)">' + t + '</b><div class="small muted">' + d + '</div></div></button>'; }
    TD.act.obNext = () => {
        if (ob.step === 1) {
            const inp = TD.$('#obName');
            ob.name = (inp ? inp.value : ob.name).trim().slice(0, 18);
            if (!ob.name) { TD.ui.toast('Digite seu nome', 'ou um apelido legal', '✏️'); if (inp) inp.focus(); return; }
        }
        ob.step++; TD.nav.refresh();
        TD.nav.current.el.scrollTop = 0;
    };
    TD.act.obAvatar = (id) => { const inp = TD.$('#obName'); if (inp) ob.name = inp.value; ob.avatar = id; TD.nav.refresh(); };
    TD.act.obAge = (a) => { ob.age = a; TD.nav.refresh(); };
    TD.act.obFinish = async () => {
        const s = TD.state;
        s.profile.name = ob.name || 'Jogador';
        s.profile.avatar = ob.avatar;
        s.profile.age = ob.age || 'kid';
        s.onboarded = true;
        s.coins += 50;
        TD.daily.ensure();
        TD.save(true);
        TD.nav.go('home', {}, { root: true });
        setTimeout(() => {
            TD.fx.confetti(); TD.sfx('win');
            TD.ui.toast('Bem-vindo, ' + s.profile.name + '!', s.migrated ? 'Seu progresso antigo foi mantido + 50 moedas de presente' : 'Você ganhou 50 moedas de presente', '🎉');
        }, 400);
        if (TD.maybeIosHint) TD.maybeIosHint(4500);
        if (TD.reminder.available()) {
            setTimeout(async () => {
                const ok = await TD.ui.confirm('Quer um lembrete diário?', 'O Pi pode te lembrar de treinar todo dia às 18h para não perder sua sequência.', 'Sim, quero!');
                if (ok) { await TD.reminder.set(true, 18); }
            }, 2600);
        }
    };
})();
