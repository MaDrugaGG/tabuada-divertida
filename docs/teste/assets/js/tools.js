/* ==========================================================================
   Tabuada Divertida 3.0 — Ferramentas do dia a dia
   ========================================================================== */
'use strict';
(function () {
    const TD = window.TD;
    const TOOLS = [
        { id: 'calc', e: '🧮', n: 'Calculadora Explicada', d: 'Mostra a conta armada passo a passo', g: 'smart' },
        { id: 'percent', e: '%', n: 'Porcentagem e Descontos', d: 'Desconto, aumento e “quanto %”', g: 'tools' },
        { id: 'rule3', e: '⚖️', n: 'Regra de Três', d: 'Direta e inversa, com explicação', g: 'learn' },
        { id: 'split', e: '🍕', n: 'Dividir a Conta', d: 'Rache a conta com gorjeta', g: 'play' },
        { id: 'convert', e: '📏', n: 'Conversor de Medidas', d: 'Comprimento, peso, volume, temperatura…', g: 'learn' },
        { id: 'fraction', e: '½', n: 'Frações Visuais', d: 'Some, simplifique e veja em pizza', g: 'gold' },
        { id: 'tablegen', e: '✖️', n: 'Gerador de Tabuada', d: 'Tabuada de qualquer número', g: 'smart' },
        { id: 'grade', e: '🎓', n: 'Média Escolar', d: 'Calcule sua média e quanto falta', g: 'tools' },
        { id: 'interest', e: '💰', n: 'Juros e Parcelas', d: 'Juros compostos e valor da parcela', g: 'fire' }
    ];
    TD.TOOLS = TOOLS;

    const num = (s) => {
        s = String(s == null ? '' : s).trim();
        if (!s) return NaN;
        if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
        return Number(s);
    };
    const fmt = (n, d) => (isFinite(n) ? Number(n).toLocaleString('pt-BR', { maximumFractionDigits: d == null ? 4 : d }) : '—');
    const money = (n) => (isFinite(n) ? Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—');
    const field = (id, label, val, ph) => '<div class="field"><label for="' + id + '">' + label + '</label><input class="inp" id="' + id + '" inputmode="decimal" autocomplete="off" value="' + (val == null ? '' : val) + '" placeholder="' + (ph || '0') + '"></div>';
    const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; };

    /* ---------------- Hub ---------------- */
    TD.screens.tools = {
        tab: 'tools', topbar: 'profile', title: 'Ferramentas',
        render() {
            return '<h1 class="h-display mt8">Ferramentas</h1><p class="muted" style="margin:4px 0 14px">Matemática que ajuda no dia a dia, na escola e no trabalho.</p>' +
                '<div class="tool-grid">' + TOOLS.map((t) => '<button class="card tap tool-card" data-act="openTool" data-arg="' + t.id + '"><div class="ico-badge ' + t.g + '" style="font:800 1.5rem var(--font-display)">' + t.e + '</div><b>' + t.n + '</b><small>' + t.d + '</small></button>').join('') + '</div>';
        }
    };
    TD.act.openTool = (id) => TD.nav.go('tool', { id: id });

    TD.screens.tool = {
        tab: 'tools', topbar: 'back', tabbar: false,
        title: (p) => (TOOLS.find((t) => t.id === p.id) || {}).n || 'Ferramenta',
        sub: (p) => (TOOLS.find((t) => t.id === p.id) || {}).d || '',
        render(p) { return '<div class="col mt8" id="toolBody">' + (IMPL[p.id] ? IMPL[p.id].html() : '') + '</div>'; },
        mount(el, p) {
            const impl = IMPL[p.id];
            if (!impl) return;
            if (!TD.state.stats.tools[p.id]) TD.state.stats.tools[p.id] = 0;
            TD.state.stats.tools[p.id]++;
            TD.track('tool', { id: p.id });
            const run = () => { try { impl.calc(el); } catch (e) { console.error(e); } };
            el.addEventListener('input', run);
            el.addEventListener('change', run);
            el.addEventListener('click', (e) => {
                const b = e.target.closest('[data-pick]');
                if (!b) return;
                const grp = b.dataset.pick;
                TD.$$('[data-pick="' + grp + '"]', el).forEach((x) => x.classList.toggle('active', x === b));
                TD.sfx('tap');
                if (impl.onPick) impl.onPick(el, grp, b.dataset.v);
                run();
            });
            el.addEventListener('focusin', (e) => { if (e.target.classList.contains('inp')) setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300); });
            if (impl.mount) impl.mount(el);
            run();
        }
    };
    const pickVal = (el, grp) => { const b = TD.$('[data-pick="' + grp + '"].active', el); return b ? b.dataset.v : null; };
    const val = (el, id) => num((TD.$('#' + id, el) || {}).value);
    const out = (el, html) => { const o = TD.$('#tOut', el); if (o) o.innerHTML = html; };
    const box = (big, small) => '<div class="result-box"><div class="big"' + (String(big).length > 16 ? ' style="font-size:' + (String(big).length > 24 ? '1.35rem' : '1.75rem') + '"' : '') + '>' + big + '</div>' + (small ? '<small>' + small + '</small>' : '') + '</div>';
    const steps = (list) => '<div class="steps">' + list.map((s, i) => '<div class="step"><span class="n">' + (i + 1) + '</span><div>' + s + '</div></div>').join('') + '</div>';
    const seg = (grp, opts, active) => '<div class="seg">' + opts.map((o) => '<button data-pick="' + grp + '" data-v="' + o[0] + '" class="' + (o[0] === active ? 'active' : '') + '">' + o[1] + '</button>').join('') + '</div>';

    /* ---------------- Contas armadas ---------------- */
    function colTable(rows, width) {
        let h = '<table class="colmath">';
        rows.forEach((r) => {
            const cells = r.cells.slice();
            while (cells.length < width) cells.unshift('');
            h += '<tr class="' + (r.cls || '') + '">' + cells.map((c) => '<td>' + c + '</td>').join('') + '</tr>';
        });
        return h + '</table>';
    }
    const digits = (n) => String(n).split('');
    function explainAdd(a, b) {
        const A = digits(a), B = digits(b), res = a + b, R = digits(res);
        const w = Math.max(A.length, B.length) + 1;
        const carries = new Array(w).fill('');
        const st = [];
        let carry = 0;
        const names = ['unidades', 'dezenas', 'centenas', 'milhares', 'dezenas de milhar', 'centenas de milhar'];
        for (let i = 0; i < Math.max(A.length, B.length); i++) {
            const da = Number(A[A.length - 1 - i] || 0), db = Number(B[B.length - 1 - i] || 0);
            const s = da + db + carry;
            st.push('Some as ' + (names[i] || 'casas ' + (i + 1)) + ': ' + da + ' + ' + db + (carry ? ' + ' + carry + ' (vai um)' : '') + ' = <b>' + s + '</b>' + (s >= 10 ? '. Escreve ' + (s % 10) + ' e <b>vai ' + Math.floor(s / 10) + '</b>.' : '.'));
            carry = Math.floor(s / 10);
            if (carry) carries[w - 2 - i] = carry;
        }
        const table = colTable([{ cells: carries, cls: 'carry' }, { cells: A }, { cells: ['+'].concat(new Array(w - 1 - B.length).fill('')).concat(B), cls: 'line' }, { cells: R, cls: 'res' }], w);
        return { table: table, steps: st };
    }
    function explainSub(a, b) {
        let neg = false;
        if (b > a) { [a, b] = [b, a]; neg = true; }
        const A = digits(a).map(Number), B = digits(b).map(Number), w = A.length + 1;
        const st = [];
        const names = ['unidades', 'dezenas', 'centenas', 'milhares', 'dezenas de milhar', 'centenas de milhar'];
        const work = A.slice();
        for (let i = 0; i < A.length; i++) {
            const idx = A.length - 1 - i, db = B[B.length - 1 - i] || 0;
            if (work[idx] < db) {
                let j = idx - 1; while (j >= 0 && work[j] === 0) { work[j] = 9; j--; }
                if (j >= 0) work[j]--;
                st.push((names[i] || 'casa') + ': ' + work[idx] + ' − ' + db + ' não dá. Pega 1 emprestado da casa ao lado: ' + (work[idx] + 10) + ' − ' + db + ' = <b>' + (work[idx] + 10 - db) + '</b>.');
                work[idx] += 10;
            } else st.push((names[i] || 'casa') + ': ' + work[idx] + ' − ' + db + ' = <b>' + (work[idx] - db) + '</b>.');
        }
        const res = a - b;
        const table = colTable([{ cells: digits(a) }, { cells: ['−'].concat(new Array(w - 1 - B.length).fill('')).concat(digits(b)), cls: 'line' }, { cells: digits(res), cls: 'res' }], w);
        if (neg) st.push('Como o segundo número era maior, o resultado fica <b>negativo</b>: −' + res + '.');
        return { table: table, steps: st };
    }
    function explainMul(a, b) {
        const B = digits(b), st = [];
        const parts = [];
        B.slice().reverse().forEach((d, i) => {
            const p = a * Number(d);
            parts.push({ p: p, shift: i, d: d });
            st.push(a + ' × ' + d + (i ? ' (' + ['', 'dezena', 'centena', 'milhar', 'dezena de milhar'][i] + ', anda ' + i + ' casa' + (i > 1 ? 's' : '') + ' para a esquerda)' : '') + ' = <b>' + p + '</b>' + (i ? ' → ' + p + '0'.repeat(i) : '') + '.');
        });
        const res = a * b;
        const w = String(res).length + 1;
        const rows = [{ cells: digits(a) }, { cells: ['×'].concat(new Array(Math.max(0, w - 1 - B.length)).fill('')).concat(B), cls: 'line' }];
        if (parts.length > 1) {
            parts.forEach((pt, i) => { const cells = digits(pt.p).concat(new Array(pt.shift).fill('·')); if (i === parts.length - 1) cells.unshift('+'); rows.push({ cells: cells, cls: 'part' + (i === parts.length - 1 ? ' line' : '') }); });
            st.push('Some os resultados parciais: <b>' + res + '</b>.');
        }
        rows.push({ cells: digits(res), cls: 'res' });
        return { table: colTable(rows, w), steps: st };
    }
    function explainDiv(a, d) {
        const A = digits(a), st = [];
        let cur = 0, q = '', started = false;
        for (let i = 0; i < A.length; i++) {
            cur = cur * 10 + Number(A[i]);
            if (!started && cur < d && i < A.length - 1) { st.push(cur + ' é menor que ' + d + '. Junta com o próximo algarismo.'); continue; }
            started = true;
            const k = Math.floor(cur / d), rest = cur - k * d;
            st.push('Quantas vezes ' + d + ' cabe em ' + cur + '? <b>' + k + '</b> vez' + (k === 1 ? '' : 'es') + ' (' + k + ' × ' + d + ' = ' + (k * d) + '). Sobra ' + rest + (i < A.length - 1 ? ', baixa o ' + A[i + 1] + '.' : '.'));
            q += k; cur = rest;
        }
        const quo = Math.floor(a / d), rem = a % d;
        st.push('Conferindo: ' + quo + ' × ' + d + (rem ? ' + ' + rem : '') + ' = ' + a + ' ✓');
        const table = '<div class="row" style="justify-content:center;gap:0;font:800 1.6rem var(--font-display)"><div style="padding:4px 12px;border-right:3px solid var(--text)">' + a + '</div><div><div style="padding:4px 12px;border-bottom:3px solid var(--text)">' + d + '</div><div style="padding:4px 12px;color:var(--ok)">' + quo + '</div></div></div>' +
            (rem ? '<p class="center small muted">Resto: <b style="color:var(--warn)">' + rem + '</b></p>' : '');
        return { table: table, steps: st, quo: quo, rem: rem };
    }

    /* ---------------- Implementações ---------------- */
    const IMPL = {
        calc: {
            html: () => '<div class="fields-3">' + field('ca', 'Primeiro número', '' , '345') + '<div></div>' + field('cb', 'Segundo número', '', '27') + '</div>' +
                '<div class="op-pick">' + [['add', '+'], ['sub', '−'], ['mul', '×'], ['div', '÷']].map((o, i) => '<button data-pick="op" data-v="' + o[0] + '" class="' + (i === 2 ? 'active' : '') + '">' + o[1] + '</button>').join('') + '</div><div id="tOut"></div>',
            mount(el) { const a = TD.$('#ca', el), b = TD.$('#cb', el); a.value = '345'; b.value = '27'; },
            calc(el) {
                const a = val(el, 'ca'), b = val(el, 'cb'), op = pickVal(el, 'op');
                if (!isFinite(a) || !isFinite(b)) return out(el, '<p class="muted center">Digite dois números.</p>');
                const sym = TD.opSym[op];
                const int = Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 0;
                let res = op === 'add' ? a + b : op === 'sub' ? a - b : op === 'mul' ? a * b : (b === 0 ? NaN : a / b);
                if (op === 'div' && b === 0) return out(el, box('Ops!', 'Não existe divisão por zero.'));
                let html = box(fmt(a, 6) + ' ' + sym + ' ' + fmt(b, 6) + ' = ' + fmt(res, 4), op === 'div' && int ? 'Quociente ' + Math.floor(a / b) + ' e resto ' + (a % b) : '');
                const tooBig = String(a).length > 12 || String(b).length > (op === 'mul' ? 6 : op === 'div' ? 7 : 12);
                if (!int || tooBig) {
                    html += '<p class="small muted center">O passo a passo aparece para números inteiros e positivos' + (tooBig ? ' de tamanho menor' : '') + '.</p>';
                    return out(el, html);
                }
                const ex = op === 'add' ? explainAdd(a, b) : op === 'sub' ? explainSub(a, b) : op === 'mul' ? explainMul(a, b) : explainDiv(a, b);
                html += '<div class="h2" style="margin-top:16px">Conta armada</div><div class="calc-board">' + ex.table + '</div><div class="h2">Passo a passo</div>' + steps(ex.steps);
                out(el, html);
            }
        },
        percent: {
            mode: 'of',
            html: () => seg('pm', [['of', '% de'], ['off', 'Desconto'], ['up', 'Aumento'], ['how', 'Quanto %'], ['var', 'Variação']], 'of') + '<div id="pFields" class="col"></div><div id="tOut"></div>',
            mount(el) { IMPL.percent.mode = 'of'; IMPL.percent.fields(el); },
            onPick(el, g, v) { if (g === 'pm') { IMPL.percent.mode = v; IMPL.percent.fields(el); } },
            fields(el) {
                const m = IMPL.percent.mode, f = TD.$('#pFields', el);
                const L = { of: [['p1', 'Porcentagem (%)', 15], ['p2', 'Do valor', 80]], off: [['p1', 'Preço (R$)', 120], ['p2', 'Desconto (%)', 25]], up: [['p1', 'Valor (R$)', 1500], ['p2', 'Aumento (%)', 8]], how: [['p1', 'Parte', 30], ['p2', 'Do total', 120]], var: [['p1', 'Valor antigo', 50], ['p2', 'Valor novo', 65]] }[m];
                f.innerHTML = '<div class="fields-2">' + L.map((x) => field(x[0], x[1], x[2])).join('') + '</div>';
            },
            calc(el) {
                const m = IMPL.percent.mode, a = val(el, 'p1'), b = val(el, 'p2');
                if (!isFinite(a) || !isFinite(b)) return out(el, '');
                let html = '';
                if (m === 'of') html = box(fmt(a * b / 100), fmt(a) + '% de ' + fmt(b)) + steps([fmt(a) + '% = ' + fmt(a) + ' ÷ 100 = ' + fmt(a / 100), fmt(a / 100) + ' × ' + fmt(b) + ' = <b>' + fmt(a * b / 100) + '</b>', 'Dica: 10% de ' + fmt(b) + ' é ' + fmt(b / 10) + ' (basta dividir por 10).']);
                if (m === 'off') { const d = a * b / 100; html = box(money(a - d), 'Você economiza ' + money(d)) + steps(['Desconto: ' + fmt(b) + '% de ' + money(a) + ' = ' + money(d), 'Preço final: ' + money(a) + ' − ' + money(d) + ' = <b>' + money(a - d) + '</b>']); }
                if (m === 'up') { const d = a * b / 100; html = box(money(a + d), 'Aumento de ' + money(d)) + steps(['Aumento: ' + fmt(b) + '% de ' + money(a) + ' = ' + money(d), 'Novo valor: ' + money(a) + ' + ' + money(d) + ' = <b>' + money(a + d) + '</b>']); }
                if (m === 'how') { if (!b) return out(el, ''); const p = a / b * 100; html = box(fmt(p, 2) + '%', fmt(a) + ' é ' + fmt(p, 2) + '% de ' + fmt(b)) + steps(['Divida a parte pelo total: ' + fmt(a) + ' ÷ ' + fmt(b) + ' = ' + fmt(a / b), 'Multiplique por 100: <b>' + fmt(p, 2) + '%</b>']); }
                if (m === 'var') { if (!a) return out(el, ''); const p = (b - a) / a * 100; html = box((p >= 0 ? '+' : '') + fmt(p, 2) + '%', p >= 0 ? 'Subiu' : 'Caiu') + steps(['Diferença: ' + fmt(b) + ' − ' + fmt(a) + ' = ' + fmt(b - a), 'Divida pelo valor antigo: ' + fmt(b - a) + ' ÷ ' + fmt(a) + ' = ' + fmt((b - a) / a), 'Vezes 100: <b>' + fmt(p, 2) + '%</b>']); }
                out(el, html);
            }
        },
        rule3: {
            html: () => seg('r3', [['dir', 'Direta'], ['inv', 'Inversa']], 'dir') +
                '<div class="card"><div class="fields-2">' + field('ra', 'Se A…', 3) + field('rb', '…vale B', 12) + '</div><div class="fields-2 mt12">' + field('rc', 'Então C…', 5) + '<div class="field"><label>…vale X</label><div class="inp" style="display:flex;align-items:center;color:var(--gold)" id="rx">?</div></div></div></div>' +
                '<p class="small muted" id="r3hint"></p><div id="tOut"></div>',
            calc(el) {
                const a = val(el, 'ra'), b = val(el, 'rb'), c = val(el, 'rc'), inv = pickVal(el, 'r3') === 'inv';
                TD.$('#r3hint', el).textContent = inv ? 'Inversa: quando um aumenta, o outro diminui (ex.: mais pessoas trabalhando, menos dias).' : 'Direta: os dois aumentam juntos (ex.: mais pães, mais dinheiro).';
                if (![a, b, c].every(isFinite) || !a || (inv && !c)) return out(el, '');
                const x = inv ? a * b / c : b * c / a;
                TD.$('#rx', el).textContent = fmt(x);
                out(el, box('X = ' + fmt(x)) + steps(inv ? ['Na inversa, multiplica em linha: A × B = C × X', fmt(a) + ' × ' + fmt(b) + ' = ' + fmt(c) + ' × X', 'X = ' + fmt(a * b) + ' ÷ ' + fmt(c) + ' = <b>' + fmt(x) + '</b>'] : ['Na direta, multiplica cruzado: A × X = B × C', fmt(a) + ' × X = ' + fmt(b) + ' × ' + fmt(c) + ' = ' + fmt(b * c), 'X = ' + fmt(b * c) + ' ÷ ' + fmt(a) + ' = <b>' + fmt(x) + '</b>']));
            }
        },
        split: {
            html: () => field('st', 'Total da conta (R$)', 186, '0,00') + field('sp', 'Quantas pessoas?', 4) +
                '<div class="field"><label>Gorjeta / serviço</label>' + seg('tip', [['0', 'Sem'], ['10', '10%'], ['12', '12%'], ['15', '15%']], '10') + '</div><div id="tOut"></div>',
            calc(el) {
                const t = val(el, 'st'), p = Math.max(1, Math.round(val(el, 'sp') || 1)), tip = Number(pickVal(el, 'tip') || 0);
                if (!isFinite(t)) return out(el, '');
                const total = t * (1 + tip / 100);
                out(el, box(money(total / p), 'por pessoa') + steps(['Gorjeta: ' + tip + '% de ' + money(t) + ' = ' + money(t * tip / 100), 'Total: <b>' + money(total) + '</b>', 'Dividido por ' + p + ' pessoa' + (p > 1 ? 's' : '') + ': <b>' + money(total / p) + '</b> cada']));
            }
        },
        convert: {
            cat: 'len',
            UNITS: {
                len: { n: 'Comprimento', u: [['mm', 'Milímetro', 0.001], ['cm', 'Centímetro', 0.01], ['m', 'Metro', 1], ['km', 'Quilômetro', 1000], ['in', 'Polegada', 0.0254], ['ft', 'Pé', 0.3048], ['mi', 'Milha', 1609.344]] },
                mass: { n: 'Peso', u: [['mg', 'Miligrama', 0.001], ['g', 'Grama', 1], ['kg', 'Quilograma', 1000], ['t', 'Tonelada', 1e6], ['oz', 'Onça', 28.3495], ['lb', 'Libra', 453.592]] },
                vol: { n: 'Volume', u: [['ml', 'Mililitro', 0.001], ['l', 'Litro', 1], ['m3', 'Metro cúbico', 1000], ['xic', 'Xícara (240 ml)', 0.24], ['cs', 'Colher de sopa (15 ml)', 0.015], ['cc', 'Colher de chá (5 ml)', 0.005]] },
                temp: { n: 'Temperatura', u: [['c', 'Celsius (°C)'], ['f', 'Fahrenheit (°F)'], ['k', 'Kelvin (K)']] },
                time: { n: 'Tempo', u: [['s', 'Segundos', 1], ['min', 'Minutos', 60], ['h', 'Horas', 3600], ['d', 'Dias', 86400], ['sem', 'Semanas', 604800]] },
                area: { n: 'Área', u: [['cm2', 'cm²', 0.0001], ['m2', 'm²', 1], ['ha', 'Hectare', 10000], ['km2', 'km²', 1e6], ['alq', 'Alqueire paulista', 24200]] }
            },
            html() {
                const U = IMPL.convert.UNITS;
                return '<div class="chips">' + Object.keys(U).map((k, i) => '<button class="chip' + (i === 0 ? ' active' : '') + '" data-pick="cat" data-v="' + k + '">' + U[k].n + '</button>').join('') + '</div>' +
                    field('cv', 'Valor', 1) + '<div class="fields-3"><div class="field"><label>De</label><select class="inp" id="cf"></select></div><button class="icon-btn" data-act="convSwap" style="margin-bottom:6px">⇄</button><div class="field"><label>Para</label><select class="inp" id="ct"></select></div></div><div id="tOut"></div>';
            },
            mount(el) { IMPL.convert.cat = 'len'; IMPL.convert.fill(el); },
            onPick(el, g, v) { if (g === 'cat') { IMPL.convert.cat = v; IMPL.convert.fill(el); } },
            fill(el) {
                const u = IMPL.convert.UNITS[IMPL.convert.cat].u;
                const opts = u.map((x) => '<option value="' + x[0] + '">' + x[1] + '</option>').join('');
                TD.$('#cf', el).innerHTML = opts; TD.$('#ct', el).innerHTML = opts;
                TD.$('#cf', el).selectedIndex = Math.min(1, u.length - 1); TD.$('#ct', el).selectedIndex = Math.min(2, u.length - 1);
            },
            calc(el) {
                const cat = IMPL.convert.cat, U = IMPL.convert.UNITS[cat].u, v = val(el, 'cv');
                const f = TD.$('#cf', el).value, t = TD.$('#ct', el).value;
                if (!isFinite(v)) return out(el, '');
                const uf = U.find((x) => x[0] === f), ut = U.find((x) => x[0] === t);
                let r;
                if (cat === 'temp') {
                    const c = f === 'c' ? v : f === 'f' ? (v - 32) * 5 / 9 : v - 273.15;
                    r = t === 'c' ? c : t === 'f' ? c * 9 / 5 + 32 : c + 273.15;
                } else r = v * uf[2] / ut[2];
                out(el, box(fmt(r, 6) + ' ' + ut[0], fmt(v) + ' ' + uf[1] + ' = ' + fmt(r, 6) + ' ' + ut[1]));
            }
        },
        fraction: {
            html: () => '<div class="card"><div class="fields-3"><div class="col gap6">' + field('fa', 'Numerador', 1) + field('fb', 'Denominador', 2) + '</div>' +
                '<div class="op-pick" style="grid-template-columns:1fr;gap:6px;align-self:center">' + [['add', '+'], ['sub', '−'], ['mul', '×'], ['div', '÷']].map((o, i) => '<button data-pick="fop" data-v="' + o[0] + '" class="' + (i === 0 ? 'active' : '') + '" style="height:40px;width:48px">' + o[1] + '</button>').join('') + '</div>' +
                '<div class="col gap6">' + field('fc', 'Numerador', 1) + field('fd', 'Denominador', 3) + '</div></div></div><div id="tOut"></div>',
            calc(el) {
                const a = Math.round(val(el, 'fa')), b = Math.round(val(el, 'fb')), c = Math.round(val(el, 'fc')), d = Math.round(val(el, 'fd')), op = pickVal(el, 'fop');
                if (![a, b, c, d].every(isFinite) || !b || !d) return out(el, '<p class="muted center">Denominador não pode ser zero.</p>');
                let n, m, how;
                if (op === 'add' || op === 'sub') {
                    const L = b * d / gcd(b, d);
                    const a2 = a * (L / b), c2 = c * (L / d);
                    n = op === 'add' ? a2 + c2 : a2 - c2; m = L;
                    how = ['Denominador comum (MMC de ' + b + ' e ' + d + '): <b>' + L + '</b>', a + '/' + b + ' = ' + a2 + '/' + L + ' e ' + c + '/' + d + ' = ' + c2 + '/' + L, (op === 'add' ? 'Some' : 'Subtraia') + ' os numeradores: ' + a2 + (op === 'add' ? ' + ' : ' − ') + c2 + ' = ' + n + ' → ' + n + '/' + L];
                } else if (op === 'mul') { n = a * c; m = b * d; how = ['Multiplique em cima e embaixo: (' + a + ' × ' + c + ')/(' + b + ' × ' + d + ') = ' + n + '/' + m]; }
                else { if (!c) return out(el, '<p class="muted center">Não dá para dividir por zero.</p>'); n = a * d; m = b * c; how = ['Repita a primeira e multiplique pelo inverso da segunda: ' + a + '/' + b + ' × ' + d + '/' + c + ' = ' + n + '/' + m]; }
                if (m < 0) { n = -n; m = -m; }
                const g = gcd(n, m), sn = n / g, sm = m / g;
                if (g > 1) how.push('Simplifique dividindo por ' + g + ': <b>' + sn + '/' + sm + '</b>');
                const whole = Math.trunc(sn / sm), rest = Math.abs(sn % sm);
                const mixed = whole && rest ? whole + ' ' + rest + '/' + sm : '';
                out(el, box(sn + (sm !== 1 ? '/' + sm : ''), (mixed ? 'Número misto: ' + mixed + ' • ' : '') + 'Decimal: ' + fmt(sn / sm) + ' • ' + fmt(sn / sm * 100, 2) + '%') +
                    '<div class="card pizza-wrap"><canvas id="pizza" width="320" height="170" style="width:100%;max-width:320px;height:auto"></canvas><p class="small muted center" style="margin:6px 0 0">Cada pizza é um inteiro dividido em ' + sm + ' fatias</p></div>' + steps(how));
                drawPizzas(TD.$('#pizza', el), sn, sm);
            }
        },
        tablegen: {
            html: () => '<div class="fields-2">' + field('tn', 'Número', 7) + '<div class="field"><label>Até</label>' + seg('tr', [['10', '× 10'], ['12', '× 12'], ['20', '× 20']], '10') + '</div></div>' +
                '<button class="btn green block" data-act="tgPractice">' + TD.icon('play', 20) + 'Praticar esta tabuada</button><div id="tOut"></div>',
            calc(el) {
                const n = val(el, 'tn'), to = Number(pickVal(el, 'tr') || 10);
                if (!isFinite(n)) return out(el, '');
                let h = '<div class="t-rows">';
                for (let i = 1; i <= to; i++) h += '<div class="t-row" style="animation-delay:' + i * 25 + 'ms"><span>' + fmt(n) + ' × ' + i + '</span><span class="ans">' + fmt(n * i) + '</span></div>';
                out(el, h + '</div>');
                IMPL.tablegen.cur = { n: n, to: to };
            }
        },
        grade: {
            html: () => '<p class="small muted" style="margin:0">Digite suas notas (deixe em branco o que ainda não tem). Use peso se a escola usar.</p>' +
                '<div class="col">' + [1, 2, 3, 4].map((i) => '<div class="fields-2">' + field('g' + i, 'Nota ' + i, i <= 3 ? [7.5, 6, 8][i - 1] : '', '—') + field('w' + i, 'Peso', 1) + '</div>').join('') + '</div>' +
                field('gmin', 'Média para passar', 6) + '<div id="tOut"></div>',
            calc(el) {
                let sum = 0, ws = 0, missingW = 0;
                const used = [];
                for (let i = 1; i <= 4; i++) {
                    const g = val(el, 'g' + i), w = isFinite(val(el, 'w' + i)) ? val(el, 'w' + i) : 1;
                    if (isFinite(g)) { sum += g * w; ws += w; used.push(fmt(g) + (w !== 1 ? '×' + fmt(w) : '')); } else missingW += w;
                }
                const min = val(el, 'gmin');
                if (!ws) return out(el, '');
                const avg = sum / ws;
                let msg = '';
                if (isFinite(min)) {
                    if (missingW > 0) {
                        const need = (min * (ws + missingW) - sum) / missingW;
                        msg = need <= 0 ? 'Você já garantiu a média! 🎉' : need > 10 ? 'Precisaria de mais de 10 no que falta. Converse com o professor sobre recuperação.' : 'Você precisa tirar <b>' + fmt(need, 2) + '</b> no que falta para chegar a ' + fmt(min) + '.';
                    } else msg = avg >= min ? 'Aprovado! 🎉' : 'Faltaram ' + fmt(min - avg, 2) + ' pontos para a média.';
                }
                out(el, box(fmt(avg, 2), 'sua média atual') + steps(['Soma das notas' + (used.some((u) => u.indexOf('×') >= 0) ? ' com peso' : '') + ': ' + used.join(' + ') + ' = ' + fmt(sum, 2), 'Divida por ' + fmt(ws) + ': <b>' + fmt(avg, 2) + '</b>'].concat(msg ? [msg] : [])));
            }
        },
        interest: {
            mode: 'comp',
            html: () => seg('im', [['comp', 'Juros compostos'], ['inst', 'Parcelas']], 'comp') + '<div class="fields-2">' + field('ic', 'Valor (R$)', 1000) + field('ir', 'Taxa ao mês (%)', 1.5) + '</div>' + field('in', 'Meses', 12) + '<div id="tOut"></div>',
            onPick(el, g, v) { if (g === 'im') IMPL.interest.mode = v; },
            calc(el) {
                const c = val(el, 'ic'), r = val(el, 'ir') / 100, n = Math.round(val(el, 'in'));
                if (![c, r, n].every(isFinite) || n <= 0) return out(el, '');
                if (pickVal(el, 'im') === 'inst') {
                    const p = r === 0 ? c / n : c * r / (1 - Math.pow(1 + r, -n));
                    out(el, box(n + 'x de ' + money(p), 'Total pago: ' + money(p * n) + ' • Juros: ' + money(p * n - c)) + steps(['Fórmula da parcela (Tabela Price): P = V × i ÷ (1 − (1 + i)<sup>−n</sup>)', 'P = ' + money(c) + ' × ' + fmt(r, 4) + ' ÷ (1 − ' + fmt(1 + r, 4) + '<sup>−' + n + '</sup>) = <b>' + money(p) + '</b>', 'Compare: à vista você pagaria ' + money(c) + '.']));
                } else {
                    const m = c * Math.pow(1 + r, n);
                    out(el, box(money(m), 'Juros ganhos: ' + money(m - c)) + steps(['Fórmula: M = C × (1 + i)<sup>n</sup>', 'M = ' + money(c) + ' × ' + fmt(1 + r, 4) + '<sup>' + n + '</sup>', '= <b>' + money(m) + '</b>']));
                }
            }
        }
    };
    function drawPizzas(cv, n, m) {
        if (!cv) return;
        const x = cv.getContext('2d'), W = cv.width, H = cv.height;
        x.clearRect(0, 0, W, H);
        const neg = n < 0; n = Math.abs(n);
        const count = Math.min(4, Math.max(1, Math.ceil(n / m)));
        const r = Math.min(70, (W / count) / 2 - 8);
        for (let k = 0; k < count; k++) {
            const cx = W / 2 + (k - (count - 1) / 2) * (r * 2 + 12), cy = H / 2;
            const filled = Math.max(0, Math.min(m, n - k * m));
            x.fillStyle = '#7a4a1e'; x.beginPath(); x.arc(cx, cy, r + 4, 0, 7); x.fill();
            for (let i = 0; i < m; i++) {
                const a0 = -Math.PI / 2 + i / m * Math.PI * 2, a1 = a0 + Math.PI * 2 / m;
                x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, r, a0, a1); x.closePath();
                x.fillStyle = i < filled ? (neg ? '#f87171' : '#fbbf24') : 'rgba(255,255,255,.1)';
                x.fill(); x.strokeStyle = '#7a4a1e'; x.lineWidth = 2; x.stroke();
                if (i < filled && m <= 16) { x.fillStyle = '#dc2626'; const am = (a0 + a1) / 2; x.beginPath(); x.arc(cx + Math.cos(am) * r * 0.6, cy + Math.sin(am) * r * 0.6, Math.max(2, r * 0.09), 0, 7); x.fill(); }
            }
        }
    }
    TD.act.convSwap = () => { const f = TD.$('#cf'), t = TD.$('#ct'); const v = f.value; f.value = t.value; t.value = v; f.dispatchEvent(new Event('change', { bubbles: true })); };
    TD.act.tgPractice = () => {
        const c = IMPL.tablegen.cur;
        if (!c || !Number.isInteger(c.n) || c.n < 1 || c.n > 10) { TD.ui.toast('Prática disponível de 1 a 10', 'Para outros números, use o Relâmpago', 'ℹ️'); return; }
        TD.learn.start({ kind: 'table', n: c.n, title: 'Tabuada do ' + c.n });
    };
})();
