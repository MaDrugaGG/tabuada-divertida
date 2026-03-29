// Gera o icone do app Tabuada Divertida em todos os tamanhos Android
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const cx = size / 2, cy = size / 2;
    const s = size;

    // Fundo gradiente azul escuro -> roxo vibrante
    const bgGrad = ctx.createLinearGradient(0, 0, s, s);
    bgGrad.addColorStop(0, '#1A1A6E');
    bgGrad.addColorStop(0.5, '#3B1FA8');
    bgGrad.addColorStop(1, '#6C2FD4');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(0, 0, s, s, s * 0.22);
    ctx.fill();

    // Estrelas decorativas de fundo
    function drawStar(x, y, r, color, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.font = `${r}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', x, y);
        ctx.restore();
    }
    drawStar(s * 0.15, s * 0.18, s * 0.10, '#FFD700', 0.7);
    drawStar(s * 0.82, s * 0.14, s * 0.07, '#FFD700', 0.5);
    drawStar(s * 0.88, s * 0.78, s * 0.09, '#FF9F43', 0.6);
    drawStar(s * 0.12, s * 0.80, s * 0.07, '#FF9F43', 0.5);

    // Circulo central branco com brilho
    const circR = s * 0.34;
    const glowGrad = ctx.createRadialGradient(cx, cy - s*0.04, 0, cx, cy, circR);
    glowGrad.addColorStop(0, 'rgba(255,255,255,1)');
    glowGrad.addColorStop(0.7, 'rgba(240,230,255,1)');
    glowGrad.addColorStop(1, 'rgba(180,150,255,0.9)');
    ctx.shadowColor = 'rgba(150,100,255,0.6)';
    ctx.shadowBlur = s * 0.08;
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.04, circR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Simbolo de multiplicacao roxo dentro do circulo
    const multGrad = ctx.createLinearGradient(cx - circR, cy, cx + circR, cy);
    multGrad.addColorStop(0, '#7B2FFF');
    multGrad.addColorStop(1, '#4A00C8');
    ctx.fillStyle = multGrad;
    ctx.font = `bold ${s * 0.36}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('×', cx, cy - s * 0.04);

    // Faixa inferior com texto
    const faixaH = s * 0.22;
    const faixaY = s * 0.745;
    const faixaGrad = ctx.createLinearGradient(0, faixaY, 0, faixaY + faixaH);
    faixaGrad.addColorStop(0, 'rgba(255,180,0,0.95)');
    faixaGrad.addColorStop(1, 'rgba(255,120,0,0.95)');
    ctx.fillStyle = faixaGrad;
    ctx.beginPath();
    ctx.roundRect(s * 0.08, faixaY, s * 0.84, faixaH, s * 0.07);
    ctx.fill();

    // Texto "TABUADA" na faixa
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${s * 0.115}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = s * 0.02;
    ctx.fillText('TABUADA', cx, faixaY + faixaH * 0.5);
    ctx.shadowBlur = 0;

    // Pontinhos de numero nas laterais do circulo
    function drawNumDot(x, y, num) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,210,0,0.9)';
        ctx.beginPath();
        ctx.arc(x, y, s * 0.065, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3B1FA8';
        ctx.font = `bold ${s * 0.09}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(num, x, y);
        ctx.restore();
    }
    drawNumDot(s * 0.16, cy - s * 0.04, '5');
    drawNumDot(s * 0.84, cy - s * 0.04, '6');

    return canvas.toBuffer('image/png');
}

// Tamanhos Android
const sizes = [
    { dir: 'mipmap-mdpi',    size: 48  },
    { dir: 'mipmap-hdpi',    size: 72  },
    { dir: 'mipmap-xhdpi',   size: 96  },
    { dir: 'mipmap-xxhdpi',  size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 },
];

const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');
let generated = 0;

sizes.forEach(({ dir, size }) => {
    const buf = drawIcon(size);
    const outDir = path.join(resDir, dir);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png'].forEach(name => {
        fs.writeFileSync(path.join(outDir, name), buf);
    });
    generated++;
    console.log(`✓ ${dir} (${size}x${size})`);
});

// Tambem salva em www/ e docs/ para o PWA
fs.writeFileSync(path.join(__dirname, 'www', 'icon-192.png'), drawIcon(192));
fs.writeFileSync(path.join(__dirname, 'www', 'icon-512.png'), drawIcon(512));
fs.writeFileSync(path.join(__dirname, 'docs', 'icon-192.png'), drawIcon(192));
fs.writeFileSync(path.join(__dirname, 'docs', 'icon-512.png'), drawIcon(512));
console.log('✓ www/icon-192.png');
console.log('✓ www/icon-512.png');
console.log('✓ docs/icon-192.png');
console.log('✓ docs/icon-512.png');
console.log(`\nIcone gerado em ${generated * 2 + 4} arquivos!`);
