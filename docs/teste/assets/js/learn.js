/* ==========================================================================
   Tabuada Divertida 3.0 — Aprendizado (motor de perguntas, domínio, quiz, trilhas)
   ========================================================================== */
'use strict';
(function () {
    const TD = window.TD;
    const L = TD.learn = {};
    const R = TD.rand;

    /* ---------------- Geração de perguntas ---------------- */
    function mk(a, b, op) {
        const ans = op === 'mul' ? a * b : op === 'add' ? a + b : op === 'sub' ? a - b : a / b;
        const key = op === 'mul' && a >= 1 && a <= 10 && b >= 1 && b <= 10 ? a + 'x' + b : null;
        return { a: a, b: b, op: op, ans: ans, text: a + ' ' + TD.opSym[op] + ' ' + b, key: key };
    }
    L.mk = mk;
    L.make = function (op, level) {
        const lv = TD.clamp(level || 1, 1, 5);
        if (op === 'mix') op = TD.pick(['add', 'sub', 'mul', 'div']);
        if (op === 'add') {
            const r = [[1, 5, 1, 5], [1, 10, 1, 10], [10, 50, 1, 20], [10, 99, 10, 99], [100, 999, 10, 999]][lv - 1];
            return mk(R(r[0], r[1]), R(r[2], r[3]), 'add');
        }
        if (op === 'sub') {
            const r = [[2, 10], [5, 20], [20, 60], [30, 99], [100, 999]][lv - 1];
            const a = R(r[0], r[1]);
            const b = lv <= 2 ? R(1, a) : lv === 3 ? R(1, 20) : R(10, a - 1);
            return mk(a, b, 'sub');
        }
        if (op === 'div') {
            const d = lv === 1 ? TD.pick([2, 5, 10]) : lv === 2 ? R(2, 5) : lv === 3 ? R(2, 10) : lv === 4 ? R(2, 12) : R(3, 15);
            const q = lv <= 3 ? R(1, 10) : lv === 4 ? R(2, 20) : R(10, 30);
            return mk(d * q, d, 'div');
        }
        // mul
        let a, b;
        if (lv === 1) { a = TD.pick([2, 5, 10]); b = R(2, 10); }
        else if (lv === 2) { a = R(2, 5); b = R(2, 10); }
        else if (lv === 3) { a = R(2, 10); b = R(1, 10); }
        else if (lv === 4) { a = R(11, 20); b = R(2, 9); }
        else { a = R(12, 25); b = R(3, 12); }
        return mk(a, b, 'mul');
    };
    L.fromTables = (tables) => mk(TD.pick(tables), R(1, 10), 'mul');
    L.baseLevel = function () {
        const age = TD.state.profile.age;
        return age === 'kid' ? 1 : age === 'teen' ? 2 : 3;
    };
    function swapDigits(n) {
        const s = String(n);
        if (s.length !== 2 || s[0] === s[1] || s[1] === '0') return null;
        return Number(s[1] + s[0]);
    }
    L.options = function (q, n) {
        n = n || 4;
        const set = new Set([q.ans]);
        const a = q.a, b = q.b, ans = q.ans;
        let c = [];
        if (q.op === 'mul') c = [(a + 1) * b, (a - 1) * b, a * (b + 1), a * (b - 1), a + b, ans + 10, ans - 10, ans + 1, ans - 1, swapDigits(ans)];
        else if (q.op === 'div') c = [ans + 1, ans - 1, ans + 2, ans - 2, b, ans * 2, Math.round(ans / 2), ans + 10];
        else if (q.op === 'add') c = [ans + 1, ans - 1, ans + 10, ans - 10, ans + 2, ans - 2, Math.abs(a - b), swapDigits(ans)];
        else c = [ans + 1, ans - 1, ans + 10, ans - 10, a + b, ans + 2, swapDigits(ans)];
        TD.shuffle(c);
        for (const v of c) { if (set.size >= n) break; if (v != null && Number.isInteger(v) && v >= 0 && v !== ans) set.add(v); }
        let spread = Math.max(3, Math.round(ans * 0.25));
        let guard = 0;
        while (set.size < n && guard++ < 200) { const v = ans + R(-spread, spread); if (v >= 0 && v !== ans) set.add(v); spread++; }
        return TD.shuffle(Array.from(set));
    };

    /* ---------------- Dicas e truques ---------------- */
    const TABLE_TIPS = {
        1: 'Qualquer número vezes 1 é ele mesmo.',
        2: 'Vezes 2 é o dobro: some o número com ele mesmo.',
        3: 'Vezes 3: faça o dobro e some mais uma vez o número.',
        4: 'Vezes 4 é o dobro do dobro.',
        5: 'Vezes 5 é a metade de vezes 10. Termina sempre em 0 ou 5!',
        6: 'Vezes 6: faça vezes 5 e some mais um grupo.',
        7: 'Vezes 7: faça vezes 5 e some vezes 2.',
        8: 'Vezes 8 é dobrar três vezes seguidas.',
        9: 'Vezes 9: faça vezes 10 e tire o número uma vez. Os algarismos sempre somam 9!',
        10: 'Vezes 10: é só colocar um zero no final.'
    };
    L.TABLE_TIPS = TABLE_TIPS;
    L.TRICKS = [
        { e: '🖐️', t: 'Tabuada do 9 nos dedos', d: 'Abra as duas mãos. Para 9 × 4, abaixe o 4º dedo. Os dedos à esquerda são as dezenas (3) e os da direita são as unidades (6): 36!', ex: '9 × 7 → abaixe o 7º dedo → 6 e 3 → 63' },
        { e: '🔁', t: 'A ordem não importa', d: '3 × 8 é igual a 8 × 3. Isso quer dizer que você só precisa decorar metade da tabuada!', ex: '6 × 9 = 9 × 6 = 54' },
        { e: '✋', t: 'Vezes 5 é metade de vezes 10', d: 'Multiplique por 10 (coloque um zero) e divida por 2.', ex: '8 × 5 → 80 ÷ 2 = 40' },
        { e: '✌️', t: 'Vezes 4 é o dobro do dobro', d: 'Dobre o número e depois dobre de novo.', ex: '7 × 4 → 14 → 28' },
        { e: '🎯', t: 'Vezes 11 com dois dígitos', d: 'Some os dois dígitos e coloque o resultado no meio.', ex: '23 × 11 → 2 (2+3) 3 = 253' },
        { e: '🧩', t: 'Quebre a conta difícil', d: 'Divida em partes fáceis e some no final.', ex: '7 × 8 = 7 × 5 + 7 × 3 = 35 + 21 = 56' },
        { e: '🔟', t: 'Faça 10 para somar', d: 'Complete a dezena primeiro e some o que sobrou.', ex: '8 + 7 = 8 + 2 + 5 = 15' },
        { e: '🪄', t: 'Arredonde para subtrair', d: 'Arredonde o número que sai e depois corrija.', ex: '52 − 19 = 52 − 20 + 1 = 33' },
        { e: '↩️', t: 'Dividir é multiplicar ao contrário', d: 'Pergunte: qual número vezes o divisor dá o total?', ex: '56 ÷ 8 → 8 × ? = 56 → 7' },
        { e: '🟦', t: 'Quadrado terminado em 5', d: 'Multiplique o primeiro dígito pelo seguinte e coloque 25 no final.', ex: '35 × 35 → 3 × 4 = 12 → 1225' },
        { e: '💯', t: 'Porcentagem de cabeça', d: '10% é dividir por 10. 5% é metade de 10%. 25% é dividir por 4.', ex: '15% de 80 → 8 + 4 = 12' }
    ];
    function dotGrid(rows, cols, size) {
        const d = size || (rows * cols > 60 ? 10 : rows * cols > 30 ? 13 : 17);
        let html = '<div class="dot-grid" style="grid-template-columns:repeat(' + cols + ',var(--d));--d:' + d + 'px">';
        for (let i = 0; i < rows * cols; i++) html += '<i style="animation-delay:' + Math.min(i * 18, 1400) + 'ms"></i>';
        return html + '</div>';
    }
    L.dotGrid = dotGrid;
    L.hintHtml = function (q) {
        const a = q.a, b = q.b;
        if (q.op === 'mul') {
            let html = '';
            if (a <= 10 && b <= 10) html += '<p class="center muted small">' + a + ' fileiras com ' + b + ' bolinhas cada</p>' + dotGrid(a, b);
            if (TABLE_TIPS[a]) html += '<div class="step"><span class="n">💡</span><div>' + TABLE_TIPS[a] + '</div></div>';
            if (a > 5 && a <= 10 && b > 1) html += '<div class="step mt8"><span class="n">🧩</span><div>' + a + ' × ' + b + ' = (5 × ' + b + ') + (' + (a - 5) + ' × ' + b + ') = ' + (5 * b) + ' + ' + ((a - 5) * b) + ' = ?</div></div>';
            if (a > 10) { const t = Math.floor(a / 10) * 10, u = a - t; html += '<div class="step"><span class="n">🧩</span><div>' + a + ' × ' + b + ' = (' + t + ' × ' + b + ') + (' + u + ' × ' + b + ') = ' + (t * b) + ' + ' + (u * b) + ' = ?</div></div>'; }
            return html;
        }
        if (q.op === 'div') {
            const list = [];
            for (let i = 1; i <= Math.min(q.ans + 2, 12); i++) list.push(b * i);
            return '<p class="center muted">Pergunte: <b>' + b + ' × ? = ' + a + '</b></p><div class="step"><span class="n">' + b + '</span><div>Contando de ' + b + ' em ' + b + ': ' + list.join(', ') + '…</div></div>';
        }
        if (q.op === 'add') {
            if (a < 10 && b < 10 && a + b > 10) { const f = 10 - a; return '<div class="step"><span class="n">🔟</span><div>Complete o 10: ' + a + ' + ' + f + ' = 10. Sobram ' + (b - f) + '. Então 10 + ' + (b - f) + ' = ?</div></div>'; }
            if (a <= 10 && b <= 10) return '<p class="center muted small">' + a + ' bolinhas + ' + b + ' bolinhas</p>' + dotGrid(1, a, 16) + dotGrid(1, b, 16);
            const ta = Math.floor(a / 10) * 10, tb = Math.floor(b / 10) * 10;
            return '<div class="step"><span class="n">🧩</span><div>Dezenas: ' + ta + ' + ' + tb + ' = ' + (ta + tb) + '. Unidades: ' + (a - ta) + ' + ' + (b - tb) + ' = ' + (a - ta + b - tb) + '. Agora some tudo!</div></div>';
        }
        if (b <= 20) return '<div class="step"><span class="n">↩️</span><div>Pense ao contrário: ' + b + ' + ? = ' + a + '. Quanto falta para chegar em ' + a + '?</div></div>';
        const rb = Math.ceil(b / 10) * 10;
        return '<div class="step"><span class="n">🪄</span><div>Arredonde: ' + a + ' − ' + rb + ' = ' + (a - rb) + '. Depois some ' + (rb - b) + ' de volta.</div></div>';
    };
    L.explain = function (q) {
        if (q.op === 'mul' && TABLE_TIPS[q.a]) return TABLE_TIPS[q.a];
        if (q.op === 'mul' && TABLE_TIPS[q.b]) return 'Lembre: ' + q.a + ' × ' + q.b + ' = ' + q.b + ' × ' + q.a + '. ' + TABLE_TIPS[q.b];
        if (q.op === 'div') return 'Confira multiplicando: ' + q.ans + ' × ' + q.b + ' = ' + q.a + '.';
        if (q.op === 'sub') return 'Confira somando: ' + q.ans + ' + ' + q.b + ' = ' + q.a + '.';
        return 'Confira: ' + q.ans + ' − ' + q.b + ' = ' + q.a + '.';
    };

    /* ---------------- Domínio das contas (repetição espaçada) ---------------- */
    L.record = function (q, correct, ms) {
        if (!q.key) return;
        const f = TD.state.facts[q.key] || (TD.state.facts[q.key] = { b: 0, c: 0, w: 0, t: 0, ms: 0 });
        const fastLimit = TD.state.profile.age === 'kid' ? 7000 : 4500;
        if (correct) { f.c++; f.b = Math.min(5, f.b + (ms < fastLimit ? 1 : 0.5)); }
        else { f.w++; f.b = Math.max(0, f.b - 2); }
        f.ms = f.ms ? Math.round(f.ms * 0.7 + ms * 0.3) : Math.round(ms);
        f.t = Date.now();
    };
    L.box = (key) => { const f = TD.state.facts[key]; return f ? f.b : -1; };
    L.tableMastery = function (n) {
        let sum = 0;
        for (let b = 1; b <= 10; b++) { const f = TD.state.facts[n + 'x' + b]; sum += f ? f.b / 5 : 0; }
        return sum / 10;
    };
    L.masteredCount = function () {
        let n = 0;
        Object.keys(TD.state.facts).forEach((k) => { if (TD.state.facts[k].b >= 4) n++; });
        return Math.min(100, n);
    };
    L.unlockedTables = function () {
        const p = TD.state.path.mul;
        let max = 3;
        const map = { m1: 1, m2: 2, m3: 3, m4: 4, m5: 5, m7: 6, m8: 7, m9: 8, m10: 9, m11: 10 };
        Object.keys(map).forEach((k) => { if (p[k]) max = Math.max(max, map[k] + 1); });
        return Math.min(10, max);
    };
    L.smartSet = function (count) {
        count = count || 10;
        const s = TD.state, age = s.profile.age, now = Date.now();
        const maxT = age === 'kid' ? L.unlockedTables() : 10;
        const cands = [];
        for (let a = 1; a <= maxT; a++) {
            for (let b = 1; b <= 10; b++) {
                const f = s.facts[a + 'x' + b];
                const box = f ? f.b : 0;
                const days = f ? (now - f.t) / 86400000 : 2;
                let pri = (5 - box) * 2 + Math.min(days, 7) + (f && f.w > f.c ? 3 : 0) + Math.random() * 2.5;
                if (a === 1 || b === 1 || a === 10 || b === 10) pri -= 2.5;
                cands.push({ a: a, b: b, pri: pri });
            }
        }
        cands.sort((x, y) => y.pri - x.pri);
        const nMul = Math.round(count * 0.7);
        const qs = cands.slice(0, nMul).map((c) => mk(c.a, c.b, 'mul'));
        const extraOps = age === 'kid' ? [['add', 2], ['sub', 1], ['add', 1]] : age === 'teen' ? [['div', 3], ['add', 3], ['sub', 3]] : [['div', 3], ['mul', 4], ['sub', 4], ['add', 4]];
        while (qs.length < count) { const e = TD.pick(extraOps); qs.push(L.make(e[0], e[1])); }
        return TD.shuffle(qs);
    };

    /* ---------------- Mundos da trilha ---------------- */
    const T15 = [1, 2, 3, 4, 5], T610 = [6, 7, 8, 9, 10], TALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    L.WORLDS = {
        mul: {
            name: 'Multiplicação', sym: '×', colors: ['#c4b5fd', '#7c3aed', '#4c1d95'],
            sections: { 0: 'Tabuadas do 1 ao 5', 6: 'Tabuadas do 6 ao 10', 12: 'Grande final' },
            nodes: [
                { id: 'm1', t: 'Tabuada do 1', d: 'Comece pelo mais fácil!', tables: [1] },
                { id: 'm2', t: 'Tabuada do 2', d: 'Dobrando os números', tables: [2] },
                { id: 'm3', t: 'Tabuada do 3', d: 'Três vezes mais!', tables: [3] },
                { id: 'm4', t: 'Tabuada do 4', d: 'O dobro do dobro', tables: [4] },
                { id: 'm5', t: 'Tabuada do 5', d: 'De cinco em cinco', tables: [5] },
                { id: 'm6', t: 'Revisão 1 a 5', d: 'Mistura das tabuadas 1 a 5', tables: T15, boss: true },
                { id: 'm7', t: 'Tabuada do 6', d: 'Ficando sério!', tables: [6] },
                { id: 'm8', t: 'Tabuada do 7', d: 'O número da sorte', tables: [7] },
                { id: 'm9', t: 'Tabuada do 8', d: 'Dobra, dobra, dobra', tables: [8] },
                { id: 'm10', t: 'Tabuada do 9', d: 'O truque dos dedos', tables: [9] },
                { id: 'm11', t: 'Tabuada do 10', d: 'É só pôr um zero', tables: [10] },
                { id: 'm12', t: 'Revisão 6 a 10', d: 'Mistura das tabuadas 6 a 10', tables: T610, boss: true },
                { id: 'm13', t: 'Desafio Mestre', d: 'Todas as tabuadas misturadas!', tables: TALL, boss: true, crown: true }
            ]
        },
        add: {
            name: 'Adição', sym: '+', colors: ['#6ee7b7', '#059669', '#065f46'],
            sections: { 0: 'Fácil', 5: 'Médio', 10: 'Difícil' },
            nodes: [
                { id: 'add_e1', t: 'Primeiros passos', d: 'Parcelas de 1 a 5', maxA: 5, maxB: 5 },
                { id: 'add_e2', t: 'Somando até 20', d: 'Parcelas de 1 a 10', maxA: 10, maxB: 10 },
                { id: 'add_e3', t: 'Dezenas fáceis', d: 'Somas com dezenas', maxA: 30, maxB: 10 },
                { id: 'add_e4', t: 'Mistura simples', d: 'Variedade de 1 a 15', maxA: 15, maxB: 15 },
                { id: 'add_e5', t: 'Campeão fácil!', d: 'Desafio final do nível', maxA: 20, maxB: 20, boss: true },
                { id: 'add_m1', t: 'Dois dígitos', d: 'Somas de 10 a 50', maxA: 50, maxB: 50, minA: 10 },
                { id: 'add_m2', t: 'Chegando a 100', d: 'Resultados até 100+', maxA: 60, maxB: 60, minA: 20 },
                { id: 'add_m3', t: 'Somas maiores', d: 'Somas variadas', maxA: 80, maxB: 80, minA: 30 },
                { id: 'add_m4', t: 'Grandes somas', d: 'Até 180 de resultado', maxA: 90, maxB: 90, minA: 10 },
                { id: 'add_m5', t: 'Mestre médio!', d: 'Desafio final do nível', maxA: 99, maxB: 99, minA: 10, boss: true },
                { id: 'add_h1', t: 'Centenas', d: 'Números de 100 a 300', maxA: 300, maxB: 300, minA: 100 },
                { id: 'add_h2', t: 'Grandes somas', d: 'Até 1000', maxA: 500, maxB: 500, minA: 200 },
                { id: 'add_h3', t: 'Mestre da Adição!', d: 'Desafio máximo', maxA: 999, maxB: 999, minA: 100, boss: true, crown: true }
            ]
        },
        sub: {
            name: 'Subtração', sym: '−', colors: ['#fdba74', '#ea580c', '#9a3412'],
            sections: { 0: 'Fácil', 5: 'Médio', 10: 'Difícil' },
            nodes: [
                { id: 'sub_e1', t: 'Primeiras subtrações', d: 'Números de 1 a 10', maxA: 10, maxB: 5 },
                { id: 'sub_e2', t: 'Até 20', d: 'Resultados positivos', maxA: 20, maxB: 10 },
                { id: 'sub_e3', t: 'Dezenas menos unidades', d: '30 − x, 20 − x…', maxA: 30, maxB: 9 },
                { id: 'sub_e4', t: 'Mistura simples', d: 'Variedade até 30', maxA: 30, maxB: 15 },
                { id: 'sub_e5', t: 'Campeão fácil!', d: 'Desafio final do nível', maxA: 40, maxB: 20, boss: true },
                { id: 'sub_m1', t: 'Dois dígitos', d: 'De 20 a 100', maxA: 100, maxB: 50, minA: 20 },
                { id: 'sub_m2', t: 'Com empréstimo', d: 'Mais desafiador', maxA: 100, maxB: 99, minA: 30 },
                { id: 'sub_m3', t: 'Variedade média', d: 'Resultados até 100', maxA: 150, maxB: 80, minA: 50 },
                { id: 'sub_m4', t: 'Grandes subtrações', d: 'Até 200', maxA: 200, maxB: 150, minA: 50 },
                { id: 'sub_m5', t: 'Mestre médio!', d: 'Desafio final do nível', maxA: 200, maxB: 180, minA: 50, boss: true },
                { id: 'sub_h1', t: 'Centenas', d: '100 a 500', maxA: 500, maxB: 400, minA: 100 },
                { id: 'sub_h2', t: 'Até mil', d: 'Grandes números', maxA: 1000, maxB: 900, minA: 200 },
                { id: 'sub_h3', t: 'Mestre da Subtração!', d: 'Desafio máximo', maxA: 999, maxB: 990, minA: 100, boss: true, crown: true }
            ]
        },
        div: {
            name: 'Divisão', sym: '÷', colors: ['#93c5fd', '#4f46e5', '#312e81'],
            sections: { 0: 'Fácil', 5: 'Médio', 10: 'Difícil' },
            nodes: [
                { id: 'div_e1', t: 'Dividindo por 2', d: 'Só divisões por 2', divisors: [2], maxResult: 10 },
                { id: 'div_e2', t: 'Dividindo por 5', d: 'Só divisões por 5', divisors: [5], maxResult: 10 },
                { id: 'div_e3', t: 'Dividindo por 10', d: 'Só divisões por 10', divisors: [10], maxResult: 10 },
                { id: 'div_e4', t: '2, 5 e 10', d: 'Mistura dos três', divisors: [2, 5, 10], maxResult: 10 },
                { id: 'div_e5', t: 'Campeão fácil!', d: 'Desafio final do nível', divisors: [2, 5, 10], maxResult: 15, boss: true },
                { id: 'div_m1', t: 'Por 3 e 4', d: 'Novos divisores', divisors: [3, 4], maxResult: 12 },
                { id: 'div_m2', t: 'Por 6 e 7', d: 'Mais desafiador', divisors: [6, 7], maxResult: 12 },
                { id: 'div_m3', t: 'Tabuada inversa 1–5', d: 'Divisores de 2 a 5', divisors: [2, 3, 4, 5], maxResult: 12 },
                { id: 'div_m4', t: 'Tabuada inversa 6–9', d: 'Divisores de 6 a 9', divisors: [6, 7, 8, 9], maxResult: 12 },
                { id: 'div_m5', t: 'Mestre médio!', d: 'Todos os divisores 2–9', divisors: [2, 3, 4, 5, 6, 7, 8, 9], maxResult: 12, boss: true },
                { id: 'div_h1', t: 'Divisões grandes', d: 'Resultados até 15', divisors: [2, 3, 4, 5, 6, 7, 8, 9, 10], maxResult: 15 },
                { id: 'div_h2', t: 'Divisores maiores', d: 'Divisores até 12', divisors: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], maxResult: 15 },
                { id: 'div_h3', t: 'Mestre da Divisão!', d: 'Desafio máximo', divisors: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], maxResult: 20, boss: true, crown: true }
            ]
        }
    };
    L.nodeQuestion = function (world, node) {
        if (world === 'mul') return L.fromTables(node.tables);
        if (world === 'add') return mk(R(node.minA || 1, node.maxA), R(1, node.maxB), 'add');
        if (world === 'sub') { const a = R(Math.max(node.minA || 2, 2), node.maxA); return mk(a, R(1, Math.max(1, Math.min(a - 1, node.maxB))), 'sub'); }
        const d = TD.pick(node.divisors), r = R(1, node.maxResult);
        return mk(d * r, d, 'div');
    };
    L.worldProgress = function (w) {
        const p = TD.state.path[w] || {};
        const total = L.WORLDS[w].nodes.length;
        const done = L.WORLDS[w].nodes.filter((n) => p[n.id] >= 1).length;
        return { done: done, total: total, pct: Math.round(done / total * 100) };
    };
    L.currentNode = function (w) {
        const p = TD.state.path[w] || {};
        const nodes = L.WORLDS[w].nodes;
        for (let i = 0; i < nodes.length; i++) if (!(p[nodes[i].id] >= 1)) return i;
        return nodes.length - 1;
    };
    L.nextPathSuggestion = function () {
        const order = TD.state.profile.age === 'kid' ? ['mul', 'add', 'sub', 'div'] : ['mul', 'div', 'add', 'sub'];
        for (const w of order) { const pr = L.worldProgress(w); if (pr.done < pr.total) return { world: w, idx: L.currentNode(w) }; }
        return { world: 'mul', idx: 12 };
    };

    /* ---------------- Montagem de sessões ---------------- */
    function buildQuestions(cfg) {
        if (cfg.kind === 'smart') return L.smartSet(10);
        if (cfg.kind === 'table') { const qs = []; for (let b = 1; b <= 10; b++) qs.push(mk(cfg.n, b, 'mul')); return TD.shuffle(qs); }
        if (cfg.kind === 'fact') { const p = cfg.key.split('x').map(Number); const qs = [mk(p[0], p[1], 'mul'), mk(p[1], p[0], 'mul')]; while (qs.length < 6) qs.push(mk(p[0], R(1, 10), 'mul')); return TD.shuffle(qs); }
        if (cfg.kind === 'path') {
            const node = L.WORLDS[cfg.world].nodes.find((n) => n.id === cfg.node);
            const qs = [], seen = new Set();
            let guard = 0;
            while (qs.length < 10 && guard++ < 200) {
                const q = L.nodeQuestion(cfg.world, node);
                if (seen.has(q.text) && guard < 150) continue;
                seen.add(q.text); qs.push(q);
            }
            return qs;
        }
        const qs = []; for (let i = 0; i < 10; i++) qs.push(L.make(cfg.op || 'mul', cfg.level || L.baseLevel()));
        return qs;
    }
    function useOptions(q) {
        const m = TD.state.settings.answerMode;
        if (m === 'options') return true;
        if (m === 'type') return false;
        return TD.state.profile.age !== 'adult';
    }
    L.start = function (cfg) {
        TD.nav.go('quiz', cfg);
    };

    /* ---------------- Tela: Quiz ---------------- */
    let S = null;
    TD.screens.quiz = {
        topbar: 'none', tabbar: false,
        render(p) {
            return '<div class="quiz">' +
                '<div class="quiz-top"><button class="icon-btn" data-act="quizExit" aria-label="Sair">' + TD.icon('close', 22) + '</button>' +
                '<div class="qprog"><i id="qBar" style="width:0%"></i></div>' +
                '<div class="streak-badge" id="qStreak">' + TD.icon('flame', 20) + '<span>0</span></div></div>' +
                '<div class="q-stage">' +
                '<div class="q-card" id="qCard">' +
                '<button class="icon-btn hint-btn" data-act="quizHint" aria-label="Dica">' + TD.icon('bulb', 20) + '</button>' +
                '<div class="q-label" id="qLabel"></div><div class="q-expr" id="qExpr"></div><div class="small muted" id="qTitle">' + TD.esc(p.title || '') + '</div></div>' +
                '<div id="qAns"></div></div></div>' +
                '<div class="q-feedback" id="qFb"></div>';
        },
        mount(el, p) {
            S = { cfg: p, qs: buildQuestions(p), i: 0, correct: 0, streak: 0, best: 0, errors: [], t0: 0, totalMs: 0, locked: false, typed: '', el: el, hints: 0 };
            showQ();
        },
        unmount() { S = null; },
        onBack() { askExit(); return false; }
    };
    function askExit() {
        if (!S) return;
        TD.ui.confirm('Sair da atividade?', 'Seu progresso nesta rodada será perdido.', 'Sair', true).then((ok) => { if (ok) { S = null; TD.nav.back.call(TD.nav, true); } });
    }
    function showQ() {
        if (!S) return;
        const q = S.qs[S.i];
        S.locked = false; S.typed = ''; S.t0 = performance.now();
        TD.$('#qBar', S.el).style.width = (S.i / S.qs.length * 100) + '%';
        TD.$('#qLabel', S.el).textContent = 'Pergunta ' + (S.i + 1) + ' de ' + S.qs.length;
        renderExpr(q);
        const card = TD.$('#qCard', S.el);
        card.classList.remove('pop', 'shake'); void card.offsetWidth; card.classList.add('pop');
        const box = TD.$('#qAns', S.el);
        if (useOptions(q)) {
            const opts = L.options(q, 4);
            box.innerHTML = '<div class="q-options">' + opts.map((v) => '<button class="q-opt" data-v="' + v + '">' + v + '</button>').join('') + '</div>';
            TD.$$('.q-opt', box).forEach((b) => b.addEventListener('click', () => answer(Number(b.dataset.v), b)));
        } else {
            box.innerHTML = '<div class="numpad">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => '<button data-k="' + n + '">' + n + '</button>').join('') +
                '<button class="np-del" data-k="del">⌫</button><button data-k="0">0</button><button class="np-ok" data-k="ok">✓</button></div>';
            TD.$$('.numpad button', box).forEach((b) => b.addEventListener('click', () => key(b.dataset.k)));
        }
    }
    function renderExpr(q) {
        const ans = S.typed ? '<span class="qm typed">' + S.typed + '</span>' : '<span class="qm">?</span>';
        TD.$('#qExpr', S.el).innerHTML = q.a + '<span class="op"> ' + TD.opSym[q.op] + ' </span>' + q.b + ' <span class="op">=</span> ' + ans;
    }
    function key(k) {
        if (!S || S.locked) return;
        TD.sfx('tap'); TD.buzz('light');
        const q = S.qs[S.i];
        if (k === 'del') S.typed = S.typed.slice(0, -1);
        else if (k === 'ok') { if (S.typed) answer(Number(S.typed), null); return; }
        else if (S.typed.length < String(q.ans).length + 2) S.typed += k;
        renderExpr(q);
    }
    function answer(v, btn) {
        if (!S || S.locked) return;
        S.locked = true;
        const q = S.qs[S.i];
        const ms = performance.now() - S.t0;
        const ok = v === q.ans;
        L.record(q, ok, ms);
        S.totalMs += ms;
        const box = TD.$('#qAns', S.el);
        if (ok) {
            S.correct++; S.streak++; S.best = Math.max(S.best, S.streak);
            if (btn) { btn.classList.add('right'); TD.$$('.q-opt', box).forEach((b) => { if (b !== btn) b.classList.add('dim'); }); }
            TD.fx.burstAt(btn || TD.$('#qExpr', S.el), { n: 18, speed: 7 });
            TD.sfx('correct'); TD.buzz('success');
            const sb = TD.$('#qStreak', S.el);
            sb.querySelector('span').textContent = S.streak;
            sb.classList.remove('hot'); void sb.offsetWidth; sb.classList.add('hot');
            if (S.streak >= 3) TD.sfx('combo', S.streak);
            TD.$('#qCard', S.el).classList.add('pop');
            TD.track('answer', { correct: true, op: q.op, ms: ms, streak: S.streak });
            setTimeout(next, 720);
        } else {
            S.streak = 0;
            S.errors.push({ q: q, you: v });
            TD.$('#qStreak span', S.el).textContent = '0';
            if (btn) { btn.classList.add('wrong'); TD.$$('.q-opt', box).forEach((b) => { if (Number(b.dataset.v) === q.ans) b.classList.add('right'); else if (b !== btn) b.classList.add('dim'); }); }
            const card = TD.$('#qCard', S.el); card.classList.remove('pop'); void card.offsetWidth; card.classList.add('shake');
            TD.sfx('wrong'); TD.buzz('error');
            TD.track('answer', { correct: false, op: q.op, ms: ms, streak: 0 });
            const fb = TD.$('#qFb', S.el);
            fb.className = 'q-feedback bad';
            fb.innerHTML = '<div class="fb-title">' + TD.mascot('think', 40) + ' Quase!</div>' +
                '<div class="fb-body">Resposta certa: <b>' + q.text + ' = ' + q.ans + '</b><br><span class="small">' + TD.esc(L.explain(q)) + '</span></div>' +
                '<button class="btn red block" id="fbNext">Continuar</button>';
            requestAnimationFrame(() => fb.classList.add('show'));
            TD.$('#fbNext', fb).onclick = () => { TD.sfx('tap'); fb.classList.remove('show'); setTimeout(next, 220); };
        }
    }
    function next() {
        if (!S) return;
        S.i++;
        if (S.i >= S.qs.length) return finish();
        showQ();
    }
    function finish() {
        const s = S, total = s.qs.length;
        const pct = Math.round(s.correct / total * 100);
        const stars = pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 50 ? 1 : 0;
        let coins = s.correct * 2 + stars * 5 + (s.correct === total ? 10 : 0);
        const xp = s.correct * 10 + stars * 10;
        const st = TD.state;
        st.stats.quizzes++;
        if (s.correct === total) st.stats.perfect++;
        let improved = false;
        if (s.cfg.kind === 'path') {
            const prev = st.path[s.cfg.world][s.cfg.node] || 0;
            if (stars > prev) { st.path[s.cfg.world][s.cfg.node] = stars; improved = true; }
            if (stars >= 1 && prev === 0) TD.track('path');
            if (prev >= stars) coins = Math.round(coins * 0.6);
        }
        if (s.cfg.kind === 'smart') TD.track('smart');
        TD.addXP(xp);
        st.coins += coins;
        TD.save();
        TD.checkBadges();
        const res = { cfg: s.cfg, total: total, correct: s.correct, pct: pct, stars: stars, coins: coins, xp: xp, best: s.best, avg: Math.round(s.totalMs / total / 100) / 10, errors: s.errors.map((e) => ({ text: e.q.text, ans: e.q.ans, you: e.you })), improved: improved };
        S = null;
        TD.nav.go('result', res, { replace: true, dir: 'fade' });
    }
    TD.act.quizExit = () => askExit();
    TD.act.quizHint = () => {
        if (!S) return;
        const q = S.qs[S.i];
        S.hints++;
        TD.ui.sheet('<div class="row">' + TD.mascot('happy', 56) + '<div><h3>Dica do Pi</h3><p class="muted small" style="margin:0">' + q.text + ' = ?</p></div></div><div class="mt12">' + L.hintHtml(q) + '</div><div class="actions"><button class="btn block" data-act="closeSheet">Entendi!</button></div>');
    };
    TD.act.closeSheet = () => TD.ui.closeTop();

    // "back" do quiz (após confirmar) precisa ignorar o onBack
    const origBack = TD.nav.back;
    TD.nav.back = function (force) {
        if (force === true && this.current && this.current.name === 'quiz') {
            if (this.stack.length > 1) { this.stack.pop(); const prev = this.stack[this.stack.length - 1]; this.show(prev.name, prev.params, 'back'); return true; }
            this.go('home', {}, { root: true, dir: 'back' }); return true;
        }
        return origBack.call(this);
    };

    /* ---------------- Tela: Resultado ---------------- */
    let R0 = null;
    TD.screens.result = {
        topbar: 'none', tabbar: false,
        render(r) {
            R0 = r;
            const titles = ['Vamos tentar de novo!', 'Bom começo!', 'Muito bem!', 'Incrível!'];
            const mood = r.stars >= 3 ? 'big' : r.stars >= 2 ? 'happy' : r.stars >= 1 ? 'wow' : 'sad';
            let html = '<div class="result">' + TD.mascot(mood, 110, r.stars >= 2 ? 'jump' : '') +
                '<div class="stars-row">' + TD.starSvg(false) + TD.starSvg(false) + TD.starSvg(false) + '</div>' +
                '<h2>' + titles[r.stars] + '</h2><p class="muted" style="margin:0">Você acertou <b>' + r.correct + ' de ' + r.total + '</b>' + (r.correct === r.total ? ' — perfeito!' : '') + '</p>' +
                '<div class="res-stats"><div class="res-stat"><b>' + r.pct + '%</b><small>acertos</small></div><div class="res-stat"><b>' + String(r.avg).replace('.', ',') + 's</b><small>por conta</small></div><div class="res-stat"><b>' + r.best + '</b><small>seguidas</small></div></div>' +
                '<div class="reward-box"><div class="rw" id="rwCoins"><span class="pill coins" style="height:auto;padding:0;background:none;border:0"><span class="ic" style="color:#92400e">' + TD.icon('star', 15) + '</span></span>+<span id="rwCoinsN">' + r.coins + '</span></div><div class="rw" style="color:var(--primary-2)">+' + r.xp + ' XP</div></div>';
            if (r.coins > 0 && !r.doubled) html += '<div class="mt12" id="rwDouble">' + TD.ads.rewardButton('Dobrar moedas', 'resultDouble') + '</div>';
            if (r.errors.length) {
                html += '<div class="h2" style="justify-content:center">Revise estas contas</div><div class="err-list">' +
                    r.errors.map((e) => '<div class="err-item"><span>' + e.text + ' = <span class="ok">' + e.ans + '</span></span><span class="you">' + (isNaN(e.you) ? '' : e.you) + '</span></div>').join('') + '</div>';
            }
            const nextLabel = r.cfg.kind === 'path' && r.stars >= 1 ? 'Próxima fase' : 'Continuar';
            html += '<div class="btn-row mt24"><button class="btn ghost" data-act="resultAgain">' + TD.icon('refresh', 20) + 'De novo</button><button class="btn green" data-act="resultNext">' + nextLabel + '</button></div></div>';
            return html;
        },
        mount(el, r) {
            const stars = TD.$$('.stars-row .st', el);
            for (let i = 0; i < r.stars; i++) {
                setTimeout(() => { stars[i].classList.add('on'); TD.sfx('star', i); TD.buzz('medium'); TD.fx.burstAt(stars[i], { n: 14, colors: ['#fde047', '#fbbf24', '#fff'] }); }, 450 + i * 380);
            }
            if (r.stars >= 3) setTimeout(() => { TD.fx.confetti(); TD.sfx('win'); }, 450 + 3 * 380);
            else if (r.stars === 0) TD.sfx('lose');
            setTimeout(() => TD.ui.coinFly(TD.$('#rwCoins', el), r.coins), 600);
        },
        onBack() { goNext(false); return false; }
    };
    async function goNext(again) {
        const r = R0;
        if (!r) return;
        await TD.ads.breakpoint();
        if (again) { TD.nav.go('quiz', r.cfg, { replace: true }); return; }
        if (r.cfg.kind === 'path' && r.stars >= 1) {
            const w = L.WORLDS[r.cfg.world];
            const idx = w.nodes.findIndex((n) => n.id === r.cfg.node);
            const nx = w.nodes[idx + 1];
            if (nx && !(TD.state.path[r.cfg.world][nx.id] >= 1)) { TD.nav.go('quiz', { kind: 'path', world: r.cfg.world, node: nx.id, title: nx.t }, { replace: true }); return; }
        }
        TD.nav.stack.pop();
        if (TD.nav.stack.length) { const prev = TD.nav.stack[TD.nav.stack.length - 1]; TD.nav.show(prev.name, prev.params, 'back'); }
        else TD.nav.go('home', {}, { root: true });
    }
    TD.act.resultAgain = () => goNext(true);
    TD.act.resultNext = () => goNext(false);
    TD.act.resultDouble = async (a, btn) => {
        if (!R0 || R0.doubled) return;
        btn.disabled = true;
        const ok = await TD.ads.showReward();
        if (!ok) { btn.disabled = false; return; }
        R0.doubled = true;
        TD.addCoins(R0.coins, TD.$('#rwCoins'));
        const n = TD.$('#rwCoinsN'); if (n) n.textContent = R0.coins * 2;
        const box = TD.$('#rwDouble'); if (box) box.innerHTML = '<p class="center" style="color:var(--gold)">Moedas dobradas! 🎉</p>';
    };

    /* ---------------- Tela: Aprender (hub) ---------------- */
    const PLANET_COLORS = ['', '#f472b6', '#fb923c', '#facc15', '#4ade80', '#2dd4bf', '#38bdf8', '#818cf8', '#c084fc', '#f43f5e', '#a3e635'];
    L.planetColor = (n) => PLANET_COLORS[n] || '#818cf8';
    TD.screens.learn = {
        tab: 'learn', topbar: 'profile', title: 'Aprender',
        render() {
            let html = '<h1 class="h-display mt8">Aprender</h1><p class="muted" style="margin:4px 0 14px">Entenda de verdade, no seu ritmo.</p>' +
                '<button class="card-grad smart smart-cta" data-act="smartStart" style="width:100%;text-align:left"><div class="play-orb">' + TD.icon('brain', 30) + '</div><div><div class="h3" style="color:#fff">Treino Inteligente</div><div class="small" style="opacity:.9">10 contas escolhidas para você, focadas no que mais precisa treinar.</div></div></button>';
            html += '<div class="h2">Trilhas</div><div class="world-grid">' + ['mul', 'add', 'sub', 'div'].map((w) => {
                const W = L.WORLDS[w], pr = L.worldProgress(w);
                return '<button class="card-grad world-card ' + w + '" data-act="openPath" data-arg="' + w + '"><div class="sym">' + W.sym + '</div><div><b style="font:800 1.05rem var(--font-display)">' + W.name + '</b><div class="tiny" style="opacity:.9">' + pr.done + ' de ' + pr.total + ' fases</div><div class="wbar"><i style="width:' + pr.pct + '%"></i></div></div></button>';
            }).join('') + '</div>';
            html += '<div class="h2">Planetas da tabuada <small>toque para estudar</small></div><div class="card"><div class="planet-grid">';
            for (let n = 1; n <= 10; n++) {
                const m = Math.round(L.tableMastery(n) * 100);
                html += '<button class="planet" data-act="openTable" data-arg="' + n + '"><div class="orb" style="background:radial-gradient(circle at 35% 30%, #fff8 0 8%, ' + L.planetColor(n) + ' 40%, color-mix(in srgb, ' + L.planetColor(n) + ' 60%, #000))">' +
                    '<svg class="pring" viewBox="0 0 70 70" style="transform:rotate(-90deg)"><circle cx="35" cy="35" r="32" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="4"/><circle cx="35" cy="35" r="32" fill="none" stroke="#fde047" stroke-width="4" stroke-linecap="round" stroke-dasharray="201" stroke-dashoffset="' + (201 * (1 - m / 100)).toFixed(0) + '"/></svg>' + n + '</div><small>' + m + '%</small></button>';
            }
            html += '</div></div>';
            html += '<div class="h2">Truques de mestre</div><div class="list">' + L.TRICKS.slice(0, 6).map((t, i) => trickItem(t, i)).join('') + '</div>' +
                '<button class="btn ghost block mt12" data-act="allTricks">Ver todos os ' + L.TRICKS.length + ' truques</button>';
            html += '<div class="h2">Para a vida real</div><div class="list">' +
                '<button class="card tap list-item" data-act="openGame" data-arg="clock"><div class="ico-badge play">' + TD.icon('clock', 26) + '</div><div class="grow"><b>Aprender as horas</b><small>Leia o relógio de ponteiros brincando</small></div><span class="chev">' + TD.icon('chev', 20) + '</span></button>' +
                '<button class="card tap list-item" data-act="tab" data-arg="tools"><div class="ico-badge tools">' + TD.icon('tools', 26) + '</div><div class="grow"><b>Ferramentas do dia a dia</b><small>Porcentagem, descontos, regra de três e mais</small></div><span class="chev">' + TD.icon('chev', 20) + '</span></button></div>';
            return html;
        }
    };
    function trickItem(t, i) {
        return '<button class="card tap trick-card" data-act="openTrick" data-arg="' + i + '" style="text-align:left;width:100%"><div class="tk">' + t.e + '</div><div class="grow"><b style="font:800 1rem var(--font-display)">' + t.t + '</b><div class="small muted">' + t.ex + '</div></div></button>';
    }
    TD.act.openTrick = (i) => {
        const t = L.TRICKS[Number(i)];
        TD.ui.sheet('<div class="row"><div class="tk" style="font-size:2rem;width:60px;height:60px;border-radius:18px;display:grid;place-items:center;background:var(--surface-2)">' + t.e + '</div><h3 style="flex:1">' + t.t + '</h3></div><p>' + t.d + '</p><div class="card-grad smart"><div class="small" style="opacity:.85">Exemplo</div><div style="font:800 1.3rem var(--font-display)">' + t.ex + '</div></div><div class="actions"><button class="btn block" data-act="closeSheet">Entendi!</button></div>');
    };
    TD.act.allTricks = () => TD.ui.sheet('<h3>Truques de mestre</h3><div class="list mt12">' + L.TRICKS.map((t, i) => trickItem(t, i)).join('') + '</div>');
    TD.act.smartStart = () => L.start({ kind: 'smart', title: 'Treino Inteligente' });
    TD.act.openPath = (w) => TD.nav.go('path', { world: w || 'mul' });
    TD.act.openTable = (n) => TD.nav.go('table', { n: Number(n) });

    /* ---------------- Tela: Tabuada (planeta) ---------------- */
    let tableHide = false, tableReading = false;
    TD.screens.table = {
        tab: 'learn', topbar: 'back', tabbar: false,
        title: (p) => 'Tabuada do ' + p.n, sub: 'Toque em uma linha para ver',
        render(p) {
            const n = p.n, m = Math.round(L.tableMastery(n) * 100);
            let mastered = 0; for (let b = 1; b <= 10; b++) if (L.box(n + 'x' + b) >= 4) mastered++;
            let html = '<div class="table-hero mt8"><div class="orb-big" style="background:radial-gradient(circle at 35% 30%, #fff9 0 8%, ' + L.planetColor(n) + ' 42%, color-mix(in srgb, ' + L.planetColor(n) + ' 55%, #000))">' + n + '</div>' +
                '<div class="grow"><div class="h3">Planeta do ' + n + '</div><div class="small muted">Você domina ' + mastered + ' de 10 contas</div><div class="bar gold mt8"><i style="width:' + m + '%"></i></div></div></div>' +
                '<div class="card mt16 row" style="align-items:flex-start"><span style="font-size:1.6rem">💡</span><div class="small">' + TABLE_TIPS[n] + '</div></div>' +
                '<div class="row mt16"><div class="seg grow"><button class="' + (tableHide ? '' : 'active') + '" data-act="tableMode" data-arg="show">' + TD.icon('eye', 18, ' style="display:inline;vertical-align:-3px"') + ' Ver</button><button class="' + (tableHide ? 'active' : '') + '" data-act="tableMode" data-arg="hide">🙈 Esconder</button></div>' +
                '<button class="btn sm cyan" data-act="tableRead" data-arg="' + n + '">' + TD.icon('play', 18) + 'Tocar</button></div>' +
                '<p class="tiny muted center" style="margin:8px 0">' + (tableHide ? 'Tente lembrar e toque para revelar a resposta.' : 'Toque numa linha para ver a conta em bolinhas.') + '</p>' +
                '<div class="t-rows" id="tRows">';
            for (let b = 1; b <= 10; b++) html += '<button class="t-row' + (tableHide ? ' hidden-ans' : '') + '" data-b="' + b + '" style="animation-delay:' + (b * 40) + 'ms"><span>' + n + ' × ' + b + '</span><span class="ans">' + (n * b) + '</span></button>';
            html += '</div><div class="btn-row mt24"><button class="btn green lg" data-act="tablePractice" data-arg="' + n + '">' + TD.icon('play', 22) + 'Praticar agora</button></div>';
            return html;
        },
        mount(el, p) {
            const n = p.n;
            const key = TD.today() + ':' + n;
            if (!TD.state.studied[key]) { TD.state.studied[key] = 1; TD.track('study'); const ks = Object.keys(TD.state.studied); if (ks.length > 40) delete TD.state.studied[ks[0]]; }
            TD.$$('.t-row', el).forEach((row) => row.addEventListener('click', () => {
                const b = Number(row.dataset.b);
                TD.sfx('tap');
                if (row.classList.contains('hidden-ans')) { row.classList.remove('hidden-ans'); TD.sfx('pop'); TD.fx.burstAt(row.querySelector('.ans'), { n: 10 });  return; }
                const open = row.nextElementSibling && row.nextElementSibling.classList.contains('dots-panel');
                TD.$$('.dots-panel', el).forEach((d) => { d.previousElementSibling.classList.remove('open'); d.remove(); });
                if (open) return;
                row.classList.add('open');
                const panel = document.createElement('div');
                panel.className = 'dots-panel';
                panel.innerHTML = '<p class="center small muted" style="margin:0 0 6px">' + n + ' fileira' + (n > 1 ? 's' : '') + ' de ' + b + ' = <b style="color:var(--gold)">' + (n * b) + '</b> bolinhas</p>' + dotGrid(n, b);
                row.after(panel);
            }));
        },
        unmount() { tableReading = false; }
    };
    TD.act.tableMode = (m) => { tableHide = m === 'hide'; TD.nav.refresh(); };
    TD.act.tablePractice = (n) => L.start({ kind: 'table', n: Number(n), title: 'Tabuada do ' + n });
    // "Tocar": acende linha por linha com uma escala musical subindo (memória musical, sem voz)
    TD.act.tableRead = async () => {
        if (tableReading) { tableReading = false; return; }
        tableReading = true;
        const rows = TD.$$('.t-row');
        for (let b = 1; b <= 10 && tableReading; b++) {
            const row = rows[b - 1];
            if (!row) break;
            rows.forEach((r) => r.classList.remove('speaking'));
            row.classList.add('speaking'); row.classList.remove('hidden-ans');
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            TD.sfx('note', b - 1);
            TD.fx.burstAt(row.querySelector('.ans'), { n: 6, speed: 4 });
            await TD.wait(720);
        }
        rows.forEach((r) => r.classList.remove('speaking'));
        if (tableReading) TD.sfx('win');
        tableReading = false;
    };

    /* ---------------- Tela: Trilha ---------------- */
    TD.screens.path = {
        tab: 'learn', topbar: 'back', tabbar: false,
        title: (p) => 'Trilha: ' + L.WORLDS[p.world].name, sub: (p) => { const pr = L.worldProgress(p.world); return pr.done + ' de ' + pr.total + ' fases completas'; },
        render(p) {
            const w = p.world, W = L.WORLDS[w], prog = TD.state.path[w] || {};
            const cur = L.currentNode(w);
            let html = '<div class="chips mt8">' + ['mul', 'add', 'sub', 'div'].map((k) => '<button class="chip' + (k === w ? ' active' : '') + '" data-act="pathWorld" data-arg="' + k + '">' + L.WORLDS[k].sym + ' ' + L.WORLDS[k].name + '</button>').join('') + '</div>';
            const STEP = 116, items = [];
            let y = 40;
            W.nodes.forEach((n, i) => {
                if (W.sections[i]) { items.push({ sec: W.sections[i], y: y }); y += 64; }
                const x = 50 + Math.sin(i * 0.95) * 26;
                items.push({ node: n, i: i, x: x, y: y });
                y += STEP + (n.boss ? 14 : 0);
            });
            const height = y;
            html += '<div class="path-wrap" id="pathWrap" style="height:' + height + 'px"><svg class="path-line" id="pathSvg"></svg>';
            items.forEach((it) => {
                if (it.sec) { html += '<div class="path-section" style="top:' + it.y + 'px"><span>' + it.sec + '</span></div>'; return; }
                const n = it.node, stars = prog[n.id] || 0, locked = it.i > cur, isCur = it.i === cur && !(stars >= 1);
                const label = n.crown ? '👑' : n.boss ? '★' : (w === 'mul' && n.tables.length === 1 ? n.tables[0] : (it.i + 1));
                html += '<button class="pnode' + (n.boss ? ' boss' : '') + (locked ? ' locked' : '') + (isCur ? ' current' : '') + '" style="left:' + it.x + '%;top:' + it.y + 'px;--c1:' + W.colors[0] + ';--c2:' + W.colors[1] + ';--edge:' + W.colors[2] + '" data-act="pathNode" data-arg="' + w + ':' + n.id + '" data-x="' + it.x + '" data-y="' + it.y + '">' +
                    (locked ? TD.icon('lock', 26) : label) +
                    (isCur ? '<span class="start-bubble">Começar!</span>' : '') +
                    (!locked && stars ? '<span class="pstars">' + TD.stars(stars) + '</span>' : '') + '</button>';
                if (isCur) html += '<div class="path-mascot" style="top:' + (it.y - 40) + 'px;' + (it.x > 50 ? 'left:calc(' + it.x + '% - 150px)' : 'left:calc(' + it.x + '% + 60px)') + '">' + TD.mascot('wave', 70) + '</div>';
            });
            html += '</div>';
            return html;
        },
        mount(el, p) {
            const wrap = TD.$('#pathWrap', el), svg = TD.$('#pathSvg', el);
            const W = wrap.clientWidth;
            const nodes = TD.$$('.pnode', wrap).map((b) => ({ x: Number(b.dataset.x) / 100 * W, y: Number(b.dataset.y), locked: b.classList.contains('locked') }));
            let d = '', dDone = '';
            const cur = L.currentNode(p.world);
            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                if (i === 0) { d = 'M' + a.x + ' ' + a.y; dDone = d; continue; }
                const b0 = nodes[i - 1];
                const seg = ' C' + b0.x + ' ' + (b0.y + 55) + ',' + a.x + ' ' + (a.y - 55) + ',' + a.x + ' ' + a.y;
                d += seg; if (i <= cur) dDone += seg;
            }
            svg.setAttribute('viewBox', '0 0 ' + W + ' ' + wrap.clientHeight);
            svg.innerHTML = '<path d="' + d + '" fill="none" stroke="var(--surface-3)" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 18"/>' +
                '<path d="' + dDone + '" fill="none" stroke="var(--gold)" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 18" opacity=".9"/>';
            const curEl = TD.$('.pnode.current', wrap) || TD.$$('.pnode:not(.locked)', wrap).pop();
            if (curEl) setTimeout(() => { el.scrollTo({ top: Math.max(0, Number(curEl.dataset.y) - el.clientHeight / 2 + 80), behavior: 'smooth' }); }, 250);
        }
    };
    TD.act.pathWorld = (w) => TD.nav.go('path', { world: w }, { replace: true, dir: 'fade' });
    TD.act.pathNode = (arg) => {
        const parts = arg.split(':'), w = parts[0], id = parts[1];
        const W = L.WORLDS[w], idx = W.nodes.findIndex((n) => n.id === id), n = W.nodes[idx];
        if (idx > L.currentNode(w)) { TD.ui.toast('Fase bloqueada', 'Complete a fase anterior para liberar', '🔒'); TD.sfx('wrong'); return; }
        const stars = TD.state.path[w][id] || 0;
        TD.ui.sheet('<div class="center"><div class="pnode' + (n.boss ? ' boss' : '') + '" style="position:relative;margin:6px auto 14px;left:auto;top:auto;--c1:' + W.colors[0] + ';--c2:' + W.colors[1] + ';--edge:' + W.colors[2] + '">' + (n.crown ? '👑' : n.boss ? '★' : W.sym) + '</div>' +
            '<h3>' + n.t + '</h3><p class="muted" style="margin:0">' + n.d + '</p><div style="font-size:1.6rem;margin:10px 0">' + TD.stars(stars) + '</div>' +
            '<p class="small muted">10 perguntas • acerte 5 para liberar a próxima fase</p></div>' +
            '<div class="actions"><button class="btn green lg block" data-act="pathGo" data-arg="' + arg + '">' + TD.icon('play', 22) + (stars ? 'Jogar de novo' : 'Começar') + '</button></div>');
    };
    TD.act.pathGo = (arg) => {
        TD.ui.closeTop();
        const parts = arg.split(':');
        const n = L.WORLDS[parts[0]].nodes.find((x) => x.id === parts[1]);
        L.start({ kind: 'path', world: parts[0], node: parts[1], title: n.t });
    };
})();
