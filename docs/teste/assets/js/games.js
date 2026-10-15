/* ==========================================================================
   Tabuada Divertida 3.0 — Plataforma de jogos + jogos 2D/DOM
   ========================================================================== */
'use strict';
(function () {
    const TD = window.TD;
    const G = TD.games = { defs: {}, order: [], run: null, lastOp: {} };

    G.register = (id, def) => { def.id = id; G.defs[id] = def; G.order.push(id); };
    G.OPS = [['mul', '×'], ['add', '+'], ['sub', '−'], ['div', '÷'], ['mix', 'Misto']];

    /* ---------------- Tela de jogo ---------------- */
    TD.screens.game = {
        full: true, topbar: 'none', tabbar: false, game: true,
        render() { return '<div class="game-screen" id="gScreen"></div>'; },
        mount(el, p) { G.mount(TD.$('#gScreen', el), p.id); },
        unmount() { G.destroy(); },
        onBack() {
            const r = G.run;
            if (!r) return true;
            if (r.state === 'playing') { G.pause(); return false; }
            if (r.state === 'over') { TD.act.gExit(); return false; }
            return true;
        }
    };
    TD.act.openGame = (id) => { if (G.defs[id]) TD.nav.go('game', { id: id }); };

    function maxLevel() { const a = TD.state.profile.age; return a === 'kid' ? 3 : a === 'teen' ? 4 : 5; }

    G.mount = function (host, id) {
        const def = G.defs[id];
        const run = G.run = {
            id: id, def: def, host: host, state: 'loading', op: G.lastOp[id] || (def.defaultOp || 'mul'),
            score: 0, lives: def.lives || 3, revived: false, inst: null, level: TD.learn.baseLevel(), streak: 0, correctCount: 0, coinsGiven: 0, extra: {}
        };
        host.innerHTML = '<div class="ghud" id="gHud">' +
            '<button class="hud-btn" data-act="gPause" aria-label="Pausar">' + TD.icon('pause', 20) + '</button>' +
            '<div class="hud-pill" id="gScore">' + TD.icon('star', 18, ' style="color:#fde047"') + '<span>0</span></div><div class="spacer"></div>' +
            '<div class="hud-pill" id="gLives"></div>' +
            '<div class="hud-q hidden" id="gQ"></div></div>' +
            '<div id="gLayer"></div>';
        renderLives();
        const api = makeApi(run);
        Promise.resolve().then(() => def.create(host, api)).then((inst) => {
            if (G.run !== run) { if (inst && inst.destroy) inst.destroy(); return; }
            run.inst = inst;
            run.state = 'intro';
            showIntro();
        }).catch((e) => {
            console.error(e);
            if (G.run !== run) return;
            overlay('<div style="font-size:3rem">😕</div><h2>Ops!</h2><p>Este jogo precisa de gráficos 3D (WebGL), que não funcionaram neste aparelho.</p><div class="actions"><button class="btn block" data-act="gExitNow">Voltar</button></div>');
        });
        G._resize = () => { if (run.inst && run.inst.resize) run.inst.resize(); };
        window.addEventListener('resize', G._resize);
    };
    G.destroy = function () {
        const r = G.run;
        if (!r) return;
        G.run = null;
        window.removeEventListener('resize', G._resize);
        try { if (r.inst && r.inst.destroy) r.inst.destroy(); } catch (e) { console.error(e); }
    };
    G.pause = function () {
        const r = G.run;
        if (!r || r.state !== 'playing') return;
        r.state = 'paused';
        if (r.inst.pause) r.inst.pause();
        overlay('<div style="font-size:2.6rem">⏸️</div><h2>Pausado</h2><p>Respire fundo. Quando quiser, continue!</p>' +
            '<div class="actions"><button class="btn green lg block" data-act="gResume">' + TD.icon('play', 22) + 'Continuar</button>' +
            '<button class="btn ghost block" data-act="gRestart">' + TD.icon('refresh', 20) + 'Reiniciar</button>' +
            '<button class="btn ghost block" data-act="gExitNow">Sair do jogo</button></div>');
    };
    G.autoPause = () => G.pause();

    function overlay(html) {
        const layer = TD.$('#gLayer');
        if (!layer) return;
        layer.innerHTML = html ? '<div class="g-overlay"><div class="go-card">' + html + '</div></div>' : '';
    }
    G.overlay = overlay;

    function showIntro() {
        const r = G.run, d = r.def;
        const best = TD.state.best[r.id] || 0;
        let html = '<div style="font-size:3.2rem;line-height:1">' + d.emoji + '</div><h2>' + d.name + '</h2><p>' + d.desc + '</p>' +
            '<div class="how">' + d.how.map((h) => '<div><span>' + h[0] + '</span>' + h[1] + '</div>').join('') + '</div>';
        if (d.ops) html += '<div class="seg" id="gOps">' + G.OPS.map((o) => '<button data-op="' + o[0] + '" class="' + (r.op === o[0] ? 'active' : '') + '">' + o[1] + '</button>').join('') + '</div>';
        html += (best ? '<div class="small" style="color:#fde047;margin-bottom:6px">🏆 Seu recorde: ' + best + '</div>' : '') +
            '<div class="actions"><button class="btn green lg block" data-act="gPlay">' + TD.icon('play', 24) + 'Jogar</button><button class="btn ghost block" data-act="gExitNow">Voltar</button></div>';
        overlay(html);
        TD.$$('#gOps button').forEach((b) => b.addEventListener('click', () => {
            r.op = b.dataset.op; G.lastOp[r.id] = r.op; TD.sfx('tap');
            TD.$$('#gOps button').forEach((x) => x.classList.toggle('active', x === b));
        }));
    }

    function start() {
        const r = G.run;
        if (!r || !r.inst) return;
        r.score = 0; r.lives = r.def.lives || 3; r.revived = false; r.level = TD.learn.baseLevel(); r.streak = 0; r.correctCount = 0; r.coinsGiven = 0;
        Object.keys(r.extra).forEach((k) => delete r.extra[k]);
        setScore(0); renderLives();
        overlay('');
        r.state = 'playing';
        r.startedAt = Date.now();
        r.inst.start({ op: r.op });
    }
    TD.act.gPlay = () => { TD.unlockAudio(); start(); };
    TD.act.gResume = () => { const r = G.run; if (!r) return; overlay(''); r.state = 'playing'; if (r.inst.resume) r.inst.resume(); };
    TD.act.gPause = () => G.pause();
    TD.act.gRestart = async () => { await TD.ads.breakpoint(); start(); };
    TD.act.gAgain = async () => { await TD.ads.breakpoint(); start(); };
    TD.act.gExitNow = () => { const r = G.run; if (r) r.state = 'exiting'; TD.nav.back(); };
    TD.act.gExit = async () => { const r = G.run; if (r) r.state = 'exiting'; await TD.ads.breakpoint(); TD.nav.back(); };
    TD.act.gRevive = async (a, btn) => {
        const r = G.run;
        if (!r || r.revived) return;
        btn.disabled = true;
        const ok = await TD.ads.showReward();
        if (!ok || G.run !== r) { btn.disabled = false; return; }
        r.revived = true;
        r.lives = 1; renderLives();
        overlay('');
        r.state = 'playing';
        if (r.inst.revive) r.inst.revive(); else if (r.inst.resume) r.inst.resume();
        TD.ui.toast('Mais uma vida!', 'Boa sorte!', '❤️');
    };

    function setScore(n) {
        const el = TD.$('#gScore span');
        if (el) el.textContent = n;
    }
    function renderLives() {
        const r = G.run, el = TD.$('#gLives');
        if (!el || !r) return;
        if (r.def.noLives) { el.style.display = 'none'; return; }
        const max = Math.max(r.def.lives || 3, r.lives);
        let h = '<span class="hearts">';
        for (let i = 0; i < max; i++) h += '<i class="' + (i < r.lives ? '' : 'lost') + '">' + TD.heartSvg() + '</i>';
        el.innerHTML = h + '</span>';
    }

    function gameOver(extraHtml) {
        const r = G.run;
        if (!r || r.state === 'over') return;
        r.state = 'over';
        if (r.inst.pause) r.inst.pause();
        const d = r.def, s = r.score;
        const prevBest = TD.state.best[r.id] || 0;
        const newBest = s > prevBest;
        if (newBest) TD.state.best[r.id] = s;
        const totalCoins = d.coins ? d.coins(s, r) : Math.min(100, Math.round(s * 2));
        const coins = Math.max(0, totalCoins - r.coinsGiven);
        r.coinsGiven = totalCoins;
        TD.state.coins += coins;
        TD.addXP(Math.min(300, s * 6));
        TD.track('game', { id: r.id, score: s });
        TD.checkBadges();
        TD.save();
        if (newBest && s > 0) { TD.fx.confetti(); TD.sfx('win'); } else TD.sfx(s > 0 ? 'levelup' : 'lose');
        const canRevive = d.revive !== false && !d.noLives && !r.revived && TD.ads.rewardAvailable();
        overlay('<div style="font-size:2.6rem">' + (newBest && s > 0 ? '🏆' : s > 0 ? '🎉' : '💫') + '</div><h2>' + (d.overTitle || 'Fim de jogo!') + '</h2>' +
            '<div class="big-score">' + s + '</div><div class="small" style="opacity:.8">' + (d.unit || 'pontos') + '</div>' +
            (newBest && s > 0 ? '<div class="new-best">NOVO RECORDE!</div>' : '<div class="small" style="opacity:.7;margin:6px 0">Recorde: ' + Math.max(prevBest, s) + '</div>') +
            (extraHtml || '') +
            '<div class="row" style="justify-content:center;gap:16px;margin:10px 0 4px"><span class="rw" id="goCoins" style="font:800 1.3rem var(--font-display);color:#fde047">+' + coins + ' moedas</span></div>' +
            '<div class="actions">' + (canRevive ? TD.ads.rewardButton('Continuar com +1 vida', 'gRevive') : '') +
            '<button class="btn green lg block" data-act="gAgain">' + TD.icon('refresh', 22) + 'Jogar de novo</button>' +
            '<button class="btn ghost block" data-act="gExit">Sair</button></div>');
        setTimeout(() => { const c = TD.$('#goCoins'); if (c && coins > 0) TD.ui.coinFly(c, coins); }, 400);
    }
    G.gameOver = gameOver;

    function makeApi(run) {
        const api = {
            host: run.host,
            get op() { return run.op; },
            get level() { return run.level; },
            get playing() { return G.run === run && run.state === 'playing'; },
            get score() { return run.score; },
            get lives() { return run.lives; },
            age: TD.state.profile.age,
            q() { return TD.learn.make(run.op === 'mix' ? TD.pick(['add', 'sub', 'mul', 'div']) : run.op, run.level); },
            options: (q, n) => TD.learn.options(q, n),
            addScore(n, x, y, txt) {
                run.score += n; setScore(run.score);
                const el = TD.$('#gScore'); if (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
                if (x != null) TD.ui.floatText(x, y, txt || ('+' + n));
            },
            setScore(n) { run.score = n; setScore(n); },
            question(text, sub) {
                const el = TD.$('#gQ'); if (!el) return;
                if (!text) { el.classList.add('hidden'); return; }
                el.classList.remove('hidden', 'flash'); void el.offsetWidth; el.classList.add('flash');
                el.innerHTML = (sub ? '<small>' + sub + '</small>' : '') + text;
            },
            combo(n) {
                if (n < 3) return;
                const c = document.createElement('div'); c.className = 'combo-pop'; c.textContent = 'Combo x' + n + '!';
                run.host.appendChild(c); setTimeout(() => c.remove(), 900);
                TD.sfx('combo', n);
            },
            answered(q, ok, ms) {
                if (q && q.key) TD.learn.record(q, ok, ms || 4000);
                if (ok) {
                    run.streak++; run.correctCount++;
                    if (run.correctCount % 6 === 0 && run.level < maxLevel()) run.level++;
                } else run.streak = 0;
                TD.track('answer', { correct: ok, op: q ? q.op : null, ms: ms, streak: run.streak });
                return run.streak;
            },
            loseLife() {
                if (run.def.noLives) return 1;
                run.lives = Math.max(0, run.lives - 1); renderLives();
                TD.buzz('error');
                if (run.lives <= 0) setTimeout(() => gameOver(), 700);
                return run.lives;
            },
            over: (extra) => gameOver(extra),
            get extra() { return run.extra; }
        };
        return api;
    }

    /* ---------------- Canvas 2D utilitário ---------------- */
    G.canvas2d = function (host) {
        const cv = document.createElement('canvas');
        cv.className = 'gcv';
        host.prepend(cv);
        const o = { cv: cv, ctx: cv.getContext('2d'), W: 0, H: 0, dpr: 1 };
        o.resize = () => {
            o.dpr = Math.min(window.devicePixelRatio || 1, 2);
            o.W = host.clientWidth; o.H = host.clientHeight;
            cv.width = Math.round(o.W * o.dpr); cv.height = Math.round(o.H * o.dpr);
            o.ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0);
        };
        o.resize();
        return o;
    };
    G.loop = function (fn) {
        let raf = 0, last = performance.now(), alive = true;
        const tick = (t) => {
            if (!alive) return;
            raf = requestAnimationFrame(tick);
            const dt = Math.min(0.05, (t - last) / 1000); last = t;
            if (document.hidden) return;
            fn(dt, t / 1000);
        };
        raf = requestAnimationFrame(tick);
        return { stop() { alive = false; cancelAnimationFrame(raf); } };
    };
    G.bottomSafe = () => {
        const cs = getComputedStyle(document.documentElement);
        return (parseFloat(cs.getPropertyValue('--dock-h')) || 0) + (parseFloat(cs.getPropertyValue('--dock-label')) || 0) + (parseFloat(cs.getPropertyValue('--nat-bottom')) || 0);
    };
    G.topSafe = () => (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nat-top')) || 0);

    /* ---------------- Ilustrações dos cartões ---------------- */
    G.paintArts = function (root) {
        TD.$$('canvas.art', root).forEach((cv) => {
            const w = cv.clientWidth || 168, h = cv.clientHeight || 212, dpr = Math.min(window.devicePixelRatio || 1, 2);
            cv.width = w * dpr; cv.height = h * dpr;
            const c = cv.getContext('2d'); c.scale(dpr, dpr);
            try { (ART[cv.dataset.art] || ART.galaxy)(c, w, h); } catch (e) {}
        });
    };
    function lg(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; }
    function rg(c, x, y, r, stops) { const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.05, x, y, r); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; }
    function starsBg(c, w, h, n) { for (let i = 0; i < n; i++) { c.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.random() * 0.7) + ')'; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, Math.random() * 1.4 + 0.3, 0, 7); c.fill(); } }
    G.drawBalloon = function (c, x, y, r, col) {
        c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(x, y + r * 1.15); c.quadraticCurveTo(x - r * 0.3, y + r * 1.7, x + r * 0.1, y + r * 2.4); c.stroke();
        c.fillStyle = rg(c, x, y, r * 1.2, ['#ffffff', col, col, 'rgba(0,0,0,.35)']);
        c.beginPath(); c.ellipse(x, y, r * 0.86, r, 0, 0, 7); c.fill();
        c.fillStyle = col; c.beginPath(); c.moveTo(x - r * 0.12, y + r * 1.12); c.lineTo(x + r * 0.12, y + r * 1.12); c.lineTo(x, y + r * 0.96); c.fill();
        c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(x - r * 0.35, y - r * 0.45, r * 0.16, r * 0.28, -0.5, 0, 7); c.fill();
    };
    const ART = {
        galaxy(c, w, h) {
            c.fillStyle = lg(c, 0, 0, 0, h, ['#1a0b4d', '#2b0f6b', '#070320']); c.fillRect(0, 0, w, h);
            c.fillStyle = 'radial-gradient'; starsBg(c, w, h, 60);
            const g = c.createRadialGradient(w * 0.75, h * 0.25, 2, w * 0.75, h * 0.25, w * 0.6); g.addColorStop(0, 'rgba(236,72,153,.45)'); g.addColorStop(1, 'rgba(236,72,153,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
            c.fillStyle = rg(c, w * 0.78, h * 0.24, w * 0.22, ['#ffd1f0', '#c026d3', '#3b0764']); c.beginPath(); c.arc(w * 0.78, h * 0.24, w * 0.2, 0, 7); c.fill();
            c.strokeStyle = 'rgba(255,220,255,.7)'; c.lineWidth = 3; c.beginPath(); c.ellipse(w * 0.78, h * 0.24, w * 0.33, w * 0.07, -0.35, 0, 7); c.stroke();
            c.fillStyle = rg(c, w * 0.32, h * 0.42, 26, ['#c8b8a8', '#7c6a5a', '#3a2f28']); c.beginPath();
            for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, rr = 24 + Math.sin(i * 2.3) * 5; c.lineTo(w * 0.32 + Math.cos(a) * rr, h * 0.42 + Math.sin(a) * rr); } c.fill();
            c.font = '800 22px "Baloo 2"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 4; c.strokeStyle = '#1b1446'; c.strokeText('42', w * 0.32, h * 0.43); c.fillStyle = '#fff'; c.fillText('42', w * 0.32, h * 0.43);
            c.save(); c.translate(w * 0.5, h * 0.66);
            c.fillStyle = 'rgba(103,232,249,.5)'; c.beginPath(); c.moveTo(-8, 22); c.lineTo(0, 46); c.lineTo(8, 22); c.fill();
            c.fillStyle = lg(c, -26, 0, 26, 0, ['#a78bfa', '#ede9fe', '#a78bfa']); c.beginPath(); c.moveTo(0, -30); c.lineTo(26, 18); c.lineTo(0, 10); c.lineTo(-26, 18); c.closePath(); c.fill();
            c.fillStyle = '#67e8f9'; c.beginPath(); c.ellipse(0, -6, 5, 10, 0, 0, 7); c.fill(); c.restore();
            c.strokeStyle = 'rgba(125,249,255,.9)'; c.lineWidth = 3; c.beginPath(); c.moveTo(w * 0.5, h * 0.55); c.lineTo(w * 0.35, h * 0.47); c.stroke();
        },
        racer(c, w, h) {
            c.fillStyle = lg(c, 0, 0, 0, h * 0.55, ['#2a0a5e', '#c026d3', '#fb923c']); c.fillRect(0, 0, w, h * 0.55);
            const sy = h * 0.42; c.fillStyle = lg(c, 0, sy - 40, 0, sy + 40, ['#fde047', '#f472b6']); c.beginPath(); c.arc(w / 2, sy, 40, Math.PI, 0); c.fill();
            c.fillStyle = '#c026d3'; for (let i = 0; i < 4; i++) c.fillRect(w / 2 - 42, sy - 14 + i * 5, 84, 1.5 + i * 0.6);
            c.fillStyle = '#4c1d95'; c.beginPath(); c.moveTo(0, h * 0.55); c.lineTo(w * 0.2, h * 0.4); c.lineTo(w * 0.38, h * 0.55); c.lineTo(w * 0.62, h * 0.55); c.lineTo(w * 0.85, h * 0.38); c.lineTo(w, h * 0.5); c.lineTo(w, h * 0.55); c.fill();
            c.fillStyle = '#12052e'; c.fillRect(0, h * 0.55, w, h * 0.45);
            c.strokeStyle = 'rgba(244,114,182,.55)'; c.lineWidth = 1;
            for (let i = -8; i <= 8; i++) { c.beginPath(); c.moveTo(w / 2 + i * 6, h * 0.55); c.lineTo(w / 2 + i * 60, h); c.stroke(); }
            for (let i = 0; i < 7; i++) { const y = h * 0.55 + Math.pow(i / 7, 2) * h * 0.45; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
            c.fillStyle = '#1e1b4b'; c.beginPath(); c.moveTo(w / 2 - 6, h * 0.55); c.lineTo(w / 2 + 6, h * 0.55); c.lineTo(w * 0.85, h); c.lineTo(w * 0.15, h); c.fill();
            c.fillStyle = '#ff2e88'; c.beginPath(); c.roundRect(w / 2 - 26, h * 0.74, 52, 22, 6); c.fill();
            c.fillStyle = '#1b1446'; c.beginPath(); c.roundRect(w / 2 - 18, h * 0.7, 36, 12, 5); c.fill();
            c.fillStyle = '#ff4d4d'; c.fillRect(w / 2 - 24, h * 0.8, 10, 4); c.fillRect(w / 2 + 14, h * 0.8, 10, 4);
        },
        balloons(c, w, h) {
            c.fillStyle = lg(c, 0, 0, 0, h, ['#38bdf8', '#7dd3fc', '#e0f2fe']); c.fillRect(0, 0, w, h);
            c.fillStyle = 'rgba(255,255,255,.95)';
            [[0.2, 0.2, 18], [0.32, 0.18, 22], [0.44, 0.21, 16], [0.75, 0.62, 16], [0.86, 0.6, 20]].forEach((p) => { c.beginPath(); c.arc(w * p[0], h * p[1], p[2], 0, 7); c.fill(); });
            G.drawBalloon(c, w * 0.3, h * 0.45, 26, '#f43f5e');
            G.drawBalloon(c, w * 0.66, h * 0.32, 30, '#facc15');
            G.drawBalloon(c, w * 0.55, h * 0.62, 22, '#22c55e');
            c.font = '800 20px "Baloo 2"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 4;
            c.strokeText('24', w * 0.66, h * 0.32); c.fillText('24', w * 0.66, h * 0.32);
        },
        ninja(c, w, h) {
            c.fillStyle = lg(c, 0, 0, 0, h, ['#0c1445', '#1e3a8a', '#0f172a']); c.fillRect(0, 0, w, h);
            const g = c.createRadialGradient(w * 0.72, h * 0.2, 4, w * 0.72, h * 0.2, 60); g.addColorStop(0, 'rgba(255,248,220,1)'); g.addColorStop(0.35, 'rgba(255,248,220,.9)'); g.addColorStop(0.4, 'rgba(255,248,220,.25)'); g.addColorStop(1, 'rgba(255,248,220,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
            c.fillStyle = '#0a1028'; for (let i = 0; i < 5; i++) { c.fillRect(i * w / 5 + 6, h * 0.35 + (i % 2) * 20, 7, h); }
            c.fillStyle = rg(c, w * 0.4, h * 0.5, 34, ['#bbf7d0', '#16a34a', '#14532d']); c.beginPath(); c.arc(w * 0.4, h * 0.5, 30, 0, 7); c.fill();
            c.fillStyle = '#ef4444'; c.beginPath(); c.arc(w * 0.62, h * 0.62, 24, 0.3, Math.PI + 0.3); c.fill();
            c.fillStyle = '#22c55e'; c.beginPath(); c.arc(w * 0.62, h * 0.62, 24, Math.PI + 0.3, 0.3 + 2 * Math.PI); c.lineTo(w * 0.62 + Math.cos(0.3) * 24, h * 0.62 + Math.sin(0.3) * 24); c.fill();
            c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(w * 0.1, h * 0.75); c.quadraticCurveTo(w * 0.5, h * 0.5, w * 0.92, h * 0.3); c.stroke();
            c.font = '800 20px "Baloo 2"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.strokeStyle = '#052e16'; c.lineWidth = 4; c.strokeText('18', w * 0.4, h * 0.5); c.fillText('18', w * 0.4, h * 0.5);
        },
        memory(c, w, h) {
            c.fillStyle = lg(c, 0, 0, w, h, ['#7c3aed', '#db2777']); c.fillRect(0, 0, w, h);
            const cards = [[0.3, 0.4, -0.2, '6×7'], [0.62, 0.36, 0.15, '42'], [0.46, 0.62, 0.05, '?']];
            cards.forEach((k) => { c.save(); c.translate(w * k[0], h * k[1]); c.rotate(k[2]); c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.roundRect(-30, -38, 64, 82, 12); c.fill(); c.fillStyle = k[3] === '?' ? '#a78bfa' : '#fff'; c.beginPath(); c.roundRect(-32, -42, 64, 82, 12); c.fill(); c.font = '800 22px "Baloo 2"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = k[3] === '?' ? '#fff' : '#4c1d95'; c.fillText(k[3], 0, 0); c.restore(); });
        },
        flash(c, w, h) {
            c.fillStyle = lg(c, 0, 0, w, h, ['#f97316', '#e11d48']); c.fillRect(0, 0, w, h);
            c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 12; c.beginPath(); c.arc(w / 2, h * 0.42, 48, 0, 7); c.stroke();
            c.strokeStyle = '#fde047'; c.lineCap = 'round'; c.beginPath(); c.arc(w / 2, h * 0.42, 48, -Math.PI / 2, Math.PI * 0.9); c.stroke();
            c.fillStyle = '#fff'; c.beginPath(); c.moveTo(w / 2 + 6, h * 0.42 - 34); c.lineTo(w / 2 - 16, h * 0.42 + 4); c.lineTo(w / 2 - 2, h * 0.42 + 4); c.lineTo(w / 2 - 8, h * 0.42 + 34); c.lineTo(w / 2 + 16, h * 0.42 - 6); c.lineTo(w / 2 + 2, h * 0.42 - 6); c.closePath(); c.fill();
        },
        clock(c, w, h) {
            c.fillStyle = lg(c, 0, 0, w, h, ['#14b8a6', '#0e7490']); c.fillRect(0, 0, w, h);
            G.drawClock(c, w / 2, h * 0.42, Math.min(w, h) * 0.3, 3, 0);
        }
    };

    /* ---------------- Relógio (usado no jogo e na arte) ---------------- */
    G.drawClock = function (c, x, y, r, hh, mm) {
        c.save();
        c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(x + 3, y + 6, r * 1.08, 0, 7); c.fill();
        c.fillStyle = lg(c, x - r, y - r, x + r, y + r, ['#fde68a', '#f59e0b', '#b45309']); c.beginPath(); c.arc(x, y, r * 1.08, 0, 7); c.fill();
        c.fillStyle = rg(c, x, y, r * 1.3, ['#ffffff', '#ffffff', '#e7e5f4']); c.beginPath(); c.arc(x, y, r * 0.96, 0, 7); c.fill();
        for (let i = 0; i < 60; i++) {
            const a = i / 60 * Math.PI * 2, big = i % 5 === 0;
            c.strokeStyle = big ? '#1b1446' : '#a8a3c7'; c.lineWidth = big ? Math.max(2, r * 0.025) : 1;
            c.beginPath(); c.moveTo(x + Math.sin(a) * r * (big ? 0.82 : 0.87), y - Math.cos(a) * r * (big ? 0.82 : 0.87)); c.lineTo(x + Math.sin(a) * r * 0.92, y - Math.cos(a) * r * 0.92); c.stroke();
        }
        c.fillStyle = '#1b1446'; c.font = '800 ' + Math.round(r * 0.2) + 'px "Baloo 2"'; c.textAlign = 'center'; c.textBaseline = 'middle';
        for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; c.fillText(i, x + Math.sin(a) * r * 0.66, y - Math.cos(a) * r * 0.66 + r * 0.02); }
        const ha = ((hh % 12) + mm / 60) / 12 * Math.PI * 2, ma = mm / 60 * Math.PI * 2;
        const hand = (ang, len, wid, col) => {
            c.save(); c.translate(x, y); c.rotate(ang);
            c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.roundRect(-wid / 2 + 2, -len + 3, wid, len + wid, wid / 2); c.fill();
            c.fillStyle = col; c.beginPath(); c.roundRect(-wid / 2, -len, wid, len + wid * 0.8, wid / 2); c.fill(); c.restore();
        };
        hand(ha, r * 0.48, r * 0.09, '#7c3aed');
        hand(ma, r * 0.74, r * 0.055, '#0ea5e9');
        c.fillStyle = '#f59e0b'; c.beginPath(); c.arc(x, y, r * 0.075, 0, 7); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(x - r * 0.02, y - r * 0.02, r * 0.025, 0, 7); c.fill();
        c.restore();
    };

    /* ======================================================================
       JOGO: Ninja dos Números (2D)
       ====================================================================== */
    G.register('ninja', {
        name: 'Ninja dos Números', emoji: '🥷', desc: 'Corte só as frutas da tabuada certa!', art: 'ninja', tag: 'Novo',
        how: [['👆', 'Arraste o dedo para cortar as frutas'], ['✅', 'Corte apenas os números da tabuada pedida'], ['❌', 'Cortar número errado tira uma vida']],
        lives: 3, coins: (s) => Math.min(120, s * 2),
        create(host, api) {
            const C = G.canvas2d(host), ctx = C.ctx;
            const FRUITS = [
                { skin: ['#bbf7d0', '#16a34a', '#14532d'], flesh: '#fb7185', seed: '#1f2937', stripe: '#14532d', r: 40 },
                { skin: ['#fed7aa', '#f97316', '#9a3412'], flesh: '#fdba74', seed: null, r: 34 },
                { skin: ['#fecaca', '#dc2626', '#7f1d1d'], flesh: '#fef3c7', seed: '#78350f', r: 33, leaf: true },
                { skin: ['#d6bc95', '#92643a', '#4a2f17'], flesh: '#84cc16', seed: '#111827', r: 32 }
            ];
            let fruits = [], halves = [], juice = [], trail = [], spawnT = 0, table = 2, tableHits = 0, running = false, loop = null, flash = 0, banner = 0, bgCache = null;
            const tablesFor = () => api.age === 'kid' ? [2, 5, 10, 3, 4] : api.age === 'teen' ? [2, 3, 4, 5, 6, 7, 8, 9] : [3, 4, 6, 7, 8, 9, 11, 12];
            function paintBg() {
                bgCache = document.createElement('canvas');
                bgCache.width = C.W * C.dpr; bgCache.height = C.H * C.dpr;
                const b = bgCache.getContext('2d'); b.scale(C.dpr, C.dpr);
                const W = C.W, H = C.H;
                b.fillStyle = lg(b, 0, 0, 0, H, ['#0b1240', '#1e2a78', '#111a44']); b.fillRect(0, 0, W, H);
                for (let i = 0; i < 80; i++) { b.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.8 + ')'; b.beginPath(); b.arc(Math.random() * W, Math.random() * H * 0.6, Math.random() * 1.3, 0, 7); b.fill(); }
                const mx = W * 0.78, my = H * 0.2, mr = Math.min(W, H) * 0.11;
                const mg = b.createRadialGradient(mx, my, mr * 0.9, mx, my, mr * 3); mg.addColorStop(0, 'rgba(255,244,214,.35)'); mg.addColorStop(1, 'rgba(255,244,214,0)'); b.fillStyle = mg; b.fillRect(0, 0, W, H);
                b.fillStyle = rg(b, mx, my, mr * 1.2, ['#fffaf0', '#fdf2d0', '#e9d8a6']); b.beginPath(); b.arc(mx, my, mr, 0, 7); b.fill();
                b.fillStyle = 'rgba(200,180,130,.35)'; [[0.3, -0.2, 0.18], [-0.35, 0.25, 0.12], [0.1, 0.4, 0.09]].forEach((k) => { b.beginPath(); b.arc(mx + k[0] * mr, my + k[1] * mr, k[2] * mr, 0, 7); b.fill(); });
                for (let layer = 0; layer < 2; layer++) {
                    b.fillStyle = layer ? '#070b24' : '#0e1640';
                    for (let x = -20 + layer * 30; x < W + 40; x += 46 + layer * 20) {
                        const bw = 9 + layer * 4, top = H * (0.25 + Math.random() * 0.25);
                        b.fillRect(x, top, bw, H - top);
                        for (let y = top + 40; y < H; y += 48) b.fillRect(x - 2, y, bw + 4, 4);
                        b.beginPath(); b.ellipse(x + bw + 14, top + 30, 18, 5, -0.5, 0, 7); b.fill();
                        b.beginPath(); b.ellipse(x - 12, top + 70, 16, 4, 0.5, 0, 7); b.fill();
                    }
                }
                b.fillStyle = lg(b, 0, H * 0.82, 0, H, ['rgba(5,8,25,0)', 'rgba(5,8,25,.85)']); b.fillRect(0, H * 0.82, W, H * 0.18);
            }
            function newTable() {
                const list = tablesFor().filter((t) => t !== table);
                table = TD.pick(list); tableHits = 0; banner = 2.2;
                api.question('Tabuada do ' + table, 'corte os números da');
            }
            function spawn() {
                const n = TD.rand(1, api.level >= 3 ? 3 : 2);
                for (let i = 0; i < n; i++) {
                    const good = Math.random() < 0.55;
                    let v = table * TD.rand(1, 10);
                    if (!good) { let g = 0; do { v = Math.max(1, table * TD.rand(1, 10) + TD.pick([-2, -1, 1, 2, 3])); g++; } while (v % table === 0 && g < 20); }
                    const type = FRUITS[TD.rand(0, FRUITS.length - 1)];
                    const scale = Math.min(1.25, Math.max(0.85, C.W / 420));
                    const x = C.W * (0.2 + Math.random() * 0.6);
                    const H = C.H, apex = H * (0.22 + Math.random() * 0.25);
                    const g = 900 + api.level * 60;
                    const vy = -Math.sqrt(2 * g * (H + 40 - apex));
                    fruits.push({ x: x, y: H + 40, vx: (C.W / 2 - x) * (0.25 + Math.random() * 0.35), vy: vy, g: g, r: type.r * scale, type: type, v: v, good: v % table === 0, rot: 0, vr: (Math.random() - 0.5) * 3, cut: false });
                }
            }
            function drawFruit(f, half) {
                const t = f.type, r = f.r;
                ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
                if (half) { ctx.beginPath(); ctx.rect(-r * 1.3, half < 0 ? -r * 1.3 : 0, r * 2.6, r * 1.3); ctx.clip(); }
                ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(4, 6, r, 0, 7); ctx.fill();
                ctx.fillStyle = rg(ctx, 0, 0, r * 1.25, t.skin); ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
                if (t.stripe) { ctx.strokeStyle = t.stripe; ctx.globalAlpha = 0.5; ctx.lineWidth = r * 0.12; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(i * r * 0.36, 0, r * 0.12, r * 0.95, 0, 0, 7); ctx.stroke(); } ctx.globalAlpha = 1; }
                if (t.leaf) { ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.ellipse(r * 0.25, -r * 1.02, r * 0.28, r * 0.12, -0.6, 0, 7); ctx.fill(); ctx.strokeStyle = '#78350f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -r * 0.85); ctx.lineTo(0.05 * r, -r * 1.15); ctx.stroke(); }
                ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.42, r * 0.22, r * 0.13, -0.7, 0, 7); ctx.fill();
                if (half) {
                    ctx.fillStyle = t.flesh; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.88, r * 0.2, 0, 0, 7); ctx.fill();
                    if (t.seed) { ctx.fillStyle = t.seed; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(i * r * 0.2, 0, r * 0.04, r * 0.07, 0, 0, 7); ctx.fill(); } }
                } else {
                    const fs = Math.round(r * 0.85);
                    ctx.rotate(-f.rot);
                    ctx.font = '800 ' + fs + 'px "Baloo 2"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.lineWidth = Math.max(4, r * 0.16); ctx.strokeStyle = 'rgba(15,10,40,.85)'; ctx.strokeText(f.v, 0, 3);
                    ctx.fillStyle = '#fff'; ctx.fillText(f.v, 0, 3);
                }
                ctx.restore();
            }
            function slice(f, dx, dy) {
                f.cut = true;
                const ang = Math.atan2(dy, dx);
                [-1, 1].forEach((s) => halves.push({ x: f.x, y: f.y, vx: f.vx * 0.4 + Math.cos(ang + Math.PI / 2) * s * 160, vy: f.vy * 0.3 + Math.sin(ang + Math.PI / 2) * s * 160 - 120, g: f.g, r: f.r, type: f.type, rot: ang, vr: s * 4, half: s, life: 1.6 }));
                for (let i = 0; i < 18; i++) { const a = Math.random() * 6.283, sp = 80 + Math.random() * 260; juice.push({ x: f.x, y: f.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, r: 2 + Math.random() * 5, c: f.good ? f.type.flesh : '#f43f5e', life: 0.7 + Math.random() * 0.4 }); }
            }
            let swipeCuts = 0;
            function testCut(p0, p1) {
                const dx = p1.x - p0.x, dy = p1.y - p0.y, L2 = dx * dx + dy * dy;
                if (L2 < 4) return;
                fruits.forEach((f) => {
                    if (f.cut) return;
                    let t = ((f.x - p0.x) * dx + (f.y - p0.y) * dy) / L2; t = Math.max(0, Math.min(1, t));
                    const cx = p0.x + dx * t, cy = p0.y + dy * t;
                    if ((f.x - cx) * (f.x - cx) + (f.y - cy) * (f.y - cy) > f.r * f.r * 1.1) return;
                    slice(f, dx, dy);
                    const q = { op: 'mul', a: table, b: f.v / table, key: Number.isInteger(f.v / table) && f.v / table <= 10 ? table + 'x' + (f.v / table) : null };
                    if (f.good) {
                        swipeCuts++;
                        TD.sfx('slice'); TD.buzz('light');
                        const st = api.answered(q.key ? q : { op: 'mul' }, true, 2500);
                        api.addScore(swipeCuts > 1 ? 2 : 1, f.x, f.y - 30, swipeCuts > 1 ? '+2 combo!' : '+1');
                        api.combo(st);
                        tableHits++;
                        if (tableHits >= 8) setTimeout(newTable, 600);
                    } else {
                        TD.sfx('wrong'); flash = 0.35;
                        TD.ui.floatText(f.x, f.y - 30, '✖ ' + f.v, '#fb7185');
                        api.answered({ op: 'mul' }, false, 2500);
                        api.loseLife();
                    }
                });
            }
            let down = false;
            const pt = (e) => { const r = C.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() }; };
            const onDown = (e) => { if (!running) return; down = true; swipeCuts = 0; trail = [pt(e)]; };
            const onMove = (e) => {
                if (!down || !running) return;
                const p = pt(e), last = trail[trail.length - 1];
                trail.push(p); if (trail.length > 14) trail.shift();
                if (last) testCut(last, p);
            };
            const onUp = () => { down = false; };
            C.cv.addEventListener('pointerdown', onDown);
            C.cv.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            function update(dt) {
                if (running) {
                    spawnT -= dt;
                    if (spawnT <= 0) { spawn(); spawnT = Math.max(0.75, 1.6 - api.level * 0.15 - api.score * 0.01) + Math.random() * 0.5; }
                }
                for (let i = fruits.length - 1; i >= 0; i--) {
                    const f = fruits[i];
                    f.vy += f.g * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
                    if (f.cut) { fruits.splice(i, 1); continue; }
                    if (f.y > C.H + 60 && f.vy > 0) {
                        fruits.splice(i, 1);
                        if (running && f.good && api.age !== 'kid') { TD.ui.floatText(f.x, C.H - 140, 'Perdeu o ' + f.v, '#fbbf24'); api.answered({ op: 'mul' }, false, 3000); api.loseLife(); }
                    }
                }
                halves.forEach((h) => { h.vy += h.g * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt; h.life -= dt; });
                halves = halves.filter((h) => h.life > 0 && h.y < C.H + 80);
                juice.forEach((j) => { j.vy += 700 * dt; j.x += j.vx * dt; j.y += j.vy * dt; j.life -= dt; });
                juice = juice.filter((j) => j.life > 0);
                const now = performance.now();
                trail = trail.filter((p) => now - p.t < 160);
                flash = Math.max(0, flash - dt); banner = Math.max(0, banner - dt);
            }
            function render() {
                if (!bgCache) paintBg();
                ctx.drawImage(bgCache, 0, 0, C.W, C.H);
                halves.forEach((h) => drawFruit(h, h.half));
                fruits.forEach((f) => drawFruit(f));
                juice.forEach((j) => { ctx.globalAlpha = Math.min(1, j.life * 2); ctx.fillStyle = j.c; ctx.beginPath(); ctx.arc(j.x, j.y, j.r, 0, 7); ctx.fill(); });
                ctx.globalAlpha = 1;
                if (trail.length > 1) {
                    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                    for (let pass = 0; pass < 2; pass++) {
                        ctx.strokeStyle = pass ? '#ffffff' : 'rgba(125,211,252,.55)';
                        for (let i = 1; i < trail.length; i++) {
                            ctx.lineWidth = (pass ? 5 : 14) * (i / trail.length);
                            ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke();
                        }
                    }
                    ctx.restore();
                }
                if (flash > 0) { ctx.fillStyle = 'rgba(244,63,94,' + (flash * 0.8) + ')'; ctx.fillRect(0, 0, C.W, C.H); }
                if (banner > 0 && running) {
                    ctx.save(); ctx.globalAlpha = Math.min(1, banner); ctx.textAlign = 'center';
                    ctx.font = '800 ' + Math.round(Math.min(C.W, 500) * 0.11) + 'px "Baloo 2"';
                    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.strokeText('Tabuada do ' + table + '!', C.W / 2, C.H * 0.5);
                    ctx.fillStyle = '#fde047'; ctx.fillText('Tabuada do ' + table + '!', C.W / 2, C.H * 0.5); ctx.restore();
                }
            }
            loop = G.loop((dt) => { if (G.run && G.run.state !== 'paused') update(dt); render(); });
            // frutas decorativas na tela de introdução
            const demo = setInterval(() => { if (!running && fruits.length < 3) spawn(); }, 900);
            return {
                start() { fruits = []; halves = []; juice = []; table = 0; newTable(); running = true; spawnT = 1.2; },
                pause() { running = false; },
                resume() { running = true; },
                revive() { fruits = []; running = true; spawnT = 1; },
                resize() { C.resize(); bgCache = null; },
                destroy() { loop.stop(); clearInterval(demo); window.removeEventListener('pointerup', onUp); }
            };
        }
    });

    /* ======================================================================
       JOGO: Que horas são? (relógio)
       ====================================================================== */
    G.register('clock', {
        name: 'Que Horas São?', emoji: '🕰️', desc: 'Aprenda a ler o relógio de ponteiros.', art: 'clock', tag: 'Vida real', noLives: false,
        how: [['🕐', 'O ponteiro pequeno mostra a hora'], ['🕑', 'O ponteiro grande mostra os minutos'], ['🔢', 'Cada número do grande vale 5 minutos']],
        lives: 3, coins: (s) => Math.min(100, s * 3),
        create(host, api) {
            const wrap = document.createElement('div');
            wrap.className = 'flash-wrap';
            wrap.style.cssText = 'padding-bottom:' + (G.bottomSafe() + 16) + 'px';
            wrap.innerHTML = '<div style="flex:1;min-height:0;position:relative"><canvas class="gcv" id="clkCv" style="position:absolute;inset:0"></canvas></div><div class="q-options" id="clkOpts"></div>';
            host.appendChild(wrap);
            host.style.background = 'linear-gradient(170deg,#0f766e,#134e4a 60%,#042f2e)';
            const cv = TD.$('#clkCv', wrap), ctx = cv.getContext('2d');
            let W = 0, H = 0, dpr = 1, cur = { h: 3, m: 0 }, shown = { h: 3, m: 0 }, target = null, running = false, locked = true, lvl = 1, rightCount = 0, loop = null;
            function resize() { dpr = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
            resize();
            const fmt = (t) => t.h + ':' + String(t.m).padStart(2, '0');
            function makeTime() {
                const h = TD.rand(1, 12);
                const mins = lvl <= 1 ? [0] : lvl === 2 ? [0, 30] : lvl === 3 ? [0, 15, 30, 45] : lvl === 4 ? [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] : null;
                return { h: h, m: mins ? TD.pick(mins) : TD.rand(0, 59) };
            }
            function ask() {
                target = makeTime();
                const set = new Map(); set.set(fmt(target), target);
                const cands = [
                    { h: target.h % 12 + 1, m: target.m }, { h: (target.h + 10) % 12 + 1, m: target.m },
                    { h: Math.max(1, Math.round(target.m / 5)) || 12, m: (target.h % 12) * 5 },
                    { h: target.h, m: (target.m + 30) % 60 }, { h: target.h, m: (target.m + 15) % 60 }, { h: target.h % 12 + 1, m: (target.m + 30) % 60 }
                ];
                TD.shuffle(cands).forEach((c) => { if (set.size < 4 && c.h >= 1 && c.h <= 12 && !set.has(fmt(c))) set.set(fmt(c), c); });
                while (set.size < 4) { const c = makeTime(); set.set(fmt(c), c); }
                const opts = TD.shuffle(Array.from(set.values()));
                const box = TD.$('#clkOpts', wrap);
                box.innerHTML = opts.map((o) => '<button class="q-opt" data-t="' + fmt(o) + '">' + fmt(o) + '</button>').join('');
                TD.$$('.q-opt', box).forEach((b) => b.addEventListener('click', () => pick(b)));
                api.question('Que horas são?');
                locked = false; ask.t0 = performance.now();
            }
            function pick(btn) {
                if (locked || !running) return;
                locked = true;
                const ok = btn.dataset.t === fmt(target);
                const ms = performance.now() - ask.t0;
                if (ok) {
                    btn.classList.add('right'); TD.sfx('correct'); TD.fx.burstAt(btn);
                    const st = api.answered(null, true, ms);
                    api.addScore(1); api.combo(st);
                    TD.state.stats.clockRight++;
                    rightCount++; if (rightCount % 5 === 0 && lvl < 5) { lvl++; TD.ui.toast('Nível ' + lvl, lvl === 2 ? 'Agora com meia hora!' : lvl === 3 ? 'Agora com quartos de hora!' : 'Agora de 5 em 5 minutos!', '⏰'); }
                } else {
                    btn.classList.add('wrong');
                    TD.$$('.q-opt', wrap).forEach((b) => { if (b.dataset.t === fmt(target)) b.classList.add('right'); });
                    TD.sfx('wrong'); api.answered(null, false, ms);
                    if (api.loseLife() <= 0) return;
                }
                setTimeout(() => { if (running) { cur = makeTimeFrom(); ask(); } }, ok ? 900 : 1600);
            }
            function makeTimeFrom() { return cur; }
            function draw() {
                if (cv.clientWidth !== W || cv.clientHeight !== H) resize();
                // anima os ponteiros até o horário alvo
                const tgt = target || cur;
                const tMin = (tgt.h % 12) * 60 + tgt.m;
                let sMin = (shown.h % 12) * 60 + shown.m;
                let diff = tMin - sMin; if (diff < -360) diff += 720; if (diff > 360) diff -= 720;
                sMin += diff * 0.12; if (Math.abs(diff) < 0.5) sMin = tMin;
                sMin = (sMin + 720) % 720;
                shown = { h: Math.floor(sMin / 60) || 12, m: sMin % 60 };
                ctx.clearRect(0, 0, W, H);
                const r = Math.min(W, H) * 0.4;
                const g = ctx.createRadialGradient(W / 2, H / 2, r * 0.6, W / 2, H / 2, r * 1.8); g.addColorStop(0, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
                G.drawClock(ctx, W / 2, H / 2 + 10, r, Math.floor(sMin / 60), sMin % 60);
            }
            loop = G.loop(() => draw());
            cur = makeTime(); target = cur;
            return {
                start() { running = true; lvl = TD.state.profile.age === 'kid' ? 1 : TD.state.profile.age === 'teen' ? 3 : 4; rightCount = 0; ask(); },
                pause() { running = false; }, resume() { running = true; locked = false; },
                revive() { running = true; ask(); },
                resize() { resize(); },
                destroy() { loop.stop(); host.style.background = ''; }
            };
        }
    });

    /* ======================================================================
       JOGO: Memória
       ====================================================================== */
    G.register('memory', {
        name: 'Memória Turbo', emoji: '🃏', desc: 'Encontre os pares: a conta e o resultado.', art: 'memory', ops: true, noLives: true, revive: false, unit: 'pontos',
        how: [['🃏', 'Vire duas cartas por vez'], ['🔗', 'Junte cada conta com o resultado'], ['⚡', 'Menos jogadas = mais pontos']],
        coins: (s) => Math.min(80, Math.round(s * 0.8)),
        create(host, api) {
            host.style.background = 'linear-gradient(160deg,#4c1d95,#831843)';
            const wrap = document.createElement('div');
            wrap.className = 'mem-wrap';
            wrap.style.paddingBottom = (G.bottomSafe() + 16) + 'px';
            host.appendChild(wrap);
            let first = null, lock = false, moves = 0, pairs = 0, total = 0, t0 = 0, timer = null, running = false;
            function build() {
                const n = api.age === 'kid' ? 6 : api.age === 'teen' ? 8 : 10;
                const cols = n === 6 ? 3 : 4;
                const seen = new Set(), cards = [];
                let guard = 0;
                while (cards.length < n * 2 && guard++ < 500) {
                    const q = api.q();
                    if (seen.has(q.ans) || seen.has(q.text)) continue;
                    seen.add(q.ans); seen.add(q.text);
                    cards.push({ id: cards.length, k: q.ans, label: q.text.replace(/ /g, ''), res: false, q: q }, { id: cards.length + 1, k: q.ans, label: String(q.ans), res: true, q: q });
                }
                total = cards.length / 2;
                TD.shuffle(cards);
                wrap.innerHTML = '<div class="mem-grid" style="grid-template-columns:repeat(' + cols + ',1fr);max-width:' + (cols * 110) + 'px">' +
                    cards.map((c) => '<button class="mem-card" data-k="' + c.k + '" data-res="' + (c.res ? 1 : 0) + '"><div class="face front"></div><div class="face back' + (c.res ? ' res' : '') + '" style="font-size:' + (c.label.length > 5 ? '1.05rem' : c.label.length > 3 ? '1.25rem' : '1.6rem') + '">' + c.label + '</div></button>').join('') + '</div>';
                TD.$$('.mem-card', wrap).forEach((el, i) => el.addEventListener('click', () => flip(el, cards[i])));
            }
            function flip(el, card) {
                if (!running || lock || el.classList.contains('flip') || el.classList.contains('done')) return;
                TD.sfx('whoosh'); el.classList.add('flip');
                if (!first) { first = { el: el, card: card }; return; }
                moves++;
                api.question(moves + ' jogadas', pairs + ' de ' + total + ' pares');
                const a = first; first = null;
                if (a.card.k === card.k && a.card.res !== card.res) {
                    pairs++;
                    setTimeout(() => { a.el.classList.add('done'); el.classList.add('done'); TD.sfx('correct'); TD.fx.burstAt(el, { n: 12 }); }, 300);
                    api.answered(card.q, true, 3000);
                    api.question(moves + ' jogadas', pairs + ' de ' + total + ' pares');
                    if (pairs === total) setTimeout(finish, 800);
                } else {
                    lock = true;
                    setTimeout(() => { a.el.classList.add('nope'); el.classList.add('nope'); TD.sfx('wrong'); }, 350);
                    setTimeout(() => { a.el.classList.remove('flip', 'nope'); el.classList.remove('flip', 'nope'); lock = false; }, 1000);
                }
            }
            function finish() {
                running = false;
                const secs = Math.round((Date.now() - t0) / 1000);
                const score = Math.max(10, Math.round(total * 14 - (moves - total) * 4 - secs * 0.6));
                api.setScore(score);
                api.over('<p>' + moves + ' jogadas em ' + secs + 's</p>');
            }
            build();
            TD.$$('.mem-card', wrap).forEach((el, i) => setTimeout(() => el.classList.add('flip'), 300 + i * 40));
            return {
                start() { running = true; moves = 0; pairs = 0; first = null; lock = false; build(); t0 = Date.now(); api.question('0 jogadas', '0 de ' + total + ' pares'); },
                pause() { running = false; }, resume() { running = true; },
                resize() {},
                destroy() { clearInterval(timer); host.style.background = ''; }
            };
        }
    });

    /* ======================================================================
       JOGO: Relâmpago 60s
       ====================================================================== */
    G.register('flash', {
        name: 'Relâmpago 60s', emoji: '⚡', desc: 'Quantas contas você acerta em 60 segundos?', art: 'flash', ops: true, noLives: true, revive: false, unit: 'acertos',
        how: [['⏱️', 'Você tem 60 segundos'], ['✅', 'Cada acerto vale 1 ponto e +1 segundo no combo'], ['❌', 'Errar tira 3 segundos']],
        coins: (s) => Math.min(120, s * 3),
        create(host, api) {
            host.style.background = 'linear-gradient(165deg,#9a3412,#7f1d1d 55%,#2a0a12)';
            const wrap = document.createElement('div');
            wrap.className = 'flash-wrap';
            wrap.style.paddingBottom = (G.bottomSafe() + 16) + 'px';
            host.appendChild(wrap);
            const useOpts = api.age === 'kid';
            let time = 60, q = null, typed = '', running = false, timer = null, t0 = 0;
            wrap.innerHTML = '<div class="flash-ring ring-wrap" id="flRing"></div><div class="q-card"><div class="q-expr" id="flQ" style="font-size:clamp(2.6rem,13vw,4rem)"></div></div><div id="flAns" style="margin-top:auto"></div>';
            function ring() { TD.$('#flRing', wrap).innerHTML = TD.ui.ring(time / 60 * 100, 104, 10, time <= 10 ? '#f43f5e' : '#fde047') + '<div class="ring-label" style="color:#fff">' + Math.ceil(time) + '</div>'; }
            function next() {
                q = api.q(); typed = ''; t0 = performance.now();
                drawQ();
                const box = TD.$('#flAns', wrap);
                if (useOpts) {
                    box.innerHTML = '<div class="q-options">' + api.options(q, 4).map((v) => '<button class="q-opt" data-v="' + v + '">' + v + '</button>').join('') + '</div>';
                    TD.$$('.q-opt', box).forEach((b) => b.addEventListener('click', () => check(Number(b.dataset.v), b)));
                } else if (!TD.$('.numpad', box)) {
                    box.innerHTML = '<div class="numpad">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => '<button data-k="' + n + '">' + n + '</button>').join('') + '<button class="np-del" data-k="del">⌫</button><button data-k="0">0</button><button class="np-ok" data-k="ok">✓</button></div>';
                    TD.$$('.numpad button', box).forEach((b) => b.addEventListener('click', () => {
                        if (!running) return;
                        const k = b.dataset.k; TD.sfx('tap');
                        if (k === 'del') typed = typed.slice(0, -1); else if (k === 'ok') { if (typed) check(Number(typed)); return; } else if (typed.length < 6) typed += k;
                        drawQ();
                        if (typed && Number(typed) === q.ans) check(q.ans);
                    }));
                }
            }
            function drawQ() { TD.$('#flQ', wrap).innerHTML = q.a + '<span class="op"> ' + TD.opSym[q.op] + ' </span>' + q.b + ' <span class="op">=</span> <span class="qm' + (typed ? ' typed' : '') + '">' + (typed || '?') + '</span>'; }
            function check(v, btn) {
                if (!running) return;
                const ok = v === q.ans, ms = performance.now() - t0;
                if (ok) {
                    const st = api.answered(q, true, ms);
                    api.addScore(1); api.combo(st); TD.sfx('correct'); TD.buzz('light');
                    if (st > 0 && st % 5 === 0) { time = Math.min(60, time + 3); TD.ui.toast('+3 segundos!', 'Combo de ' + st, '⏱️'); }
                    if (btn) btn.classList.add('right');
                    setTimeout(next, btn ? 250 : 120);
                } else {
                    api.answered(q, false, ms); TD.sfx('wrong'); TD.buzz('error');
                    time = Math.max(0, time - 3);
                    if (btn) btn.classList.add('wrong');
                    const card = TD.$('.q-card', wrap); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
                    typed = ''; drawQ();
                    if (btn) setTimeout(next, 400);
                }
                ring();
            }
            function tick() {
                if (!running) return;
                time -= 0.1;
                if (Math.abs(time - Math.round(time)) < 0.05) ring();
                if (time <= 10 && Math.abs(time - Math.round(time)) < 0.05) TD.sfx('tick');
                if (time <= 0) { time = 0; ring(); running = false; api.over(); }
            }
            q = api.q(); drawQ(); ring();
            return {
                start() { time = 60; running = true; TD.$('#flAns', wrap).innerHTML = ''; next(); ring(); clearInterval(timer); timer = setInterval(tick, 100); },
                pause() { running = false; }, resume() { running = true; },
                resize() {},
                destroy() { clearInterval(timer); host.style.background = ''; }
            };
        }
    });
})();
