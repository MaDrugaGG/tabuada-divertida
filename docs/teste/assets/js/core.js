/* ==========================================================================
   Tabuada Divertida 3.0 — Núcleo (estado, economia, UI, áudio, navegação)
   ========================================================================== */
'use strict';
(function () {
    const TD = window.TD = window.TD || {};
    TD.VERSION = '3.0.0';
    TD.PLAY_URL = 'https://play.google.com/store/apps/details?id=com.tabuadadivertida.app';

    // Compatibilidade com Safari/iOS mais antigo (canvas sem roundRect)
    if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
            let rr = Array.isArray(r) ? (r[0] || 0) : (r || 0);
            rr = Math.max(0, Math.min(rr, Math.abs(w) / 2, Math.abs(h) / 2));
            this.moveTo(x + rr, y);
            this.arcTo(x + w, y, x + w, y + h, rr);
            this.arcTo(x + w, y + h, x, y + h, rr);
            this.arcTo(x, y + h, x, y, rr);
            this.arcTo(x, y, x + w, y, rr);
            this.closePath();
            return this;
        };
    }
    TD.PRIVACY_URL = 'https://madrugagg.github.io/tabuada-divertida/privacy-policy.html';

    /* ---------------- Utilidades ---------------- */
    TD.$ = (s, r) => (r || document).querySelector(s);
    TD.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
    TD.rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
    TD.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    TD.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    TD.lerp = (a, b, t) => a + (b - a) * t;
    TD.shuffle = (arr) => {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    };
    TD.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    TD.fmt = (n) => Number(n || 0).toLocaleString('pt-BR');
    TD.dateKey = (d) => {
        const x = d || new Date();
        return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
    };
    TD.today = () => TD.dateKey(new Date());
    TD.yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return TD.dateKey(d); };
    TD.hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
    TD.seeded = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    TD.isNative = () => !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
    TD.plugin = (name) => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[name]) || null;
    TD.wait = (ms) => new Promise((r) => setTimeout(r, ms));
    TD.opSym = { mul: '×', add: '+', sub: '−', div: '÷' };
    TD.opWord = { mul: 'vezes', add: 'mais', sub: 'menos', div: 'dividido por' };

    /* ---------------- Ícones ---------------- */
    const ICONS = {
        home: '<path d="M3.5 11.2 12 4l8.5 7.2"/><path d="M5.8 9.8v9.7h12.4V9.8"/><path d="M10 19.5v-5h4v5"/>',
        learn: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/><path d="M9 7.5h6M9 11h4"/>',
        games: '<rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7.5 10.3v4.4M5.3 12.5h4.4"/><path d="M15.4 11.3h.01M18 13.8h.01"/>',
        tools: '<rect x="5" y="2.5" width="14" height="19" rx="3.2"/><rect x="8" y="5.5" width="8" height="4" rx="1"/><path d="M8.6 13.2h.01M12 13.2h.01M15.4 13.2h.01M8.6 17h.01M12 17h.01M15.4 17h.01"/>',
        profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
        back: '<path d="M15 5l-7 7 7 7"/>',
        close: '<path d="M6 6l12 12M18 6 6 18"/>',
        play: '<path d="M8 5.2v13.6L19.2 12z" fill="currentColor" stroke-linejoin="round"/>',
        pause: '<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="3.6"/>',
        star: '<path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="currentColor" stroke-linejoin="round"/>',
        flame: '<path d="M12 22c4 0 7-2.8 7-6.8 0-3.2-2-5.6-3.6-7.4-.4 1.8-1.4 3-2.6 3.4.4-3.6-1.4-6.8-4.2-8.2.4 3-1.4 5.2-2.8 7C4.8 11.4 5 13.4 5 15.2 5 19.2 8 22 12 22z" fill="currentColor" stroke="none"/>',
        bulb: '<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
        sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
        mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
        settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M5.5 18.5l1.9-1.9M16.6 7.4l1.9-1.9"/>',
        trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4"/><path d="M12 13v3.5M8.5 20.5h7M9.5 16.5h5v4h-5z"/>',
        chart: '<path d="M4 20V11M10 20V5M16 20v-6M21 20H3"/>',
        lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
        check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
        chev: '<path d="M9 5l7 7-7 7"/>',
        gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5"/><path d="M12 8C10.5 4 6.5 4.5 7.5 7c.4 1 2.5 1 4.5 1zM12 8c1.5-4 5.5-3.5 4.5-1-.4 1-2.5 1-4.5 1z"/>',
        video: '<rect x="2.5" y="6" width="13" height="12" rx="3"/><path d="M15.5 10.5 21 7.5v9l-5.5-3z"/>',
        spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" fill="currentColor" stroke-linejoin="round"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" fill="currentColor" stroke="none"/>',
        map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
        bag: '<path d="M5 8h14l-1 12.5H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
        refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
        eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
        heart: '<path d="M12 20.5s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8 4.5 4.5 0 0 1 8 2.8c0 6.2-8 11-8 11z" fill="currentColor" stroke="none"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
        bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
        vibrate: '<rect x="7.5" y="3.5" width="9" height="17" rx="2"/><path d="M4 8.5v7M20 8.5v7"/>',
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
        edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
        trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
        shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6z"/>',
        target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
        brain: '<path d="M9 4.5a3 3 0 0 0-3 3 3 3 0 0 0-1.5 5.3A3 3 0 0 0 7 18a2.5 2.5 0 0 0 5 .5V6a2 2 0 0 0-3-1.5z"/><path d="M15 4.5a3 3 0 0 1 3 3 3 3 0 0 1 1.5 5.3A3 3 0 0 1 17 18a2.5 2.5 0 0 1-5 .5"/>'
    };
    TD.icon = (name, size, extra) => {
        const s = size || 22;
        return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + (ICONS[name] || '') + '</svg>';
    };
    TD.heartSvg = () => '<svg viewBox="0 0 24 22"><path d="M12 21s-9-5.4-9-12.2A5 5 0 0 1 12 6a5 5 0 0 1 9 2.8C21 15.6 12 21 12 21z" fill="#fb4b6b" stroke="#fff" stroke-width="1.5"/><ellipse cx="8" cy="8.5" rx="2.2" ry="1.4" fill="#fff" opacity=".6"/></svg>';
    TD.starSvg = (on) => '<svg viewBox="0 0 24 24" class="st' + (on ? ' on' : '') + '"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z" fill="#fbbf24" stroke="#b45309" stroke-width="1.2" stroke-linejoin="round"/><path d="M12 5.5l1.8 3.8" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".7"/></svg>';
    TD.stars = (n, total) => { let s = ''; for (let i = 0; i < (total || 3); i++) s += i < n ? '⭐' : '☆'; return s; };

    /* ---------------- Mascote "Pi" ---------------- */
    let mascotSeq = 0;
    TD.mascot = (mood, size, cls) => {
        const id = 'pm' + (++mascotSeq);
        const sz = size || 96;
        const mouths = {
            happy: '<path d="M49 78 Q60 89 71 78" stroke="#1b1446" stroke-width="4.5" fill="none" stroke-linecap="round"/>',
            big: '<path d="M47 75 Q60 96 73 75 Z" fill="#1b1446"/><path d="M53 84 Q60 91 67 84 Q60 86 53 84Z" fill="#ff6b9a"/>',
            wow: '<ellipse cx="60" cy="82" rx="6.5" ry="8" fill="#1b1446"/>',
            sad: '<path d="M50 86 Q60 77 70 86" stroke="#1b1446" stroke-width="4.5" fill="none" stroke-linecap="round"/>',
            think: '<path d="M52 83 Q60 80 69 81" stroke="#1b1446" stroke-width="4.5" fill="none" stroke-linecap="round"/>'
        };
        const m = mood || 'happy';
        return '<svg class="mascot ' + (cls || '') + '" width="' + sz + '" height="' + sz + '" viewBox="0 0 120 120" aria-hidden="true">' +
            '<defs><radialGradient id="' + id + 'b" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#c4b5fd"/><stop offset=".55" stop-color="#7c5cff"/><stop offset="1" stop-color="#4c2fd0"/></radialGradient>' +
            '<radialGradient id="' + id + 's" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff7c2"/><stop offset="1" stop-color="#fbbf24"/></radialGradient></defs>' +
            '<ellipse cx="60" cy="113" rx="28" ry="4.5" fill="rgba(0,0,0,.22)"/>' +
            '<g class="m-float">' +
            '<g class="m-antenna"><path d="M60 30 Q57 21 62 13" stroke="#5b3be6" stroke-width="4" fill="none" stroke-linecap="round"/>' +
            '<circle class="m-star" cx="62" cy="11" r="9" fill="url(#' + id + 's)" opacity=".35"/>' +
            '<path class="m-star" d="M62 4.5l1.9 4 4.4.6-3.2 3 .8 4.4-3.9-2.1-3.9 2.1.8-4.4-3.2-3 4.4-.6z" fill="#fde047" stroke="#f59e0b" stroke-width="1" stroke-linejoin="round"/></g>' +
            '<ellipse cx="23" cy="76" rx="8" ry="12.5" fill="#5b3be6" transform="rotate(24 23 76)"/>' +
            '<g class="m-arm-r' + (m === 'wave' || cls === 'wave' ? ' wave' : '') + '"><ellipse cx="97" cy="76" rx="8" ry="12.5" fill="#5b3be6" transform="rotate(-24 97 76)"/></g>' +
            '<circle cx="60" cy="68" r="40" fill="url(#' + id + 'b)"/>' +
            '<ellipse cx="45" cy="45" rx="14" ry="7.5" fill="rgba(255,255,255,.38)" transform="rotate(-28 45 45)"/>' +
            '<g class="m-eyes"><ellipse cx="46.5" cy="62" rx="9.5" ry="11.5" fill="#fff"/><ellipse cx="73.5" cy="62" rx="9.5" ry="11.5" fill="#fff"/>' +
            '<circle cx="48" cy="64.5" r="5.6" fill="#1b1446"/><circle cx="72" cy="64.5" r="5.6" fill="#1b1446"/>' +
            '<circle cx="50" cy="61.5" r="2.2" fill="#fff"/><circle cx="74" cy="61.5" r="2.2" fill="#fff"/></g>' +
            '<circle cx="35" cy="77" r="5.5" fill="#ff8fc0" opacity=".65"/><circle cx="85" cy="77" r="5.5" fill="#ff8fc0" opacity=".65"/>' +
            (mouths[m] || mouths.happy) +
            '<text x="60" y="103" text-anchor="middle" font-family="\'Baloo 2\', sans-serif" font-weight="800" font-size="13" fill="rgba(255,255,255,.55)">π</text>' +
            '</g></svg>';
    };

    /* ---------------- Catálogos ---------------- */
    TD.AVATARS = [
        { id: 'fox', e: '🦊', bg: 'linear-gradient(135deg,#fdba74,#ea580c)', price: 0 },
        { id: 'panda', e: '🐼', bg: 'linear-gradient(135deg,#e2e8f0,#64748b)', price: 0 },
        { id: 'cat', e: '🐱', bg: 'linear-gradient(135deg,#fde68a,#f59e0b)', price: 0 },
        { id: 'dog', e: '🐶', bg: 'linear-gradient(135deg,#e7c9a5,#a16207)', price: 0 },
        { id: 'frog', e: '🐸', bg: 'linear-gradient(135deg,#86efac,#15803d)', price: 0 },
        { id: 'lion', e: '🦁', bg: 'linear-gradient(135deg,#fcd34d,#c2410c)', price: 0 },
        { id: 'bunny', e: '🐰', bg: 'linear-gradient(135deg,#fbcfe8,#db2777)', price: 0 },
        { id: 'bear', e: '🐻', bg: 'linear-gradient(135deg,#d6a77a,#7c2d12)', price: 0 },
        { id: 'owl', e: '🦉', bg: 'linear-gradient(135deg,#c4b5fd,#6d28d9)', price: 80 },
        { id: 'penguin', e: '🐧', bg: 'linear-gradient(135deg,#bae6fd,#0369a1)', price: 80 },
        { id: 'koala', e: '🐨', bg: 'linear-gradient(135deg,#cbd5e1,#475569)', price: 100 },
        { id: 'monkey', e: '🐵', bg: 'linear-gradient(135deg,#fed7aa,#9a3412)', price: 100 },
        { id: 'tiger', e: '🐯', bg: 'linear-gradient(135deg,#fdba74,#b45309)', price: 120 },
        { id: 'octopus', e: '🐙', bg: 'linear-gradient(135deg,#f9a8d4,#be185d)', price: 150 },
        { id: 'unicorn', e: '🦄', bg: 'linear-gradient(135deg,#f5d0fe,#a21caf)', price: 200 },
        { id: 'dragon', e: '🐲', bg: 'linear-gradient(135deg,#bbf7d0,#047857)', price: 250 },
        { id: 'robot', e: '🤖', bg: 'linear-gradient(135deg,#a5f3fc,#0e7490)', price: 250 },
        { id: 'alien', e: '👽', bg: 'linear-gradient(135deg,#d9f99d,#4d7c0f)', price: 300 },
        { id: 'dino', e: '🦖', bg: 'linear-gradient(135deg,#bef264,#3f6212)', price: 300 },
        { id: 'astro', e: '🧑‍🚀', bg: 'linear-gradient(135deg,#c7d2fe,#3730a3)', price: 400 },
        { id: 'wizard', e: '🧙', bg: 'linear-gradient(135deg,#ddd6fe,#5b21b6)', price: 450 },
        { id: 'hero', e: '🦸', bg: 'linear-gradient(135deg,#fecaca,#b91c1c)', price: 500 },
        { id: 'crown', e: '👑', bg: 'linear-gradient(135deg,#fef08a,#a16207)', price: 800 }
    ];
    TD.THEMES = [
        { id: 'cosmos', name: 'Cosmos', price: 0, sw: 'linear-gradient(135deg,#1d1356,#7c5cff)', bar: '#0b0a24' },
        { id: 'ocean', name: 'Oceano', price: 250, sw: 'linear-gradient(135deg,#06324a,#0ea5e9)', bar: '#03141f' },
        { id: 'forest', name: 'Floresta', price: 250, sw: 'linear-gradient(135deg,#0b3320,#22c55e)', bar: '#04140c' },
        { id: 'candy', name: 'Doce', price: 350, sw: 'linear-gradient(135deg,#ffe9f5,#ec4899)', bar: '#ffe9f5' },
        { id: 'sunrise', name: 'Amanhecer', price: 350, sw: 'linear-gradient(135deg,#fff6e8,#f97316)', bar: '#fff6e8' }
    ];
    TD.avatarById = (id) => TD.AVATARS.find((a) => a.id === id) || TD.AVATARS[0];
    TD.avatarHtml = (id, size, lvl) => {
        const a = TD.avatarById(id);
        return '<div class="avatar" style="--size:' + (size || 46) + 'px;--av-bg:' + a.bg + '">' + a.e + (lvl ? '<span class="lvl">' + lvl + '</span>' : '') + '</div>';
    };

    /* ---------------- Estado ---------------- */
    const KEY = 'td3_state';
    function defaults() {
        return {
            v: 3,
            created: Date.now(),
            onboarded: false,
            profile: { name: '', avatar: 'fox', age: 'kid' },
            settings: { sound: true, haptics: true, theme: 'cosmos', answerMode: 'auto', reminder: false, reminderHour: 18 },
            coins: 60,
            xp: 0,
            stats: { correct: 0, wrong: 0, bestStreak: 0, totalMs: 0, timed: 0, games: 0, quizzes: 0, tools: {}, perfect: 0, clockRight: 0, balloons: 0 },
            facts: {},
            ops: { add: { c: 0, w: 0 }, sub: { c: 0, w: 0 }, mul: { c: 0, w: 0 }, div: { c: 0, w: 0 } },
            path: { mul: {}, add: {}, sub: {}, div: {} },
            best: { galaxy: 0, racer: 0, balloons: 0, ninja: 0, memory: 0, flash: 0, clock: 0 },
            daily: { date: '', missions: [], chest: false, allBonus: false, streak: 0, bestStreak: 0, lastActive: '' },
            activity: {},
            badges: {},
            owned: { avatars: {}, themes: { cosmos: 1 } },
            ads: { shopReward: 0 },
            studied: {}
        };
    }
    function merge(base, saved) {
        if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return base;
        Object.keys(saved).forEach((k) => {
            const bv = base[k], sv = saved[k];
            if (bv && typeof bv === 'object' && !Array.isArray(bv) && sv && typeof sv === 'object' && !Array.isArray(sv)) base[k] = merge(bv, sv);
            else base[k] = sv;
        });
        return base;
    }
    function migrateFromV2(s) {
        let old = null;
        try { old = JSON.parse(localStorage.getItem('tabuada_v2') || 'null'); } catch (e) { old = null; }
        if (!old || typeof old !== 'object') return;
        s.xp = Math.max(0, Number(old.xp) || 0);
        s.coins += Math.min(3000, Math.round((Number(old.points) || 0) / 4));
        s.stats.correct = Number(old.totalCorrect) || 0;
        s.stats.wrong = Number(old.totalWrong) || 0;
        s.best.flash = Number(old.challengeRecord) || 0;
        const ls = old.lessonStars || {};
        for (let i = 1; i <= 13; i++) if (ls[i]) s.path.mul['m' + i] = ls[i];
        Object.keys(ls).forEach((k) => {
            const m = /^op_(add|sub|div)_([emh]\d)$/.exec(k);
            if (m) s.path[m[1]][m[1] + '_' + m[2]] = ls[k];
        });
        const mastered = old.tabuadasMastered || {};
        Object.keys(mastered).forEach((t) => {
            for (let b = 1; b <= 10; b++) s.facts[t + 'x' + b] = { b: 3, c: 2, w: 0, t: Date.now(), ms: 4000 };
        });
        s.migrated = true;
    }
    function load() {
        let saved = null;
        try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { saved = null; }
        const base = defaults();
        if (!saved) { migrateFromV2(base); return base; }
        return merge(base, saved);
    }
    TD.defaults = defaults;
    TD.state = load();
    let saveTimer = null;
    TD.save = (now) => {
        clearTimeout(saveTimer);
        const write = () => { try { localStorage.setItem(KEY, JSON.stringify(TD.state)); } catch (e) {} };
        if (now) write(); else saveTimer = setTimeout(write, 250);
    };
    window.addEventListener('pagehide', () => TD.save(true));
    document.addEventListener('visibilitychange', () => { if (document.hidden) TD.save(true); });

    /* ---------------- Economia: moedas e XP ---------------- */
    TD.levelInfo = (xp) => {
        let lvl = 1, rest = Math.max(0, xp || 0), need = 100;
        while (rest >= need) { rest -= need; lvl++; need = 100 + (lvl - 1) * 40; }
        return { level: lvl, cur: rest, need: need, pct: Math.round((rest / need) * 100) };
    };
    TD.addCoins = (n, fromEl) => {
        if (!n) return;
        TD.state.coins = Math.max(0, TD.state.coins + n);
        TD.save();
        if (n > 0 && fromEl) TD.ui.coinFly(fromEl, n);
        else TD.ui.updatePills(true);
    };
    TD.spend = (n) => {
        if (TD.state.coins < n) return false;
        TD.state.coins -= n; TD.save(); TD.ui.updatePills(true); return true;
    };
    TD.addXP = (n) => {
        if (!n) return;
        const before = TD.levelInfo(TD.state.xp).level;
        TD.state.xp += n;
        const after = TD.levelInfo(TD.state.xp).level;
        TD.save();
        if (after > before) {
            setTimeout(() => {
                TD.sfx('levelup'); TD.buzz('success');
                TD.ui.toast('Nível ' + after + '!', 'Você subiu de nível e ganhou 30 moedas', '🚀');
                TD.addCoins(30);
                TD.fx.confetti();
            }, 600);
        }
        TD.ui.updatePills();
    };

    /* ---------------- Missões, sequência e atividade ---------------- */
    const MISSIONS = [
        { id: 'answer', ev: 'answer', icon: '✏️', t: 'Responda {n} perguntas', n: [15, 20, 30] },
        { id: 'correct', ev: 'correct', icon: '🎯', t: 'Acerte {n} respostas', n: [10, 15, 25] },
        { id: 'streak', ev: 'streak', icon: '🔥', t: 'Acerte {n} seguidas', n: [5, 8, 10], max: true },
        { id: 'games', ev: 'game', icon: '🎮', t: 'Jogue {n} jogos', n: [2, 3] },
        { id: 'path', ev: 'path', icon: '🗺️', t: 'Complete {n} fase(s) da trilha', n: [1, 2] },
        { id: 'tool', ev: 'tool', icon: '🧮', t: 'Use {n} ferramenta', n: [1] },
        { id: 'smart', ev: 'smart', icon: '🧠', t: 'Faça {n} Treino Inteligente', n: [1] },
        { id: 'study', ev: 'study', icon: '📖', t: 'Estude {n} tabuada(s)', n: [1, 2] }
    ];
    TD.daily = {
        ensure() {
            const d = TD.state.daily, today = TD.today();
            if (d.date === today) return;
            d.date = today; d.chest = false; d.allBonus = false;
            const rnd = TD.seeded(TD.hash(today + (TD.state.profile.name || '')));
            const pool = MISSIONS.slice();
            const chosen = [];
            while (chosen.length < 3 && pool.length) chosen.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
            d.missions = chosen.map((m) => {
                const n = m.n[Math.floor(rnd() * m.n.length)];
                return { id: m.id, ev: m.ev, icon: m.icon, text: m.t.replace('{n}', n), target: n, prog: 0, done: false, reward: 20 + Math.round(rnd() * 3) * 5, max: !!m.max };
            });
            if (d.lastActive && d.lastActive !== TD.yesterday() && d.lastActive !== today) d.streak = 0;
            TD.save();
        },
        streak() {
            const d = TD.state.daily;
            if (d.lastActive === TD.today() || d.lastActive === TD.yesterday()) return d.streak;
            return 0;
        },
        markActive() {
            const d = TD.state.daily, today = TD.today();
            if (d.lastActive === today) return;
            d.streak = d.lastActive === TD.yesterday() ? d.streak + 1 : 1;
            d.lastActive = today;
            d.bestStreak = Math.max(d.bestStreak || 0, d.streak);
            TD.save();
            TD.ui.updatePills(true);
            if (d.streak > 1) setTimeout(() => TD.ui.toast(d.streak + ' dias seguidos!', 'Sua sequência está pegando fogo', '🔥'), 900);
        },
        progress(ev, amount, absolute) {
            this.ensure();
            const d = TD.state.daily;
            let changed = false;
            d.missions.forEach((m) => {
                if (m.done || m.ev !== ev) return;
                if (m.max || absolute) m.prog = Math.max(m.prog, amount); else m.prog += amount;
                if (m.prog >= m.target) {
                    m.prog = m.target; m.done = true; changed = true;
                    TD.addCoins(m.reward);
                    TD.sfx('coin');
                    TD.ui.toast('Missão completa!', m.text + ' • +' + m.reward + ' moedas', m.icon);
                }
            });
            if (changed && !d.allBonus && d.missions.length && d.missions.every((m) => m.done)) {
                d.allBonus = true;
                setTimeout(() => {
                    TD.addCoins(60); TD.fx.confetti(); TD.sfx('win');
                    TD.ui.toast('Todas as missões!', 'Bônus de 60 moedas', '🏆');
                }, 1400);
            }
            TD.save();
        }
    };

    /* ---------------- Conquistas ---------------- */
    TD.BADGES = [
        { id: 'first', e: '🌱', n: 'Primeiro acerto', d: 'Acertou a primeira conta', ok: (s) => s.stats.correct >= 1 },
        { id: 'c100', e: '💯', n: 'Centena', d: '100 acertos no total', ok: (s) => s.stats.correct >= 100 },
        { id: 'c1000', e: '🧠', n: 'Cérebro de ouro', d: '1.000 acertos no total', ok: (s) => s.stats.correct >= 1000 },
        { id: 's10', e: '⚡', n: 'Imparável', d: '10 acertos seguidos', ok: (s) => s.stats.bestStreak >= 10 },
        { id: 's25', e: '🌪️', n: 'Furacão', d: '25 acertos seguidos', ok: (s) => s.stats.bestStreak >= 25 },
        { id: 'd3', e: '🔥', n: 'Esquentando', d: '3 dias seguidos', ok: (s) => (s.daily.bestStreak || 0) >= 3 },
        { id: 'd7', e: '📅', n: 'Semana perfeita', d: '7 dias seguidos', ok: (s) => (s.daily.bestStreak || 0) >= 7 },
        { id: 'd30', e: '🏅', n: 'Lenda', d: '30 dias seguidos', ok: (s) => (s.daily.bestStreak || 0) >= 30 },
        { id: 'perfect', e: '🎯', n: 'Perfeito', d: 'Fase sem nenhum erro', ok: (s) => s.stats.perfect >= 1 },
        { id: 'galaxy', e: '🚀', n: 'Piloto espacial', d: '25 pontos na Galáxia', ok: (s) => s.best.galaxy >= 25 },
        { id: 'racer', e: '🏎️', n: 'Piloto turbo', d: '20 portais na Corrida', ok: (s) => s.best.racer >= 20 },
        { id: 'balloon', e: '🎈', n: 'Estoura-tudo', d: '50 balões estourados', ok: (s) => s.stats.balloons >= 50 },
        { id: 'ninja', e: '🥷', n: 'Ninja', d: '30 pontos no Ninja', ok: (s) => s.best.ninja >= 30 },
        { id: 'flash', e: '⏱️', n: 'Relâmpago', d: '20 acertos em 60s', ok: (s) => s.best.flash >= 20 },
        { id: 'clock', e: '🕰️', n: 'Relojoeiro', d: '20 horas certas', ok: (s) => s.stats.clockRight >= 20 },
        { id: 'tools', e: '🧰', n: 'Faz-tudo', d: 'Usou 5 ferramentas', ok: (s) => Object.keys(s.stats.tools).length >= 5 },
        { id: 'mulworld', e: '👑', n: 'Rei da tabuada', d: 'Completou a trilha ×', ok: (s) => !!s.path.mul.m13 },
        { id: 'master', e: '🌟', n: 'Mestre total', d: 'Dominou as 100 contas', ok: (s) => TD.learn && TD.learn.masteredCount() >= 100 },
        { id: 'shop', e: '🛍️', n: 'Colecionador', d: 'Comprou 3 itens', ok: (s) => (Object.keys(s.owned.avatars).length + Object.keys(s.owned.themes).length - 1) >= 3 },
        { id: 'lvl10', e: '🎖️', n: 'Veterano', d: 'Chegou ao nível 10', ok: (s) => TD.levelInfo(s.xp).level >= 10 }
    ];
    TD.checkBadges = () => {
        const s = TD.state;
        TD.BADGES.forEach((b) => {
            if (s.badges[b.id]) return;
            let ok = false;
            try { ok = b.ok(s); } catch (e) { ok = false; }
            if (!ok) return;
            s.badges[b.id] = Date.now();
            setTimeout(() => {
                TD.ui.toast('Conquista: ' + b.n, b.d + ' • +40 moedas', b.e);
                TD.addCoins(40); TD.sfx('levelup');
            }, 700);
        });
        TD.save();
    };

    /* ---------------- Rastreamento central de progresso ---------------- */
    TD.track = (ev, data) => {
        const s = TD.state;
        data = data || {};
        TD.daily.ensure();
        if (ev === 'answer') {
            if (data.correct) s.stats.correct++; else s.stats.wrong++;
            if (data.op && s.ops[data.op]) { if (data.correct) s.ops[data.op].c++; else s.ops[data.op].w++; }
            if (data.ms && data.ms < 60000) { s.stats.totalMs += data.ms; s.stats.timed++; }
            if (data.streak) s.stats.bestStreak = Math.max(s.stats.bestStreak, data.streak);
            const k = TD.today();
            s.activity[k] = (s.activity[k] || 0) + 1;
            TD.daily.markActive();
            TD.daily.progress('answer', 1);
            if (data.correct) TD.daily.progress('correct', 1);
            if (data.streak) TD.daily.progress('streak', data.streak, true);
        } else if (ev === 'game') {
            s.stats.games++;
            TD.daily.markActive();
            TD.daily.progress('game', 1);
        } else {
            TD.daily.progress(ev, 1);
        }
        const keys = Object.keys(s.activity);
        if (keys.length > 60) keys.sort().slice(0, keys.length - 60).forEach((k) => delete s.activity[k]);
        TD.save();
        if (ev !== 'answer' || data.correct) TD.checkBadges();
    };

    /* ---------------- Áudio sintetizado ---------------- */
    /* Motor de som musical: marimba, sininhos e um eco de sala suave. Sem voz. */
    let actx = null, bus = null, noiseBuf = null;
    const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093, 2349.32, 2637.02];
    function impulse(c, secs, decay) {
        const len = Math.floor(c.sampleRate * secs), buf = c.createBuffer(2, len, c.sampleRate);
        for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
        return buf;
    }
    function ac() {
        if (!actx) {
            const C = window.AudioContext || window.webkitAudioContext;
            if (!C) return null;
            try { actx = new C({ latencyHint: 'interactive' }); } catch (e) { actx = new C(); }
            const comp = actx.createDynamicsCompressor();
            comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.18;
            comp.connect(actx.destination);
            bus = actx.createGain(); bus.gain.value = 0.75; bus.connect(comp);
            const rev = actx.createConvolver(); rev.buffer = impulse(actx, 1.2, 3.4);
            const wet = actx.createGain(); wet.gain.value = 0.18;
            bus.connect(rev); rev.connect(wet); wet.connect(comp);
            noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
            const nd = noiseBuf.getChannelData(0);
            for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        }
        if (actx.state === 'suspended') actx.resume().catch(() => {});
        return actx;
    }
    function osc(freq, at, dur, o) {
        const c = ac(); if (!c) return;
        o = o || {};
        const t = c.currentTime + (at || 0);
        const v = c.createOscillator(), g = c.createGain();
        v.type = o.type || 'sine';
        v.frequency.setValueAtTime(freq, t);
        if (o.to) v.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + (o.glide || dur));
        if (o.detune) v.detune.value = o.detune;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(o.vol || 0.15, t + (o.attack || 0.004));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        let node = g;
        if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; g.connect(f); node = f; }
        v.connect(g); node.connect(bus);
        v.start(t); v.stop(t + dur + 0.05);
    }
    function noise(at, dur, o) {
        const c = ac(); if (!c || !noiseBuf) return;
        o = o || {};
        const t = c.currentTime + (at || 0);
        const src = c.createBufferSource(); src.buffer = noiseBuf;
        const f = c.createBiquadFilter(); f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.freq || 1500, t); f.Q.value = o.q || 0.7;
        if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.to), t + dur);
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t + (o.attack || 0.005));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f); f.connect(g); g.connect(bus);
        src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
    }
    // marimba: fundamental + harmônico 4x curto + batida da baqueta
    function mallet(f, at, vol) {
        vol = vol || 0.2;
        osc(f, at, 0.55, { vol: vol });
        osc(f * 4, at, 0.09, { vol: vol * 0.32 });
        osc(f * 2, at, 0.22, { vol: vol * 0.18, type: 'triangle' });
        noise(at, 0.018, { type: 'highpass', freq: 2500, vol: vol * 0.25 });
    }
    // sininho: parciais de sino com caudas diferentes
    function bell(f, at, vol) {
        vol = vol || 0.1;
        osc(f, at, 1.1, { vol: vol });
        osc(f * 2.76, at, 0.45, { vol: vol * 0.45 });
        osc(f * 5.4, at, 0.22, { vol: vol * 0.22 });
        osc(f, at, 0.9, { vol: vol * 0.4, detune: 7 });
    }
    const SFX = {
        tap: () => { osc(1318, 0, 0.06, { vol: 0.05, type: 'triangle' }); noise(0, 0.012, { type: 'highpass', freq: 3500, vol: 0.03 }); },
        nav: () => mallet(1046.5, 0, 0.06),
        note: (i) => { const f = SCALE[TD.clamp(i || 0, 0, SCALE.length - 1)]; mallet(f, 0, 0.18); bell(f * 2, 0.02, 0.025); },
        correct: () => { mallet(783.99, 0, 0.2); mallet(1174.66, 0.075, 0.19); bell(2349.32, 0.13, 0.05); },
        wrong: () => { osc(330, 0, 0.32, { vol: 0.16, lp: 900 }); osc(262, 0.12, 0.42, { vol: 0.16, lp: 800 }); osc(131, 0.12, 0.3, { vol: 0.08, lp: 500 }); },
        coin: () => { bell(1567.98, 0, 0.09); bell(2093, 0.07, 0.09); },
        pop: () => { osc(520, 0, 0.07, { vol: 0.22, to: 1500, glide: 0.05 }); noise(0, 0.06, { type: 'bandpass', freq: 2400, q: 1.2, vol: 0.18 }); bell(2637, 0.03, 0.03); },
        laser: () => { osc(1900, 0, 0.2, { type: 'sawtooth', vol: 0.06, to: 260, lp: 3200 }); osc(950, 0, 0.16, { type: 'square', vol: 0.025, to: 180, lp: 2000 }); },
        boom: () => { noise(0, 0.7, { vol: 0.5, freq: 1600, to: 90 }); osc(95, 0, 0.5, { vol: 0.32, to: 38 }); noise(0.05, 0.4, { type: 'bandpass', freq: 600, vol: 0.12 }); },
        slice: () => { noise(0, 0.14, { type: 'highpass', freq: 2200, to: 6000, vol: 0.2 }); osc(2600, 0.02, 0.12, { vol: 0.05, type: 'triangle', to: 1800 }); },
        whoosh: () => noise(0, 0.32, { type: 'bandpass', freq: 380, to: 2600, q: 1.3, vol: 0.18, attack: 0.06 }),
        crash: () => { noise(0, 0.45, { vol: 0.45, freq: 900, to: 120 }); osc(140, 0, 0.3, { vol: 0.18, to: 60 }); osc(330, 0.08, 0.3, { vol: 0.08, lp: 700 }); },
        levelup: () => { [0, 2, 4, 5, 7].forEach((n, i) => mallet(SCALE[n], i * 0.085, 0.17)); bell(SCALE[10], 0.45, 0.08); bell(SCALE[12], 0.5, 0.05); },
        win: () => { [0, 2, 3, 4, 5, 7, 9].forEach((n, i) => mallet(SCALE[n], i * 0.07, 0.15)); [5, 7, 9].forEach((n) => bell(SCALE[n] * 2, 0.52, 0.04)); },
        lose: () => { [4, 2, 0].forEach((n, i) => mallet(SCALE[n] / 2, i * 0.16, 0.16)); },
        tick: () => { osc(2093, 0, 0.03, { vol: 0.035, type: 'triangle' }); },
        star: (i) => { const f = SCALE[4 + (i || 0) * 2]; mallet(f, 0, 0.18); bell(f * 2, 0.03, 0.06); },
        combo: (n) => { const f = SCALE[TD.clamp((n || 1) - 1, 0, SCALE.length - 1)]; mallet(f, 0, 0.12); bell(f * 2, 0.02, 0.03); },
        chest: () => { noise(0, 0.5, { type: 'bandpass', freq: 3000, to: 9000, q: 0.6, vol: 0.06, attack: 0.08 }); [5, 7, 8, 9, 10, 12].forEach((n, i) => bell(SCALE[n], 0.1 + i * 0.06, 0.06)); }
    };
    TD.sfx = (name, arg) => {
        if (!TD.state.settings.sound) return;
        try { if (SFX[name]) SFX[name](arg); } catch (e) {}
    };
    TD.unlockAudio = () => { try { ac(); } catch (e) {} };

    /* ---------------- Vibração ---------------- */
    TD.buzz = (kind) => {
        if (!TD.state.settings.haptics) return;
        const H = TD.isNative() ? TD.plugin('Haptics') : null;
        try {
            if (H) {
                if (kind === 'error') H.notification({ type: 'ERROR' }).catch(() => {});
                else if (kind === 'success') H.notification({ type: 'SUCCESS' }).catch(() => {});
                else H.impact({ style: kind === 'heavy' ? 'HEAVY' : kind === 'medium' ? 'MEDIUM' : 'LIGHT' }).catch(() => {});
            } else if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) {
                navigator.vibrate(kind === 'error' ? [25, 40, 25] : kind === 'heavy' ? 35 : 12);
            }
        } catch (e) {}
    };

    /* ---------------- Efeitos visuais (confete, partículas, moedas) ---------------- */
    TD.fx = (function () {
        let cv = null, ctx = null, parts = [], raf = 0, W = 0, H = 0, dpr = 1;
        function ensure() {
            if (cv) return;
            cv = document.createElement('canvas'); cv.id = 'fxCanvas';
            document.body.appendChild(cv);
            ctx = cv.getContext('2d');
            resize();
            window.addEventListener('resize', resize);
        }
        function resize() {
            if (!cv) return;
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = window.innerWidth; H = window.innerHeight;
            cv.width = W * dpr; cv.height = H * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        function loop() {
            ctx.clearRect(0, 0, W, H);
            for (let i = parts.length - 1; i >= 0; i--) {
                const p = parts[i];
                p.life -= 1 / 60;
                if (p.life <= 0 || p.y > H + 40) { parts.splice(i, 1); continue; }
                p.vx *= p.drag; p.vy = p.vy * p.drag + p.g;
                p.x += p.vx; p.y += p.vy; p.rot += p.vr;
                const a = Math.min(1, p.life / 0.5);
                ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
                ctx.fillStyle = p.c;
                if (p.shape === 'rect') { const w = p.s * (0.5 + 0.5 * Math.abs(Math.cos(p.rot * 2))); ctx.fillRect(-w / 2, -p.s * 0.3, w, p.s * 0.6); }
                else if (p.shape === 'star') { drawStar(ctx, 0, 0, p.s, p.s * 0.45); ctx.fill(); }
                else { ctx.beginPath(); ctx.arc(0, 0, p.s / 2, 0, Math.PI * 2); ctx.fill(); }
                ctx.restore();
            }
            if (parts.length) raf = requestAnimationFrame(loop); else { raf = 0; ctx.clearRect(0, 0, W, H); }
        }
        function kick() { if (!raf) raf = requestAnimationFrame(loop); }
        const COLORS = ['#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#a78bfa', '#fb923c', '#f43f5e', '#22d3ee'];
        return {
            confetti(n) {
                ensure();
                const count = n || 140;
                for (let i = 0; i < count; i++) {
                    const fromLeft = i % 2 === 0;
                    parts.push({
                        x: fromLeft ? -10 : W + 10, y: H * (0.35 + Math.random() * 0.3),
                        vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 9), vy: -(9 + Math.random() * 9),
                        g: 0.32, drag: 0.985, s: 7 + Math.random() * 7, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
                        c: COLORS[i % COLORS.length], life: 2.8 + Math.random(), shape: Math.random() < 0.7 ? 'rect' : (Math.random() < 0.5 ? 'star' : 'dot')
                    });
                }
                kick();
            },
            burst(x, y, opts) {
                ensure();
                opts = opts || {};
                const n = opts.n || 22, cols = opts.colors || COLORS;
                for (let i = 0; i < n; i++) {
                    const ang = Math.random() * Math.PI * 2, sp = (opts.speed || 6) * (0.4 + Math.random() * 0.8);
                    parts.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 2, g: 0.18, drag: 0.96, s: (opts.size || 8) * (0.5 + Math.random()), rot: 0, vr: (Math.random() - 0.5) * 0.3, c: cols[i % cols.length], life: 0.9 + Math.random() * 0.5, shape: opts.shape || (i % 3 === 0 ? 'star' : 'dot') });
                }
                kick();
            },
            burstAt(el, opts) {
                if (!el) return;
                const r = el.getBoundingClientRect();
                this.burst(r.left + r.width / 2, r.top + r.height / 2, opts);
            }
        };
    })();
    function drawStar(c, x, y, r, r2) {
        c.beginPath();
        for (let i = 0; i < 10; i++) {
            const rad = i % 2 === 0 ? r : r2, a = -Math.PI / 2 + i * Math.PI / 5;
            c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
        }
        c.closePath();
    }
    TD.drawStar = drawStar;

    /* ---------------- UI: pílulas, toasts, folhas ---------------- */
    TD.ui = {
        updatePills(bump) {
            const c = TD.$('#pillCoins b'), f = TD.$('#pillFire b');
            if (c) { c.textContent = TD.fmt(TD.state.coins); if (bump) { const p = c.parentNode; p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); } }
            if (f) f.textContent = TD.daily.streak();
            const lv = TD.$('#tbLevel'); if (lv) lv.textContent = TD.levelInfo(TD.state.xp).level;
        },
        toast(title, sub, icon) {
            let box = TD.$('#toasts');
            if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
            const t = document.createElement('div');
            t.className = 'toast';
            t.innerHTML = '<div class="ti">' + (icon || '✨') + '</div><div><b>' + TD.esc(title) + '</b>' + (sub ? '<span class="small muted">' + TD.esc(sub) + '</span>' : '') + '</div>';
            box.appendChild(t);
            while (box.children.length > 3) box.removeChild(box.firstChild);
            setTimeout(() => t.remove(), 3000);
        },
        sheets: [],
        sheet(html, opts) {
            opts = opts || {};
            const ov = document.createElement('div');
            ov.className = 'overlay' + (opts.center ? ' center' : '');
            ov.innerHTML = '<div class="sheet" role="dialog">' + html + '</div>';
            document.body.appendChild(ov);
            const api = {
                el: ov.firstChild,
                close: () => {
                    if (api.closed) return;
                    api.closed = true;
                    const i = TD.ui.sheets.indexOf(api); if (i >= 0) TD.ui.sheets.splice(i, 1);
                    ov.classList.add('closing');
                    setTimeout(() => ov.remove(), 200);
                    if (opts.onClose) opts.onClose();
                },
                dismissable: opts.dismissable !== false
            };
            ov.addEventListener('click', (e) => { if (e.target === ov && api.dismissable) api.close(); });
            TD.ui.sheets.push(api);
            if (opts.mount) opts.mount(api.el, api);
            return api;
        },
        closeTop() {
            const top = TD.ui.sheets[TD.ui.sheets.length - 1];
            if (top && top.dismissable) { top.close(); return true; }
            return !!top;
        },
        confirm(title, text, okLabel, danger) {
            return new Promise((resolve) => {
                let answered = false;
                const s = TD.ui.sheet('<h3>' + TD.esc(title) + '</h3><p class="muted">' + TD.esc(text) + '</p><div class="actions">' +
                    '<button class="btn block ' + (danger ? 'red' : 'green') + '" data-ok>' + TD.esc(okLabel || 'Confirmar') + '</button>' +
                    '<button class="btn ghost block" data-no>Cancelar</button></div>', {
                    center: true,
                    onClose: () => { if (!answered) resolve(false); },
                    mount: (el, api) => {
                        el.querySelector('[data-ok]').onclick = () => { answered = true; api.close(); resolve(true); };
                        el.querySelector('[data-no]').onclick = () => { answered = true; api.close(); resolve(false); };
                    }
                });
                return s;
            });
        },
        coinFly(fromEl, n) {
            const target = TD.$('#pillCoins');
            const fr = fromEl && fromEl.getBoundingClientRect ? fromEl.getBoundingClientRect() : null;
            if (!target || !fr || target.offsetParent === null) { TD.ui.updatePills(true); TD.sfx('coin'); return; }
            const tr = target.getBoundingClientRect();
            const count = Math.min(8, Math.max(3, Math.ceil(n / 10)));
            for (let i = 0; i < count; i++) {
                const c = document.createElement('div');
                c.className = 'fly-coin'; c.textContent = '★';
                document.body.appendChild(c);
                const sx = fr.left + fr.width / 2 - 13 + (Math.random() - 0.5) * 40, sy = fr.top + fr.height / 2 - 13 + (Math.random() - 0.5) * 30;
                const ex = tr.left + 6, ey = tr.top + 5;
                const anim = c.animate([
                    { transform: 'translate(' + sx + 'px,' + sy + 'px) scale(.4)', opacity: 0 },
                    { transform: 'translate(' + (sx + (Math.random() - 0.5) * 60) + 'px,' + (sy - 40) + 'px) scale(1.1)', opacity: 1, offset: 0.3 },
                    { transform: 'translate(' + ex + 'px,' + ey + 'px) scale(.8)', opacity: 1 }
                ], { duration: 700 + i * 70, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
                anim.onfinish = () => { c.remove(); if (i === count - 1) { TD.ui.updatePills(true); } TD.sfx('tick'); };
            }
            setTimeout(() => TD.sfx('coin'), 650);
        },
        floatText(x, y, text, color) {
            const el = document.createElement('div');
            el.className = 'float-txt'; el.textContent = text;
            el.style.left = (x - 30) + 'px'; el.style.top = (y - 20) + 'px';
            if (color) el.style.color = color;
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 1000);
        },
        ring(pct, size, stroke, color, track) {
            const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - TD.clamp(pct, 0, 100) / 100);
            return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="transform:rotate(-90deg)">' +
                '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" style="stroke:' + (track || 'var(--ring-track)') + '" stroke-width="' + stroke + '"/>' +
                '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + (color || '#fbbf24') + '" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" style="transition:stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)"/></svg>';
        }
    };

    /* ---------------- Tema ---------------- */
    TD.applyTheme = (id) => {
        const th = TD.THEMES.find((t) => t.id === id) || TD.THEMES[0];
        document.documentElement.setAttribute('data-theme', th.id);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', th.bar);
        if (TD.bg) TD.bg.recolor();
    };

    /* ---------------- Fundo estrelado ---------------- */
    TD.bg = (function () {
        let cv, ctx, stars = [], shoot = null, W = 0, H = 0, dpr = 1, last = 0, paused = false, rgb = '255,255,255', raf = 0;
        function init() {
            cv = document.getElementById('bgCanvas');
            if (!cv) return;
            ctx = cv.getContext('2d');
            resize(); recolor();
            window.addEventListener('resize', resize);
            raf = requestAnimationFrame(loop);
        }
        function resize() {
            dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            W = window.innerWidth; H = window.innerHeight;
            cv.width = W * dpr; cv.height = H * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const n = Math.round(W * H / 6500);
            stars = [];
            for (let i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + 0.3, p: Math.random() * 6.28, s: 0.6 + Math.random() * 1.6, vy: 0.02 + Math.random() * 0.06 });
        }
        function recolor() {
            try { rgb = getComputedStyle(document.documentElement).getPropertyValue('--star-rgb').trim() || '255,255,255'; } catch (e) {}
        }
        function loop(t) {
            raf = requestAnimationFrame(loop);
            if (paused || document.hidden || t - last < 33) return;
            const dt = Math.min(60, t - last); last = t;
            ctx.clearRect(0, 0, W, H);
            for (const s of stars) {
                s.y += s.vy * dt * 0.06; if (s.y > H + 2) { s.y = -2; s.x = Math.random() * W; }
                const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.001 * s.s + s.p));
                ctx.fillStyle = 'rgba(' + rgb + ',' + (a * 0.85).toFixed(2) + ')';
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
            }
            if (!shoot && Math.random() < 0.004) shoot = { x: Math.random() * W * 0.7, y: Math.random() * H * 0.4, vx: 7 + Math.random() * 4, vy: 3 + Math.random() * 2, life: 1 };
            if (shoot) {
                shoot.x += shoot.vx; shoot.y += shoot.vy; shoot.life -= 0.025;
                const g = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * 10, shoot.y - shoot.vy * 10);
                g.addColorStop(0, 'rgba(' + rgb + ',' + shoot.life.toFixed(2) + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
                ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(shoot.x - shoot.vx * 10, shoot.y - shoot.vy * 10); ctx.stroke();
                if (shoot.life <= 0) shoot = null;
            }
        }
        return { init, recolor, pause(v) { paused = !!v; if (paused && ctx) ctx.clearRect(0, 0, W, H); } };
    })();

    /* ---------------- Navegação ---------------- */
    TD.screens = {};
    TD.nav = {
        stack: [],
        current: null,
        go(name, params, opts) {
            opts = opts || {};
            const def = TD.screens[name];
            if (!def) return;
            if (opts.root) this.stack = [];
            if (opts.replace) this.stack.pop();
            this.stack.push({ name: name, params: params || {} });
            this.show(name, params || {}, opts.dir || (opts.root ? 'fade' : 'fwd'));
        },
        back() {
            if (TD.ui.sheets.length) { TD.ui.closeTop(); return true; }
            const cur = this.current;
            if (cur && cur.def.onBack) { const r = cur.def.onBack(cur.el); if (r === false) return true; }
            if (this.stack.length > 1) {
                this.stack.pop();
                const prev = this.stack[this.stack.length - 1];
                this.show(prev.name, prev.params, 'back');
                return true;
            }
            if (cur && cur.name !== 'home' && TD.state.onboarded) { this.go('home', {}, { root: true, dir: 'back' }); return true; }
            return false;
        },
        show(name, params, dir) {
            const def = TD.screens[name];
            const host = TD.$('#screens');
            if (this.current && this.current.def.unmount) { try { this.current.def.unmount(this.current.el); } catch (e) { console.error(e); } }
            const el = document.createElement('section');
            el.className = 'screen' + (def.full ? ' full' : '') + (def.tabbar === false && !def.full ? ' no-tab' : '');
            let html = '';
            try { html = def.render(params || {}); } catch (e) { console.error(e); html = '<p class="muted">Ops! Algo deu errado.</p>'; }
            el.innerHTML = def.full ? html : '<div class="wrap">' + html + '</div>';
            host.replaceChildren(el);
            el.classList.add('enter-' + (dir || 'fwd'));
            this.current = { name: name, params: params || {}, def: def, el: el };
            this.chrome(def, params || {});
            if (def.mount) { try { def.mount(el, params || {}); } catch (e) { console.error(e); } }
            TD.bg.pause(!!def.game);
            if (TD.ads) TD.ads.onScreen(name, def);
        },
        refresh() {
            const c = this.current; if (!c) return;
            const st = c.el.scrollTop;
            if (c.def.unmount) { try { c.def.unmount(c.el); } catch (e) {} }
            const html = c.def.render(c.params);
            c.el.innerHTML = c.def.full ? html : '<div class="wrap">' + html + '</div>';
            if (c.def.mount) c.def.mount(c.el, c.params);
            c.el.scrollTop = st;
            this.chrome(c.def, c.params);
        },
        chrome(def, params) {
            const top = TD.$('#topbar'), tabs = TD.$('#tabbar');
            const mode = def.topbar || 'back';
            top.classList.toggle('hidden', mode === 'none');
            const lvl = TD.levelInfo(TD.state.xp).level;
            const pills = '<div class="tb-pills">' +
                '<button class="pill fire" id="pillFire" data-act="go" data-arg="profile" aria-label="Sequência"><span class="ic">' + TD.icon('flame', 16) + '</span><b>' + TD.daily.streak() + '</b></button>' +
                '<button class="pill coins" id="pillCoins" data-act="go" data-arg="shop" aria-label="Moedas"><span class="ic" style="color:#92400e">' + TD.icon('star', 15) + '</span><b>' + TD.fmt(TD.state.coins) + '</b></button></div>';
            if (mode === 'profile') {
                const p = TD.state.profile;
                top.innerHTML = '<button class="tb-profile" data-act="tab" data-arg="profile">' +
                    '<div class="avatar" style="--size:46px;--av-bg:' + TD.avatarById(p.avatar).bg + '">' + TD.avatarById(p.avatar).e + '<span class="lvl" id="tbLevel">' + lvl + '</span></div>' +
                    '<div class="who"><b>' + TD.esc(p.name || 'Jogador') + '</b><small>' + TD.esc(def.greet ? def.greet() : (typeof def.title === 'function' ? def.title(params) : def.title || '')) + '</small></div></button>' + pills;
            } else if (mode === 'back') {
                const title = typeof def.title === 'function' ? def.title(params) : (def.title || '');
                const sub = typeof def.sub === 'function' ? def.sub(params) : (def.sub || '');
                top.innerHTML = '<button class="tb-back" data-act="back" aria-label="Voltar">' + TD.icon('back', 22) + '</button>' +
                    '<div class="tb-title"><h1>' + TD.esc(title) + '</h1>' + (sub ? '<p>' + TD.esc(sub) + '</p>' : '') + '</div>' + pills;
            } else top.innerHTML = '';
            const showTabs = def.tabbar !== false && !def.full;
            tabs.classList.toggle('hidden', !showTabs);
            TD.$$('.tab', tabs).forEach((t) => t.classList.toggle('active', t.dataset.arg === def.tab));
            const dot = TD.$('#tabDotHome');
            if (dot) { TD.daily.ensure(); dot.classList.toggle('hidden', !!TD.state.daily.chest); }
        }
    };

    /* ---------------- Ações (delegação de cliques) ---------------- */
    TD.act = {
        go: (arg) => TD.nav.go(arg),
        tab: (arg) => { if (TD.nav.current && TD.nav.current.name === arg && TD.nav.stack.length === 1) { TD.nav.current.el.scrollTo({ top: 0, behavior: 'smooth' }); return; } TD.nav.go(arg, {}, { root: true }); },
        back: () => TD.nav.back()
    };
    document.addEventListener('click', (e) => {
        const t = e.target.closest('[data-act]');
        if (!t || t.disabled) return;
        const fn = TD.act[t.dataset.act];
        if (!fn) return;
        TD.unlockAudio();
        TD.sfx('tap');
        TD.buzz('light');
        try { fn(t.dataset.arg, t, e); } catch (err) { console.error(err); }
    });

    /* ---------------- Integração nativa ---------------- */
    TD.native = {
        init() {
            const App = TD.isNative() ? TD.plugin('App') : null;
            if (App && App.addListener) {
                App.addListener('backButton', () => {
                    if (!TD.nav.back()) { if (App.exitApp) App.exitApp(); }
                });
                App.addListener('appStateChange', (st) => {
                    if (!st || st.isActive) { if (TD.ads) TD.ads.onResume(); return; }
                    TD.save(true);
                    if (TD.games && TD.games.autoPause) TD.games.autoPause();
                });
            }
            document.addEventListener('keydown', (e) => {
                if (e.key !== 'Escape') return;
                TD.nav.back();
            });
            document.addEventListener('visibilitychange', () => {
                if (document.hidden && TD.games && TD.games.autoPause) TD.games.autoPause();
            });
        }
    };
})();
