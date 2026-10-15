/* ==========================================================================
   Tabuada Divertida 3.0 — Jogos em 3D (Three.js / WebGL)
   ========================================================================== */
'use strict';
(function () {
    const TD = window.TD, G = TD.games;
    const T3 = TD.t3 = {};

    /* ---------------- Carregamento do motor 3D (sob demanda) ---------------- */
    let loading = null;
    T3.load = function () {
        if (loading) return loading;
        const base = document.baseURI;
        loading = Promise.all([
            import(new URL('assets/vendor/three.module.min.js', base).href),
            import(new URL('assets/vendor/RoomEnvironment.js', base).href),
            document.fonts && document.fonts.load ? document.fonts.load('800 64px "Baloo 2"').catch(() => {}) : Promise.resolve()
        ]).then((r) => ({ THREE: r[0], RoomEnvironment: r[1].RoomEnvironment }))
            .catch((e) => { loading = null; throw e; });
        return loading;
    };

    /* ---------------- Cena base ---------------- */
    T3.setup = function (THREE, host, opts) {
        opts = opts || {};
        const canvas = document.createElement('canvas');
        canvas.className = 'gcv';
        host.prepend(canvas);
        const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: (window.devicePixelRatio || 1) < 2.5, powerPreference: 'high-performance', alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = opts.exposure || 1;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(opts.fov || 60, 1, 0.1, opts.far || 600);
        const S = { THREE: THREE, renderer: renderer, scene: scene, camera: camera, canvas: canvas, W: 1, H: 1, aspect: 1, textures: [], cache: {} };
        if (opts.env) {
            const pm = new THREE.PMREMGenerator(renderer);
            const envTex = pm.fromScene(new opts.env(), 0.04).texture;
            scene.environment = envTex;
            S.textures.push(envTex);
            pm.dispose();
        }
        S.resize = function () {
            S.W = host.clientWidth || window.innerWidth; S.H = host.clientHeight || window.innerHeight;
            S.aspect = S.W / S.H;
            renderer.setSize(S.W, S.H, false);
            camera.aspect = S.aspect;
            camera.updateProjectionMatrix();
            if (S.onResize) S.onResize();
        };
        S.resize();
        S.tex = function (cv, repeatX, repeatY) {
            const t = new THREE.CanvasTexture(cv);
            t.colorSpace = THREE.SRGBColorSpace;
            t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
            if (repeatX) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatX, repeatY || repeatX); }
            S.textures.push(t);
            return t;
        };
        S.dispose = function () {
            scene.traverse((o) => {
                if (o.geometry) o.geometry.dispose();
                if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
            });
            S.textures.forEach((t) => t.dispose());
            renderer.dispose();
            try { renderer.forceContextLoss(); } catch (e) {}
            canvas.remove();
        };
        return S;
    };

    /* ---------------- Texturas desenhadas em canvas ---------------- */
    function cvs(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    T3.label = function (S, text, style) {
        const key = style + ':' + text;
        if (S.cache[key]) return S.cache[key];
        const c = cvs(256, style === 'sign' ? 144 : 256), x = c.getContext('2d');
        const W = c.width, H = c.height, str = String(text);
        const fs = str.length >= 4 ? 82 : str.length === 3 ? 100 : 128;
        x.textAlign = 'center'; x.textBaseline = 'middle';
        if (style === 'rock' || style === 'rockGood' || style === 'rockBad') {
            const col = style === 'rockGood' ? '#22c55e' : style === 'rockBad' ? '#f43f5e' : '#7c5cff';
            const g = x.createRadialGradient(128, 128, 40, 128, 128, 128); g.addColorStop(0, col + 'ee'); g.addColorStop(0.62, col + 'aa'); g.addColorStop(1, col + '00');
            x.fillStyle = g; x.beginPath(); x.arc(128, 128, 128, 0, 7); x.fill();
            x.fillStyle = 'rgba(10,6,40,.72)'; x.beginPath(); x.arc(128, 128, 84, 0, 7); x.fill();
            x.lineWidth = 6; x.strokeStyle = 'rgba(255,255,255,.85)'; x.stroke();
            x.font = '800 ' + Math.round(fs * 0.78) + 'px "Baloo 2"'; x.fillStyle = '#fff'; x.fillText(str, 128, 136);
        } else if (style === 'sign' || style === 'signGood' || style === 'signBad') {
            const col = style === 'signGood' ? '#22c55e' : style === 'signBad' ? '#f43f5e' : '#22d3ee';
            x.fillStyle = 'rgba(14,6,40,.9)'; x.beginPath(); x.roundRect(6, 6, W - 12, H - 12, 22); x.fill();
            x.lineWidth = 8; x.strokeStyle = col; x.shadowColor = col; x.shadowBlur = 18; x.stroke(); x.shadowBlur = 0;
            x.font = '800 ' + Math.round(fs * 0.72) + 'px "Baloo 2"'; x.fillStyle = '#fff'; x.fillText(str, W / 2, H / 2 + 8);
        } else {
            x.font = '800 ' + fs + 'px "Baloo 2"';
            x.lineWidth = 16; x.lineJoin = 'round'; x.strokeStyle = 'rgba(20,10,50,.75)'; x.strokeText(str, 128, 140);
            x.fillStyle = '#fff'; x.fillText(str, 128, 140);
        }
        const t = S.tex(c);
        S.cache[key] = t;
        return t;
    };
    T3.glow = function (S, inner, outer) {
        const key = 'glow:' + inner + outer;
        if (S.cache[key]) return S.cache[key];
        const c = cvs(128, 128), x = c.getContext('2d');
        const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, inner || 'rgba(255,255,255,1)'); g.addColorStop(0.25, outer || 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, 128, 128);
        const t = S.tex(c);
        S.cache[key] = t;
        return t;
    };

    /* ---------------- Partículas (faíscas, explosões) ---------------- */
    T3.Sparks = function (S, cap) {
        const THREE = S.THREE;
        cap = cap || 700;
        const pos = new Float32Array(cap * 3), col = new Float32Array(cap * 3);
        const vel = new Float32Array(cap * 3), life = new Float32Array(cap), max = new Float32Array(cap), base = new Float32Array(cap * 3), grav = new Float32Array(cap);
        for (let i = 0; i < cap; i++) pos[i * 3 + 1] = -9999;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
        const mat = new THREE.PointsMaterial({ size: 0.5, map: T3.glow(S), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false });
        const pts = new THREE.Points(geo, mat);
        pts.frustumCulled = false;
        S.scene.add(pts);
        let head = 0;
        const tmp = new THREE.Color();
        return {
            points: pts,
            emit(p, n, colors, speed, lifeS, gravity, spread) {
                for (let k = 0; k < n; k++) {
                    const i = head; head = (head + 1) % cap;
                    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
                    const sp = (speed || 6) * (0.3 + Math.random() * 0.9);
                    vel[i * 3] = Math.cos(th) * s * sp; vel[i * 3 + 1] = u * sp * (spread || 1); vel[i * 3 + 2] = Math.sin(th) * s * sp;
                    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
                    tmp.set(colors[k % colors.length]);
                    base[i * 3] = tmp.r; base[i * 3 + 1] = tmp.g; base[i * 3 + 2] = tmp.b;
                    life[i] = max[i] = (lifeS || 0.9) * (0.6 + Math.random() * 0.6);
                    grav[i] = gravity || 0;
                }
            },
            stream(p, v, color, lifeS) {
                const i = head; head = (head + 1) % cap;
                pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
                vel[i * 3] = v.x; vel[i * 3 + 1] = v.y; vel[i * 3 + 2] = v.z;
                tmp.set(color); base[i * 3] = tmp.r; base[i * 3 + 1] = tmp.g; base[i * 3 + 2] = tmp.b;
                life[i] = max[i] = lifeS; grav[i] = 0;
            },
            update(dt) {
                for (let i = 0; i < cap; i++) {
                    if (life[i] <= 0) continue;
                    life[i] -= dt;
                    if (life[i] <= 0) { pos[i * 3 + 1] = -9999; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0; continue; }
                    const drag = 1 - 1.6 * dt;
                    vel[i * 3] *= drag; vel[i * 3 + 1] = vel[i * 3 + 1] * drag - grav[i] * dt; vel[i * 3 + 2] *= drag;
                    pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
                    const a = life[i] / max[i];
                    col[i * 3] = base[i * 3] * a; col[i * 3 + 1] = base[i * 3 + 1] * a; col[i * 3 + 2] = base[i * 3 + 2] * a;
                }
                geo.attributes.position.needsUpdate = true;
                geo.attributes.color.needsUpdate = true;
            }
        };
    };

    /* ---------------- Seleção por toque (em espaço de tela) ---------------- */
    T3.pick = function (S, list, cx, cy, slack) {
        const THREE = S.THREE, cam = S.camera, rect = S.canvas.getBoundingClientRect();
        const x = cx - rect.left, y = cy - rect.top;
        const v = new THREE.Vector3(), camPos = cam.position;
        const k = (S.H / 2) / Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
        let best = null, bestD = Infinity;
        list.forEach((it) => {
            it.obj.getWorldPosition(v);
            const dist = v.distanceTo(camPos);
            v.project(cam);
            if (v.z > 1) return;
            const sx = (v.x + 1) / 2 * S.W, sy = (1 - v.y) / 2 * S.H;
            const rad = it.r * k / dist + (slack || 22);
            const d = Math.hypot(sx - x, sy - y);
            if (d <= rad && dist < bestD) { best = it; bestD = dist; }
        });
        return best;
    };
    T3.screenPos = function (S, obj) {
        const v = new S.THREE.Vector3();
        obj.getWorldPosition(v); v.project(S.camera);
        const rect = S.canvas.getBoundingClientRect();
        return { x: rect.left + (v.x + 1) / 2 * S.W, y: rect.top + (1 - v.y) / 2 * S.H };
    };
    T3.loop = function (fn) { return G.loop(fn); };

    /* ======================================================================
       JOGO: Galáxia 3D
       ====================================================================== */
    G.register('galaxy', {
        name: 'Galáxia 3D', emoji: '🚀', desc: 'Pilote sua nave e destrua o asteroide com a resposta certa!', art: 'galaxy', tag: '3D', ops: true, lives: 3,
        how: [['👆', 'Toque no asteroide com a resposta certa'], ['🛡️', 'Errou ou deixou passar? Perde um escudo'], ['🔥', 'Acertos seguidos fazem combo']],
        coins: (s) => Math.min(150, s * 3),
        create(host, api) { return T3.load().then((M) => galaxy(M.THREE, M.RoomEnvironment, host, api)); }
    });

    function galaxy(THREE, RoomEnvironment, host, api) {
        const S = T3.setup(THREE, host, { env: RoomEnvironment, fov: 62, far: 700 });
        const scene = S.scene, camera = S.camera;
        scene.background = new THREE.Color(0x070424);
        scene.fog = new THREE.FogExp2(0x070424, 0.0095);
        const cam = { z: 14, y: 4 };
        const look = new THREE.Vector3(0, 1.0, -16);
        S.onResize = () => { const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * S.aspect; const d = TD.clamp(3.4 / tanH, 7, 13); cam.z = 4.2 + d; cam.y = 3 + d * 0.12; };
        S.onResize();
        camera.position.set(0, cam.y, cam.z);
        scene.add(new THREE.HemisphereLight(0xc0b0ff, 0x1c0840, 1.2));
        const key = new THREE.DirectionalLight(0xfff1e0, 2.8); key.position.set(6, 10, 8); scene.add(key);
        const rimA = new THREE.PointLight(0xff3fd1, 60, 60, 2); rimA.position.set(-9, 4, -6); scene.add(rimA);
        const rimB = new THREE.PointLight(0x22d3ee, 45, 60, 2); rimB.position.set(9, 2, -1); scene.add(rimB);
        const flashL = new THREE.PointLight(0xffb347, 0, 40, 2); scene.add(flashL);

        // Nebulosa ao fundo
        (function () {
            const c = cvs(1024, 512), x = c.getContext('2d');
            x.fillStyle = '#070424'; x.fillRect(0, 0, 1024, 512);
            const blobs = [['#7c3aed', 300, 260, 340], ['#db2777', 700, 200, 300], ['#0891b2', 520, 380, 260], ['#4f46e5', 150, 120, 220], ['#c026d3', 880, 380, 220]];
            blobs.forEach((b) => { const g = x.createRadialGradient(b[1], b[2], 0, b[1], b[2], b[3]); g.addColorStop(0, b[0] + 'aa'); g.addColorStop(1, b[0] + '00'); x.fillStyle = g; x.fillRect(0, 0, 1024, 512); });
            for (let i = 0; i < 500; i++) { x.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.9 + ')'; x.fillRect(Math.random() * 1024, Math.random() * 512, Math.random() < 0.1 ? 2 : 1, Math.random() < 0.1 ? 2 : 1); }
            const m = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1000), new THREE.MeshBasicMaterial({ map: S.tex(c), fog: false, depthWrite: false }));
            m.position.set(0, -40, -360);
            scene.add(m);
        })();
        // Planeta com anéis
        const planet = new THREE.Group();
        (function () {
            const c = cvs(512, 256), x = c.getContext('2d');
            const cols = ['#ffb38a', '#f97316', '#fdba74', '#ea580c', '#fed7aa', '#c2410c', '#fb923c'];
            for (let y = 0; y < 256; y += 4) { x.fillStyle = cols[Math.floor((Math.sin(y * 0.07) + Math.sin(y * 0.023) + 2) * 1.7) % cols.length]; x.fillRect(0, y, 512, 4); }
            for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.12 + ')'; x.fillRect(0, Math.random() * 256, 512, Math.random() * 6); }
            const sph = new THREE.Mesh(new THREE.SphereGeometry(26, 48, 32), new THREE.MeshStandardMaterial({ map: S.tex(c), roughness: 0.85, metalness: 0, fog: false }));
            planet.add(sph);
            const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T3.glow(S, 'rgba(255,170,120,.9)', 'rgba(255,120,80,.35)'), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
            glow.scale.set(84, 84, 1); planet.add(glow);
            const ring = new THREE.Mesh(new THREE.RingGeometry(34, 52, 96), new THREE.MeshBasicMaterial({ color: 0xffd9b8, side: THREE.DoubleSide, transparent: true, opacity: 0.38, fog: false, depthWrite: false }));
            ring.rotation.x = -1.25; ring.rotation.y = 0.25; planet.add(ring);
            planet.position.set(-58, 26, -210);
            scene.add(planet);
            const moon = new THREE.Mesh(new THREE.SphereGeometry(7, 32, 24), new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.9, fog: false }));
            moon.position.set(48, 34, -170); scene.add(moon);
        })();
        // Campo de estrelas em movimento
        const NS = 1500, sp = new Float32Array(NS * 3), sc = new Float32Array(NS * 3);
        const tint = [[1, 1, 1], [0.7, 0.8, 1], [1, 0.75, 0.95], [0.8, 1, 1]];
        for (let i = 0; i < NS; i++) {
            sp[i * 3] = (Math.random() - 0.5) * 160; sp[i * 3 + 1] = (Math.random() - 0.5) * 90 + 8; sp[i * 3 + 2] = -Math.random() * 260 + 15;
            const t = tint[i % 4], b = 0.5 + Math.random() * 0.5; sc[i * 3] = t[0] * b; sc[i * 3 + 1] = t[1] * b; sc[i * 3 + 2] = t[2] * b;
        }
        const sGeo = new THREE.BufferGeometry();
        sGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3).setUsage(THREE.DynamicDrawUsage));
        sGeo.setAttribute('color', new THREE.BufferAttribute(sc, 3));
        const stars = new THREE.Points(sGeo, new THREE.PointsMaterial({ size: 0.42, map: T3.glow(S), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
        stars.frustumCulled = false;
        scene.add(stars);

        // Nave
        const ship = new THREE.Group();
        const hull = new THREE.MeshStandardMaterial({ color: 0xeeeaff, metalness: 0.75, roughness: 0.22 });
        const accent = new THREE.MeshStandardMaterial({ color: 0x7c5cff, metalness: 0.55, roughness: 0.3, emissive: 0x2a1680, emissiveIntensity: 0.6 });
        const dark = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.6, roughness: 0.4 });
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.7, 8, 16), hull); body.rotation.x = Math.PI / 2; ship.add(body);
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.2, 16), accent); nose.rotation.x = -Math.PI / 2; nose.position.z = -1.55; ship.add(nose);
        const wingShape = new THREE.Shape(); wingShape.moveTo(0, 0.6); wingShape.lineTo(2.3, -0.5); wingShape.lineTo(2.3, -0.95); wingShape.lineTo(0, -0.7); wingShape.closePath();
        const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
        const wR = new THREE.Mesh(wingGeo, accent); wR.rotation.x = -Math.PI / 2; wR.position.set(0.2, -0.05, 0.4); ship.add(wR);
        const wL = new THREE.Mesh(wingGeo, accent); wL.rotation.x = -Math.PI / 2; wL.scale.x = -1; wL.position.set(-0.2, -0.05, 0.4); ship.add(wL);
        const finGeo = new THREE.BoxGeometry(0.08, 0.7, 0.8);
        [-1, 1].forEach((s) => { const f = new THREE.Mesh(finGeo, hull); f.position.set(s * 2.35, 0.25, 1.1); f.rotation.z = s * -0.2; ship.add(f); });
        const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x67e8f9, metalness: 0.1, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.88, emissive: 0x0e7490, emissiveIntensity: 0.5 }));
        cockpit.scale.set(1, 0.9, 1.9); cockpit.position.set(0, 0.28, -0.55); ship.add(cockpit);
        const engines = [];
        [-0.75, 0.75].forEach((x) => {
            const e = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.9, 16), dark); e.rotation.x = Math.PI / 2; e.position.set(x, -0.05, 1.2); ship.add(e);
            const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.4, 12), new THREE.MeshBasicMaterial({ color: 0x7df9ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
            flame.rotation.x = Math.PI / 2; flame.position.set(x, -0.05, 2.25); ship.add(flame);
            const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: T3.glow(S, 'rgba(180,250,255,1)', 'rgba(34,211,238,.5)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
            gl.scale.set(1.6, 1.6, 1); gl.position.set(x, -0.05, 1.75); ship.add(gl);
            engines.push({ flame: flame, glow: gl });
        });
        [[-2.35, 0xff3b5c], [2.35, 0x34ff8a]].forEach((k) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshBasicMaterial({ color: k[1] })); l.position.set(k[0], 0.65, 1.35); ship.add(l); });
        ship.position.set(0, 0.2, 4.2);
        ship.scale.setScalar(0.62);
        scene.add(ship);

        // Asteroides
        const rockGeos = [], rockMats = [];
        for (let s = 0; s < 5; s++) {
            const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position, v = new THREE.Vector3(), seed = s * 13.7 + 1;
            for (let i = 0; i < p.count; i++) {
                v.fromBufferAttribute(p, i);
                const n = 1 + 0.2 * Math.sin(v.x * 3.1 + seed) * Math.cos(v.y * 2.3 + seed * 1.7) + 0.13 * Math.sin(v.z * 4.7 + seed * 2.3) + 0.06 * Math.sin((v.x + v.y) * 9 + seed);
                v.multiplyScalar(n); p.setXYZ(i, v.x, v.y, v.z);
            }
            g.computeVertexNormals();
            rockGeos.push(g);
        }
        [0x8a7a6e, 0x6e6a7e, 0x9b8571, 0x7a6f8f, 0x5f5a66].forEach((c) => rockMats.push(new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0.08, flatShading: true })));
        const debrisGeo = new THREE.IcosahedronGeometry(0.22, 0);
        const sparks = T3.Sparks(S, 900);
        let rocks = [], debris = [], lasers = [], wave = null, playing = false, paused = false, speed = 6, shake = 0, targetX = 0, warp = 1, waveTimer = null, t = 0;

        function makeRock(val, correct) {
            const grp = new THREE.Group();
            const mesh = new THREE.Mesh(TD.pick(rockGeos), TD.pick(rockMats));
            const sc = 1.35 + Math.random() * 0.35;
            mesh.scale.set(sc, sc * (0.85 + Math.random() * 0.3), sc);
            grp.add(mesh);
            const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: T3.label(S, val, 'rock'), depthTest: false, transparent: true }));
            lab.renderOrder = 10; lab.scale.set(2.9, 2.9, 1); lab.position.set(0, 0, 0.6);
            grp.add(lab);
            scene.add(grp);
            return { group: grp, mesh: mesh, label: lab, val: val, correct: correct, state: 'fly', spin: new THREE.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.2), r: 1.6 * sc, obj: grp, k: 1 };
        }
        function removeRock(r) { scene.remove(r.group); r.label.material.dispose(); r.dead = true; }
        function newWave() {
            if (!playing) return;
            const q = api.q();
            wave = { q: q, done: false, t0: performance.now() };
            api.question(q.text + ' = ?');
            const n = api.age === 'kid' ? 3 : 4;
            const vals = api.options(q, n);
            const z0 = -46, halfW = (cam.z - z0) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * S.aspect;
            const spread = Math.min(halfW * 0.7, 14);
            const xs = vals.map((_, i) => -spread + 2 * spread * (i / (n - 1)));
            TD.shuffle(xs);
            vals.forEach((v, i) => {
                const r = makeRock(v, v === q.ans);
                r.x0 = xs[i] + (Math.random() - 0.5) * 0.5; r.y0 = 1.6 + Math.random() * 3.6; r.z0 = z0 - i * 1.5 - Math.random() * 2;
                r.group.position.set(r.x0, r.y0, r.z0);
                rocks.push(r);
            });
            speed = (api.age === 'kid' ? 5.2 : api.age === 'teen' ? 6.6 : 7.6) + Math.min(7, api.score * 0.2);
        }
        function explode(r, good) {
            const p = r.group.position.clone();
            sparks.emit(p, 90, good ? ['#fff7c2', '#fbbf24', '#fb923c', '#ffffff'] : ['#fb7185', '#f43f5e', '#ffffff'], 11, 1.0, 0);
            sparks.emit(p, 30, ['#a78bfa', '#22d3ee'], 5, 1.4, 0);
            for (let i = 0; i < 9; i++) {
                const d = new THREE.Mesh(debrisGeo, r.mesh.material);
                d.position.copy(p);
                d.userData.v = new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
                d.userData.s = new THREE.Vector3(Math.random() * 6, Math.random() * 6, 0);
                d.userData.life = 1.1;
                scene.add(d); debris.push(d);
            }
            flashL.position.copy(p); flashL.intensity = 400; flashL.color.set(good ? 0xffb347 : 0xff4d6d);
            shake = good ? 0.35 : 0.55;
            TD.sfx('boom'); TD.buzz(good ? 'medium' : 'heavy');
            removeRock(r);
        }
        function laser(to) {
            const from = new THREE.Vector3(); ship.getWorldPosition(from); from.z -= 1.6; from.y += 0.1;
            const dir = new THREE.Vector3().subVectors(to, from), len = dir.length();
            [[0.09, 0x7df9ff, 0.9], [0.035, 0xffffff, 1]].forEach((k) => {
                const m = new THREE.Mesh(new THREE.CylinderGeometry(k[0], k[0], 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: k[1], transparent: true, opacity: k[2], blending: THREE.AdditiveBlending, depthWrite: false }));
                m.scale.y = len; m.position.copy(from).addScaledVector(dir, 0.5);
                m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
                m.userData.life = 0.2; scene.add(m); lasers.push(m);
            });
            TD.sfx('laser');
        }
        function resolveOthers(exceptCorrect) {
            rocks.forEach((r) => { if (!r.dead && r.state === 'fly' && !(exceptCorrect && r.correct)) r.state = 'fade'; });
        }
        function onTap(e) {
            if (!playing || paused || !wave || wave.done) return;
            const list = rocks.filter((r) => !r.dead && r.state === 'fly');
            const hit = T3.pick(S, list, e.clientX, e.clientY, 26);
            if (!hit) return;
            const ms = performance.now() - wave.t0;
            targetX = TD.clamp(hit.group.position.x * 0.45, -3, 3);
            laser(hit.group.position.clone());
            wave.done = true;
            const sp = T3.screenPos(S, hit.group);
            if (hit.correct) {
                setTimeout(() => explode(hit, true), 90);
                const st = api.answered(wave.q, true, ms);
                api.addScore(1, sp.x, sp.y - 30, st >= 3 ? '+1 combo!' : '+1');
                api.combo(st); TD.sfx('correct');
                resolveOthers(false);
                waveTimer = setTimeout(newWave, 900);
            } else {
                setTimeout(() => explode(hit, false), 90);
                api.answered(wave.q, false, ms);
                TD.sfx('wrong');
                TD.ui.floatText(sp.x, sp.y - 30, 'Era ' + wave.q.ans + '!', '#4ade80');
                rocks.forEach((r) => { if (!r.dead && r.correct) { r.state = 'hl'; r.label.material.map = T3.label(S, r.val, 'rockGood'); } else if (!r.dead && r !== hit) r.state = 'fade'; });
                setTimeout(() => rocks.forEach((r) => { if (!r.dead && r.state === 'hl') r.state = 'fade'; }), 1300);
                if (api.loseLife() > 0) waveTimer = setTimeout(newWave, 1600);
            }
        }
        S.canvas.addEventListener('pointerdown', onTap);
        function update(dt) {
            t += dt;
            const sw = playing && !paused ? 1 : 0.25;
            warp += ((playing ? 1 + Math.min(1.5, api.score * 0.05) : 0.4) - warp) * dt * 2;
            const pa = sGeo.attributes.position.array, adv = (14 * warp) * dt;
            for (let i = 0; i < NS; i++) { pa[i * 3 + 2] += adv; if (pa[i * 3 + 2] > 15) { pa[i * 3 + 2] -= 275; pa[i * 3] = (Math.random() - 0.5) * 160; pa[i * 3 + 1] = (Math.random() - 0.5) * 90 + 8; } }
            sGeo.attributes.position.needsUpdate = true;
            planet.rotation.y += dt * 0.02;
            ship.position.x += (targetX - ship.position.x) * Math.min(1, dt * 4);
            ship.rotation.z = (ship.position.x - targetX) * 0.35 + Math.sin(t * 1.3) * 0.04;
            ship.position.y = 0.2 + Math.sin(t * 2) * 0.12;
            engines.forEach((e, i) => { const f = 0.8 + Math.random() * 0.4 + warp * 0.2; e.flame.scale.set(1, f, 1); e.glow.scale.setScalar(1.4 + Math.random() * 0.4); });
            if (playing && !paused && wave) {
                rocks.forEach((r) => {
                    if (r.dead) return;
                    r.mesh.rotation.x += r.spin.x * dt; r.mesh.rotation.y += r.spin.y * dt; r.mesh.rotation.z += r.spin.z * dt;
                    if (r.state === 'fade') { r.k *= 1 - dt * 4; r.group.scale.setScalar(r.k); r.group.position.z += speed * dt; if (r.k < 0.05) removeRock(r); return; }
                    r.group.position.z += speed * dt * sw;
                    const k = TD.clamp((ship.position.z - r.group.position.z) / (ship.position.z - r.z0), 0, 1);
                    r.group.position.x = r.x0 * Math.max(0.35, k);
                    r.group.position.y = 0.8 + (r.y0 - 0.8) * Math.max(0.3, k);
                    if (r.state === 'hl') { const s = 1 + Math.sin(t * 14) * 0.12; r.label.scale.set(2.5 * s, 2.5 * s, 1); }
                    if (r.correct && !wave.done && r.group.position.z > 3.8) {
                        wave.done = true;
                        api.answered(wave.q, false, 9000);
                        TD.sfx('wrong'); shake = 0.5;
                        const sp = T3.screenPos(S, r.group);
                        TD.ui.floatText(S.W / 2 - 40, S.H * 0.45, 'Era ' + wave.q.ans + '!', '#fbbf24');
                        resolveOthers(false);
                        if (api.loseLife() > 0) waveTimer = setTimeout(newWave, 1200);
                    }
                    if (r.group.position.z > 16) removeRock(r);
                });
                rocks = rocks.filter((r) => !r.dead);
            }
            debris.forEach((d) => { d.userData.life -= dt; d.position.addScaledVector(d.userData.v, dt); d.rotation.x += d.userData.s.x * dt; d.rotation.y += d.userData.s.y * dt; d.scale.setScalar(Math.max(0.01, d.userData.life)); if (d.userData.life <= 0) { scene.remove(d); d.dead = true; } });
            debris = debris.filter((d) => !d.dead);
            lasers.forEach((l) => { l.userData.life -= dt; l.material.opacity = Math.max(0, l.userData.life / 0.2); if (l.userData.life <= 0) { scene.remove(l); l.geometry.dispose(); l.material.dispose(); l.dead = true; } });
            lasers = lasers.filter((l) => !l.dead);
            sparks.update(dt);
            flashL.intensity *= Math.max(0, 1 - dt * 7);
            shake = Math.max(0, shake - dt * 1.4);
            camera.position.set(Math.sin(t * 0.4) * 0.3 + (Math.random() - 0.5) * shake, cam.y + (Math.random() - 0.5) * shake, cam.z);
            camera.lookAt(look);
        }
        const loop = T3.loop((dt) => { update(paused ? 0 : dt); S.renderer.render(scene, camera); });
        return {
            start() { clearTimeout(waveTimer); rocks.forEach(removeRock); rocks = []; playing = true; paused = false; newWave(); },
            pause() { paused = true; },
            resume() { paused = false; },
            revive() { clearTimeout(waveTimer); rocks.forEach(removeRock); rocks = []; paused = false; playing = true; newWave(); },
            resize() { S.resize(); },
            destroy() { clearTimeout(waveTimer); loop.stop(); S.canvas.removeEventListener('pointerdown', onTap); S.dispose(); }
        };
    }

    /* ======================================================================
       JOGO: Corrida Neon 3D
       ====================================================================== */
    G.register('racer', {
        name: 'Corrida Neon 3D', emoji: '🏎️', desc: 'Passe pelo portal com a resposta certa em alta velocidade!', art: 'racer', tag: '3D', ops: true, lives: 3, unit: 'portais',
        how: [['👆', 'Toque no lado da pista ou deslize para trocar de faixa'], ['🚪', 'Passe pelo portal com o resultado certo'], ['🪙', 'Pegue as moedas no caminho']],
        coins: (s, run) => Math.min(160, s * 3 + (run.extra.coins || 0)),
        create(host, api) { return T3.load().then((M) => racer(M.THREE, M.RoomEnvironment, host, api)); }
    });

    function racer(THREE, RoomEnvironment, host, api) {
        const S = T3.setup(THREE, host, { env: RoomEnvironment, fov: 64, far: 520, exposure: 1.05 });
        const scene = S.scene, camera = S.camera;
        // Céu e sol
        (function () {
            const c = cvs(16, 512), x = c.getContext('2d');
            const g = x.createLinearGradient(0, 0, 0, 512);
            g.addColorStop(0, '#0d0326'); g.addColorStop(0.35, '#3b0a6b'); g.addColorStop(0.6, '#a21caf'); g.addColorStop(0.78, '#fb7185'); g.addColorStop(0.92, '#fdba74'); g.addColorStop(1, '#fde68a');
            x.fillStyle = g; x.fillRect(0, 0, 16, 512);
            scene.background = S.tex(c);
        })();
        scene.fog = new THREE.Fog(0xb5308f, 60, 260);
        const sunC = cvs(512, 512), sx = sunC.getContext('2d');
        const sg = sx.createLinearGradient(0, 0, 0, 512); sg.addColorStop(0, '#fff3a3'); sg.addColorStop(0.5, '#fdba74'); sg.addColorStop(1, '#f472b6');
        sx.fillStyle = sg; sx.beginPath(); sx.arc(256, 256, 250, 0, 7); sx.fill();
        sx.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 8; i++) sx.fillRect(0, 290 + i * 28, 512, 4 + i * 2.2);
        const sun = new THREE.Mesh(new THREE.CircleGeometry(70, 64), new THREE.MeshBasicMaterial({ map: S.tex(sunC), transparent: true, fog: false, depthWrite: false }));
        sun.position.set(0, 46, -420); scene.add(sun);
        const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T3.glow(S, 'rgba(255,200,150,.8)', 'rgba(255,90,170,.3)'), blending: THREE.AdditiveBlending, fog: false, depthWrite: false, transparent: true }));
        sunGlow.scale.set(320, 320, 1); sunGlow.position.set(0, 46, -430); scene.add(sunGlow);

        scene.add(new THREE.HemisphereLight(0xffc6e8, 0x2a0b4a, 1.5));
        const back = new THREE.DirectionalLight(0xffb27a, 2.0); back.position.set(-8, 14, -30); scene.add(back);
        const front = new THREE.DirectionalLight(0x9ab8ff, 1.3); front.position.set(6, 10, 14); scene.add(front);

        // Chão com grade neon
        const gridC = cvs(128, 128), gx = gridC.getContext('2d');
        gx.fillStyle = '#000'; gx.fillRect(0, 0, 128, 128); gx.strokeStyle = '#ff3fb4'; gx.lineWidth = 3; gx.strokeRect(0, 0, 128, 128);
        const gridTex = S.tex(gridC, 70, 70);
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshStandardMaterial({ color: 0x14052e, roughness: 0.9, emissive: 0xffffff, emissiveMap: gridTex, emissiveIntensity: 0.9 }));
        ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.03, -200); scene.add(ground);
        // Estrada
        const rC = cvs(256, 256), rx = rC.getContext('2d');
        rx.fillStyle = '#1d1433'; rx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 1400; i++) { rx.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.06 + ')'; rx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
        const eC = cvs(256, 256), ex = eC.getContext('2d');
        ex.fillStyle = '#000'; ex.fillRect(0, 0, 256, 256);
        [rx, ex].forEach((k, j) => {
            k.fillStyle = '#ff3fb4'; k.fillRect(6, 0, 7, 256); k.fillRect(243, 0, 7, 256);
            k.fillStyle = j ? '#22d3ee' : '#bdf6ff'; k.fillRect(83, 0, 5, 120); k.fillRect(168, 0, 5, 120);
        });
        const roadTex = S.tex(rC, 1, 50), roadEmi = S.tex(eC, 1, 50);
        const road = new THREE.Mesh(new THREE.PlaneGeometry(8, 700), new THREE.MeshStandardMaterial({ map: roadTex, emissive: 0xffffff, emissiveMap: roadEmi, emissiveIntensity: 1.2, roughness: 0.55, metalness: 0.25 }));
        road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -200); scene.add(road);
        [-4.2, 4.2].forEach((x) => { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 700), new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1.6 })); rail.position.set(x, 0.15, -200); scene.add(rail); });
        // Montanhas low-poly com contorno neon
        const mMat = new THREE.MeshStandardMaterial({ color: 0x2e0a57, roughness: 1, flatShading: true });
        for (let i = 0; i < 14; i++) {
            const side = i % 2 ? 1 : -1, h = 30 + Math.random() * 50;
            const geo = new THREE.ConeGeometry(20 + Math.random() * 25, h, 4 + (i % 3), 1);
            const m = new THREE.Mesh(geo, mMat);
            m.position.set(side * (40 + Math.random() * 120), h / 2 - 2, -230 - Math.random() * 90);
            m.rotation.y = Math.random() * 3;
            scene.add(m);
            const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.55 }));
            edges.position.copy(m.position); edges.rotation.copy(m.rotation); scene.add(edges);
        }
        // Postes e palmeiras
        const props = [];
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x3b1a6b, roughness: 0.6 });
        const bulbMat = new THREE.MeshBasicMaterial({ color: 0xbdf6ff });
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x1a0b33, roughness: 0.9 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x0b2b2b, roughness: 0.8, emissive: 0x06302f, emissiveIntensity: 0.6, side: THREE.DoubleSide });
        for (let i = 0; i < 16; i++) {
            const g = new THREE.Group(), side = i % 2 ? 1 : -1;
            if ((i >> 1) % 2 === 0) {
                const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5.5, 8), poleMat); p.position.y = 2.75; g.add(p);
                const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), poleMat); arm.position.set(-side * 0.6, 5.4, 0); g.add(arm);
                const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), bulbMat); bulb.position.set(-side * 1.2, 5.3, 0); g.add(bulb);
                const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: T3.glow(S, 'rgba(200,250,255,1)', 'rgba(34,211,238,.45)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
                gl.scale.set(3, 3, 1); gl.position.copy(bulb.position); g.add(gl);
            } else {
                for (let s = 0; s < 6; s++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.16 - s * 0.012, 0.19 - s * 0.012, 1.05, 7), trunkMat); seg.position.set(side * s * s * 0.025, 0.5 + s * 1.0, 0); g.add(seg); }
                for (let l = 0; l < 7; l++) {
                    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), leafMat);
                    leaf.position.set(side * 0.9, 6.1, 0); leaf.rotation.set(-0.5, l / 7 * Math.PI * 2, -0.35);
                    leaf.translateX(1.1); g.add(leaf);
                }
            }
            g.position.set(side * (5.6 + Math.random() * 1.2), 0, -i * 16);
            scene.add(g); props.push(g);
        }
        // Carro esportivo
        const car = new THREE.Group();
        const paint = new THREE.MeshPhysicalMaterial({ color: 0xff2e88, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06 });
        const glass = new THREE.MeshPhysicalMaterial({ color: 0x120c2e, metalness: 0.9, roughness: 0.06, clearcoat: 1 });
        const blackM = new THREE.MeshStandardMaterial({ color: 0x0b0b14, roughness: 0.7 });
        const rimM = new THREE.MeshStandardMaterial({ color: 0xd8dcf0, metalness: 1, roughness: 0.2 });
        const lowShape = new THREE.Shape();
        [[-2.05, 0.28], [-2.1, 0.7], [-1.6, 0.86], [1.25, 0.86], [2.15, 0.62], [2.2, 0.36], [2.05, 0.28]].forEach((p, i) => i ? lowShape.lineTo(p[0], p[1]) : lowShape.moveTo(p[0], p[1]));
        const lowGeo = new THREE.ExtrudeGeometry(lowShape, { depth: 1.7, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3, curveSegments: 6 });
        lowGeo.translate(0, 0, -0.85); lowGeo.rotateY(Math.PI / 2);
        car.add(new THREE.Mesh(lowGeo, paint));
        const cabShape = new THREE.Shape();
        [[-1.45, 0.84], [-0.85, 1.34], [0.35, 1.34], [1.05, 0.84]].forEach((p, i) => i ? cabShape.lineTo(p[0], p[1]) : cabShape.moveTo(p[0], p[1]));
        const cabGeo = new THREE.ExtrudeGeometry(cabShape, { depth: 1.36, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 });
        cabGeo.translate(0, 0, -0.68); cabGeo.rotateY(Math.PI / 2);
        car.add(new THREE.Mesh(cabGeo, glass));
        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 1.0), paint); roof.position.set(0, 1.38, 0.25); car.add(roof);
        const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.42), blackM); spoiler.position.set(0, 1.12, 1.95); car.add(spoiler);
        [-0.6, 0.6].forEach((x) => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.12), blackM); s.position.set(x, 0.95, 1.95); car.add(s); });
        const tailMat = new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 2.5 });
        const tail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.05), tailMat); tail.position.set(0, 0.68, 2.2); car.add(tail);
        const wheels = [];
        [[-0.92, 1.3], [0.92, 1.3], [-0.92, -1.25], [0.92, -1.25]].forEach((w) => {
            const wg = new THREE.Group();
            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.34, 24), blackM); tire.rotation.z = Math.PI / 2; wg.add(tire);
            const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.36, 10), rimM); rim.rotation.z = Math.PI / 2; wg.add(rim);
            wg.position.set(w[0], 0.4, w[1]); car.add(wg); wheels.push(wg);
        });
        const under = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 5), new THREE.MeshBasicMaterial({ map: T3.glow(S, 'rgba(120,240,255,.9)', 'rgba(34,211,238,.4)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        under.rotation.x = -Math.PI / 2; under.position.y = 0.03; car.add(under);
        car.scale.setScalar(0.78);
        scene.add(car);
        const cam = { z: 11, y: 4.2 };
        S.onResize = () => { const tanH = Math.tan(THREE.MathUtils.degToRad(64 / 2)) * S.aspect; const d = TD.clamp(4.4 / tanH, 7.5, 13); cam.z = d; cam.y = 2.6 + d * 0.13; };
        S.onResize();

        const LANES = [-2.6, 0, 2.6];
        const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 24);
        const coinMat = new THREE.MeshStandardMaterial({ color: 0xffc83d, metalness: 1, roughness: 0.25, emissive: 0x7a4b00, emissiveIntensity: 0.6 });
        const postMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1.5 });
        const sparks = T3.Sparks(S, 700);
        let lane = 1, carX = 0, speed = 0, baseSpeed = 20, dist = 0, playing = false, paused = false, gate = null, coins = [], shake = 0, fovKick = 0, wobble = 0, t = 0, gateTimer = null, slow = 0;

        function makeGate() {
            if (!playing) return;
            const q = api.q();
            const vals = api.options(q, 3);
            const grp = new THREE.Group(), signs = [];
            vals.forEach((v, i) => {
                const x = LANES[i];
                [-1.08, 1.08].forEach((o) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.0, 0.14), postMat); p.position.set(x + o, 1.5, 0); grp.add(p); });
                const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.15, 1.2), new THREE.MeshBasicMaterial({ map: T3.label(S, v, 'sign'), transparent: true, fog: false }));
                sign.position.set(x, 3.05, 0); grp.add(sign);
                signs.push({ mesh: sign, val: v, correct: v === q.ans, lane: i });
            });
            grp.position.z = -170;
            scene.add(grp);
            gate = { grp: grp, signs: signs, q: q, done: false, t0: performance.now() };
            api.question(q.text + ' = ?');
            // moedas entre portais
            const cl = TD.rand(0, 2);
            for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(coinGeo, coinMat); c.rotation.x = Math.PI / 2; c.position.set(LANES[cl], 0.9, -95 - i * 4); c.userData.lane = cl; scene.add(c); coins.push(c); }
        }
        function setLane(n) {
            n = TD.clamp(n, 0, 2);
            if (n === lane) return;
            wobble = (n - lane) * 0.5;
            lane = n; TD.sfx('whoosh'); TD.buzz('light');
        }
        let downX = 0, downY = 0, downT = 0;
        const onDown = (e) => { downX = e.clientX; downY = e.clientY; downT = performance.now(); };
        const onUp = (e) => {
            if (!playing || paused) return;
            const dx = e.clientX - downX;
            if (Math.abs(dx) > 40 && performance.now() - downT < 600) setLane(lane + (dx > 0 ? 1 : -1));
            else { const r = S.canvas.getBoundingClientRect(), x = (e.clientX - r.left) / r.width; setLane(x < 0.36 ? 0 : x > 0.64 ? 2 : 1); }
        };
        S.canvas.addEventListener('pointerdown', onDown);
        S.canvas.addEventListener('pointerup', onUp);
        const onKey = (e) => { if (e.key === 'ArrowLeft') setLane(lane - 1); if (e.key === 'ArrowRight') setLane(lane + 1); };
        window.addEventListener('keydown', onKey);

        function update(dt) {
            t += dt;
            const target = playing ? baseSpeed + Math.min(24, api.score * 0.7) : 9;
            slow = Math.max(0, slow - dt);
            speed += ((slow > 0 ? target * 0.45 : target) - speed) * Math.min(1, dt * 1.5);
            const adv = speed * dt;
            dist += adv;
            roadTex.offset.y = roadEmi.offset.y = (roadTex.offset.y + adv / 14) % 1;
            gridTex.offset.y = (gridTex.offset.y + adv / 10) % 1;
            props.forEach((p) => { p.position.z += adv; if (p.position.z > 12) p.position.z -= 16 * 16; });
            carX += (LANES[lane] - carX) * Math.min(1, dt * 9);
            car.position.x = carX;
            wobble *= Math.max(0, 1 - dt * 5);
            car.rotation.y = -wobble * 0.5 + Math.sin(t * 30) * (slow > 0 ? 0.05 : 0);
            car.rotation.z = (carX - LANES[lane]) * 0.06;
            car.position.y = Math.sin(t * 18) * 0.015;
            wheels.forEach((w) => { w.children[0].rotation.x += adv / 0.4; w.children[1].rotation.x += adv / 0.4; });
            if (gate && playing && !paused) {
                gate.grp.position.z += adv;
                if (!gate.done && gate.grp.position.z >= -0.4) {
                    gate.done = true;
                    const ms = performance.now() - gate.t0;
                    const sign = gate.signs[lane];
                    const wp = new THREE.Vector3(LANES[lane], 3.2, gate.grp.position.z);
                    if (sign.correct) {
                        const st = api.answered(gate.q, true, ms);
                        const sp = T3.screenPos(S, sign.mesh);
                        api.addScore(1, sp.x, sp.y, st >= 3 ? '+1 combo!' : '+1'); api.combo(st);
                        TD.sfx('correct'); TD.buzz('success');
                        sparks.emit(wp, 70, ['#bdf6ff', '#22d3ee', '#fde047', '#ffffff'], 9, 0.9, 4);
                        fovKick = 12;
                        sign.mesh.material.map = T3.label(S, sign.val, 'signGood');
                    } else {
                        api.answered(gate.q, false, ms);
                        TD.sfx('crash'); shake = 0.6; slow = 1.2; wobble = 1.2;
                        sparks.emit(new THREE.Vector3(carX, 0.8, 0), 60, ['#fb7185', '#ffffff', '#fbbf24'], 8, 0.8, 6);
                        gate.signs.forEach((s) => { s.mesh.material.map = T3.label(S, s.val, s.correct ? 'signGood' : 'signBad'); });
                        TD.ui.floatText(S.W / 2 - 40, S.H * 0.4, 'Era ' + gate.q.ans + '!', '#4ade80');
                        if (api.loseLife() <= 0) return;
                    }
                }
                if (gate.grp.position.z > 14) {
                    scene.remove(gate.grp);
                    gate.grp.traverse((o) => { if (o.material && o.material !== postMat) o.material.dispose(); if (o.geometry) o.geometry.dispose(); });
                    gate = null;
                    clearTimeout(gateTimer); gateTimer = setTimeout(makeGate, 250);
                }
            }
            coins.forEach((c) => {
                c.position.z += adv; c.rotation.z += dt * 4;
                if (!c.got && Math.abs(c.position.z) < 1.1 && c.userData.lane === lane && playing) {
                    c.got = true; api.extra.coins = (api.extra.coins || 0) + 1;
                    TD.sfx('coin'); sparks.emit(c.position, 14, ['#fde047', '#fff7c2'], 4, 0.6, 2);
                }
                if (c.got) c.scale.multiplyScalar(0.8);
                if (c.position.z > 12 || (c.got && c.scale.x < 0.05)) { scene.remove(c); c.dead = true; }
            });
            coins = coins.filter((c) => !c.dead);
            if (speed > 24 && playing) for (let i = 0; i < 2; i++) sparks.stream(new THREE.Vector3((Math.random() - 0.5) * 16, Math.random() * 6, -30), new THREE.Vector3(0, 0, speed * 2.2), '#9ad8ff', 0.6);
            sparks.update(dt);
            shake = Math.max(0, shake - dt * 1.3);
            fovKick *= Math.max(0, 1 - dt * 3);
            camera.fov = 64 + fovKick + Math.min(8, (speed - 20) * 0.25);
            camera.updateProjectionMatrix();
            camera.position.set(carX * 0.6 + (Math.random() - 0.5) * shake, cam.y + (Math.random() - 0.5) * shake * 0.5, cam.z);
            camera.lookAt(carX * 0.8, 0.7, -14);
        }
        const loop = T3.loop((dt) => { update(paused ? 0 : dt); S.renderer.render(scene, camera); });
        function clearAll() {
            clearTimeout(gateTimer);
            if (gate) { scene.remove(gate.grp); gate = null; }
            coins.forEach((c) => scene.remove(c)); coins = [];
        }
        return {
            start() { clearAll(); playing = true; paused = false; lane = 1; baseSpeed = api.age === 'kid' ? 16 : api.age === 'teen' ? 20 : 24; gateTimer = setTimeout(makeGate, 600); TD.ui.toast('Toque no lado da pista', 'ou deslize para trocar de faixa', '👆'); },
            pause() { paused = true; },
            resume() { paused = false; },
            revive() { clearAll(); paused = false; playing = true; slow = 0; gateTimer = setTimeout(makeGate, 500); },
            resize() { S.resize(); },
            destroy() { clearAll(); loop.stop(); window.removeEventListener('keydown', onKey); S.dispose(); }
        };
    }

    /* ======================================================================
       JOGO: Balões 3D
       ====================================================================== */
    G.register('balloons', {
        name: 'Balões 3D', emoji: '🎈', desc: 'Estoure o balão que tem a resposta certa!', art: 'balloons', tag: '3D', ops: true, lives: 3, defaultOp: 'add',
        how: [['🎈', 'Os balões sobem com números'], ['👆', 'Toque no balão com a resposta certa'], ['💨', 'Não deixe o balão certo escapar!']],
        coins: (s) => Math.min(120, s * 3),
        create(host, api) { return T3.load().then((M) => balloons(M.THREE, M.RoomEnvironment, host, api)); }
    });

    function balloons(THREE, RoomEnvironment, host, api) {
        const S = T3.setup(THREE, host, { env: RoomEnvironment, fov: 50, exposure: 1.1 });
        const scene = S.scene, camera = S.camera;
        (function () {
            const c = cvs(16, 512), x = c.getContext('2d');
            const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#2b8cff'); g.addColorStop(0.55, '#7cc8ff'); g.addColorStop(1, '#e6f6ff');
            x.fillStyle = g; x.fillRect(0, 0, 16, 512); scene.background = S.tex(c);
        })();
        scene.fog = new THREE.Fog(0xcfeaff, 30, 90);
        camera.position.set(0, 0.6, 14); camera.lookAt(0, 0.6, 0);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x88b06a, 1.5));
        const sunL = new THREE.DirectionalLight(0xfff4e0, 2.6); sunL.position.set(-6, 10, 10); scene.add(sunL);
        const sunS = new THREE.Sprite(new THREE.SpriteMaterial({ map: T3.glow(S, 'rgba(255,255,240,1)', 'rgba(255,240,180,.55)'), blending: THREE.AdditiveBlending, fog: false, depthWrite: false, transparent: true }));
        sunS.scale.set(16, 16, 1); sunS.position.set(9, 9, -30); scene.add(sunS);
        // Nuvens fofas
        const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xdde9ff, emissiveIntensity: 0.35 });
        const puff = new THREE.IcosahedronGeometry(1, 3);
        const clouds = [];
        for (let i = 0; i < 7; i++) {
            const c = new THREE.Group();
            for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(puff, cloudMat); const s = 1 + Math.random() * 1.2; m.scale.set(s * 1.3, s, s); m.position.set((k - 2.5) * 1.3, Math.random() * 0.8, Math.random() * 0.6); c.add(m); }
            c.position.set(-30 + Math.random() * 60, -2 + Math.random() * 14, -18 - Math.random() * 25);
            c.userData.v = 0.4 + Math.random() * 0.6;
            scene.add(c); clouds.push(c);
        }
        // Colinas
        const hillMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.9, flatShading: true });
        [[-14, -16, -20, 12], [6, -17, -24, 14], [20, -15, -30, 13], [-2, -18, -12, 9]].forEach((h) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(h[3], 2), hillMat); m.position.set(h[0], h[1], h[2]); scene.add(m); });

        // Balão (perfil de látex girado)
        const prof = [[0, -1.22], [0.12, -1.16], [0.34, -0.98], [0.58, -0.66], [0.76, -0.22], [0.84, 0.2], [0.82, 0.58], [0.7, 0.9], [0.48, 1.12], [0.22, 1.24], [0, 1.27]].map((p) => new THREE.Vector2(p[0], p[1]));
        const balloonGeo = new THREE.LatheGeometry(prof, 40);
        const knotGeo = new THREE.ConeGeometry(0.12, 0.2, 10);
        const COLORS = [0xf43f5e, 0xfacc15, 0x22c55e, 0x3b82f6, 0xa855f7, 0xfb923c, 0xec4899, 0x06b6d4];
        const sparks = T3.Sparks(S, 600);
        let list = [], round = null, playing = false, paused = false, t = 0, roundTimer = null, halfW = 5, top = 6, bottom = -7;
        S.onResize = () => {
            const h = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 14;
            halfW = h * S.aspect; top = h + 1.5; bottom = -h - 2.5;
        };
        S.onResize();

        function makeBalloon(val, correct, x, delay) {
            const col = TD.pick(COLORS);
            const mat = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, emissive: 0x000000 });
            const g = new THREE.Group();
            const body = new THREE.Mesh(balloonGeo, mat); g.add(body);
            const knot = new THREE.Mesh(knotGeo, mat); knot.position.y = -1.3; g.add(knot);
            const pts = []; for (let i = 0; i < 12; i++) pts.push(new THREE.Vector3(0, -1.35 - i * 0.28, 0));
            const sGeo = new THREE.BufferGeometry().setFromPoints(pts);
            const str = new THREE.Line(sGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
            g.add(str);
            const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: T3.label(S, val, 'plain'), depthTest: false, transparent: true }));
            lab.renderOrder = 10; lab.scale.set(1.2, 1.2, 1); lab.position.set(0, 0.12, 0); g.add(lab);
            const sc = 0.78 + Math.random() * 0.16;
            g.scale.setScalar(sc);
            g.position.set(x, bottom - delay, (Math.random() - 0.5) * 1.5);
            scene.add(g);
            return { g: g, body: body, mat: mat, str: str, label: lab, val: val, correct: correct, col: col, x0: x, ph: Math.random() * 6, vy: 0, state: 'up', obj: g, r: 1.05 * sc, k: sc, hurt: 0 };
        }
        function remove(b) { scene.remove(b.g); b.mat.dispose(); b.label.material.dispose(); b.str.geometry.dispose(); b.str.material.dispose(); b.dead = true; }
        function newRound() {
            if (!playing) return;
            const q = api.q();
            round = { q: q, done: false, t0: performance.now() };
            api.question(q.text + ' = ?', 'estoure');
            const n = Math.max(3, Math.min(api.age === 'kid' ? 4 : 5, Math.floor((halfW * 2) / 2.1)));
            const vals = api.options(q, n);
            const w = Math.min(halfW - 0.9, 5.5);
            const xs = vals.map((_, i) => -w + 2 * w * (i / (n - 1)));
            TD.shuffle(xs);
            const vy = (api.age === 'kid' ? 1.15 : api.age === 'teen' ? 1.5 : 1.8) + Math.min(1.6, api.score * 0.05);
            vals.forEach((v, i) => { const b = makeBalloon(v, v === q.ans, xs[i], Math.random() * 3.5); b.vy = vy * (0.9 + Math.random() * 0.25); list.push(b); });
        }
        function pop(b, good) {
            b.state = 'pop'; b.popT = 0;
            const p = b.g.position.clone();
            const col = '#' + new THREE.Color(b.col).getHexString();
            sparks.emit(p, 60, [col, col, '#ffffff'], 9, 0.8, 9);
            if (good) sparks.emit(p, 40, ['#fde047', '#f472b6', '#60a5fa', '#34d399'], 6, 1.2, 4);
            TD.sfx('pop'); TD.buzz('medium');
        }
        function onTap(e) {
            if (!playing || paused || !round || round.done) return;
            const hit = T3.pick(S, list.filter((b) => !b.dead && b.state === 'up'), e.clientX, e.clientY, 20);
            if (!hit) return;
            const ms = performance.now() - round.t0;
            const sp = T3.screenPos(S, hit.g);
            if (hit.correct) {
                round.done = true;
                pop(hit, true);
                const st = api.answered(round.q, true, ms);
                api.addScore(1, sp.x, sp.y - 20, st >= 3 ? '+1 combo!' : '+1'); api.combo(st);
                TD.state.stats.balloons++;
                list.forEach((b) => { if (!b.dead && b !== hit && b.state === 'up') b.state = 'away'; });
                roundTimer = setTimeout(newRound, 900);
            } else {
                hit.hurt = 1; hit.mat.emissive.setHex(0xff0000);
                TD.sfx('wrong');
                api.answered(round.q, false, ms);
                TD.ui.floatText(sp.x, sp.y - 20, '✖', '#f43f5e');
                if (api.loseLife() <= 0) round.done = true;
            }
        }
        S.canvas.addEventListener('pointerdown', onTap);
        function update(dt) {
            t += dt;
            clouds.forEach((c) => { c.position.x += c.userData.v * dt; if (c.position.x > 36) c.position.x = -36; });
            list.forEach((b) => {
                if (b.dead) return;
                if (b.state === 'pop') { b.popT += dt; b.g.scale.setScalar(b.k * (1 + b.popT * 6)); b.mat.opacity = 1; if (b.popT > 0.08) remove(b); return; }
                const v = b.state === 'away' ? b.vy * 4 : b.vy;
                b.g.position.y += v * dt;
                b.g.position.x = b.x0 + Math.sin(t * 0.9 + b.ph) * 0.35;
                b.g.rotation.z = Math.sin(t * 1.3 + b.ph) * 0.08;
                b.body.rotation.y += dt * 0.3;
                const sp = b.str.geometry.attributes.position;
                for (let i = 1; i < sp.count; i++) sp.setX(i, Math.sin(t * 2.2 + b.ph + i * 0.45) * 0.05 * i);
                sp.needsUpdate = true;
                if (b.hurt > 0) { b.hurt -= dt * 2; const s = 1 + Math.sin(t * 40) * 0.06 * b.hurt; b.body.scale.set(s, 1 / s, s); if (b.hurt <= 0) { b.mat.emissive.setHex(0x000000); b.body.scale.set(1, 1, 1); } }
                if (b.g.position.y > top) {
                    if (b.correct && round && !round.done && b.state === 'up' && playing) {
                        round.done = true;
                        api.answered(round.q, false, 9000);
                        TD.sfx('wrong');
                        TD.ui.floatText(S.W / 2 - 50, S.H * 0.3, 'Era ' + round.q.ans + '!', '#fbbf24');
                        list.forEach((o) => { if (!o.dead && o.state === 'up') o.state = 'away'; });
                        if (api.loseLife() > 0) roundTimer = setTimeout(newRound, 900);
                    }
                    remove(b);
                }
            });
            list = list.filter((b) => !b.dead);
            sparks.update(dt);
        }
        // balões de enfeite na introdução
        function demo() { for (let i = 0; i < 4; i++) { const b = makeBalloon(TD.rand(2, 50), false, -4 + i * 2.7, Math.random() * 5); b.vy = 0.8 + Math.random() * 0.4; b.state = 'away'; b.demo = true; list.push(b); } }
        demo();
        const demoT = setInterval(() => { if (!playing && list.length < 6) demo(); }, 4000);
        const loop = T3.loop((dt) => { update(paused ? 0 : dt); S.renderer.render(scene, camera); });
        function clearAll() { clearTimeout(roundTimer); list.forEach((b) => { if (!b.dead) remove(b); }); list = []; }
        return {
            start() { clearAll(); playing = true; paused = false; roundTimer = setTimeout(newRound, 300); },
            pause() { paused = true; },
            resume() { paused = false; },
            revive() { clearAll(); paused = false; playing = true; newRound(); },
            resize() { S.resize(); },
            destroy() { clearAll(); clearInterval(demoT); loop.stop(); S.canvas.removeEventListener('pointerdown', onTap); S.dispose(); }
        };
    }
})();
