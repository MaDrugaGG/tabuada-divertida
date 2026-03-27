const { createCanvas, loadImage } = require('canvas');
const fs   = require('fs');
const path = require('path');

const SRC  = path.join(__dirname, 'www', 'icon-512.png');
const DEST = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

const SIZES = {
    'mipmap-mdpi':    48,
    'mipmap-hdpi':    72,
    'mipmap-xhdpi':   96,
    'mipmap-xxhdpi':  144,
    'mipmap-xxxhdpi': 192,
};

async function run() {
    const img = await loadImage(SRC);
    for (const [folder, size] of Object.entries(SIZES)) {
        const c   = createCanvas(size, size);
        const ctx = c.getContext('2d');
        // fundo arredondado
        const r = size * 0.18;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(size-r, 0); ctx.quadraticCurveTo(size, 0, size, r);
        ctx.lineTo(size, size-r); ctx.quadraticCurveTo(size, size, size-r, size);
        ctx.lineTo(r, size); ctx.quadraticCurveTo(0, size, 0, size-r);
        ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 0, 0, size, size);

        const dir = path.join(DEST, folder);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const buf = c.toBuffer('image/png');
        fs.writeFileSync(path.join(dir, 'ic_launcher.png'), buf);
        fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), buf);
        console.log(`OK ${folder} (${size}x${size})`);
    }
    console.log('Todos os icones gerados!');
}

run().catch(console.error);
