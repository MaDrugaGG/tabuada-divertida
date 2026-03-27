const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const r = size * 0.18; // border radius

    // ── Fundo com cantos arredondados ──
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(size - r, 0);
    ctx.quadraticCurveTo(size, 0, size, r);
    ctx.lineTo(size, size - r);
    ctx.quadraticCurveTo(size, size, size - r, size);
    ctx.lineTo(r, size);
    ctx.quadraticCurveTo(0, size, 0, size - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();

    // Gradiente roxo → pink
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0,   '#4C3FBF');
    grad.addColorStop(0.5, '#6C63FF');
    grad.addColorStop(1,   '#FF6584');
    ctx.fillStyle = grad;
    ctx.fill();

    // ── Circulo brilhante no centro ──
    const glow = ctx.createRadialGradient(size*0.5, size*0.4, 0, size*0.5, size*0.4, size*0.5);
    glow.addColorStop(0,   'rgba(255,255,255,0.18)');
    glow.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(size*0.5, size*0.4, size*0.5, 0, Math.PI*2);
    ctx.fill();

    // ── Estrelas decorativas ──
    const stars = [
        { x: 0.15, y: 0.18, s: 0.06 },
        { x: 0.82, y: 0.14, s: 0.05 },
        { x: 0.88, y: 0.72, s: 0.04 },
        { x: 0.10, y: 0.80, s: 0.04 },
    ];
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    stars.forEach(st => {
        drawStar(ctx, st.x * size, st.y * size, st.s * size);
    });

    // ── Simbolo de multiplicacao grande ──
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur  = size * 0.04;
    ctx.fillStyle   = 'white';
    ctx.font        = `bold ${size * 0.38}px Arial`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u00D7', size * 0.5, size * 0.40);
    ctx.restore();

    // ── Texto "tabuada" embaixo ──
    ctx.fillStyle = 'rgba(255,255,255,0.90)';
    ctx.font      = `bold ${size * 0.115}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TABUADA', size * 0.5, size * 0.71);

    // ── Linha decorativa ──
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth   = size * 0.012;
    ctx.beginPath();
    ctx.moveTo(size * 0.25, size * 0.625);
    ctx.lineTo(size * 0.75, size * 0.625);
    ctx.stroke();

    // ── Pontos de numeros ──
    const nums = ['1','2','3','4','5'];
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font      = `bold ${size * 0.075}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    nums.forEach((n, i) => {
        const x = size * (0.18 + i * 0.16);
        const y = size * 0.855;
        ctx.fillText(n, x, y);
    });

    return canvas;
}

function drawStar(ctx, cx, cy, r) {
    const spikes = 5;
    const outerR = r;
    const innerR = r * 0.45;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
        ctx.lineTo(
            cx + Math.cos(rot) * outerR,
            cy + Math.sin(rot) * outerR
        );
        rot += step;
        ctx.lineTo(
            cx + Math.cos(rot) * innerR,
            cy + Math.sin(rot) * innerR
        );
        rot += step;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
    ctx.fill();
}

const outDir = path.join(__dirname, 'www');

[192, 512].forEach(size => {
    const canvas = drawIcon(size);
    const buffer = canvas.toBuffer('image/png');
    const file   = path.join(outDir, `icon-${size}.png`);
    fs.writeFileSync(file, buffer);
    console.log('Criado:', file);
});

console.log('Icones gerados com sucesso!');
