// Gera o icone do app Tabuada Divertida em todos os tamanhos Android
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const cx = size / 2, cy = size / 2, r = size / 2;

    // Fundo gradiente roxo -> rosa
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#6C63FF');
    grad.addColorStop(1, '#FF6584');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Circulo branco interno
    const innerR = size * 0.36;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fill();

    // Texto principal: tamanho e posicao dependem do size
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Numero grande "×" ou o numero da tabuada
    ctx.font = `bold ${size * 0.38}px Arial`;
    ctx.fillText('×', cx, cy * 0.88);

    // Texto "123" pequeno em baixo
    ctx.font = `bold ${size * 0.18}px Arial`;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('1 2 3', cx, cy * 1.38);

    // Estrela pequena no canto superior direito
    ctx.font = `${size * 0.18}px Arial`;
    ctx.fillStyle = '#FFD700';
    ctx.fillText('⭐', size * 0.72, size * 0.22);

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

    ['ic_launcher.png', 'ic_launcher_round.png'].forEach(name => {
        fs.writeFileSync(path.join(outDir, name), buf);
    });
    generated++;
    console.log(`✓ ${dir} (${size}x${size})`);
});

// Tambem salva em www/ para o PWA
fs.writeFileSync(path.join(__dirname, 'www', 'icon-192.png'), drawIcon(192));
fs.writeFileSync(path.join(__dirname, 'www', 'icon-512.png'), drawIcon(512));
console.log('✓ www/icon-192.png');
console.log('✓ www/icon-512.png');
console.log(`\nIcone gerado em ${generated * 2 + 2} arquivos!`);
