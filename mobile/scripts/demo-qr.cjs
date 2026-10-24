// Uses Expo's installed deterministic QR encoder; no external QR service.
const {toQR}=require('toqr');
const {writeFileSync}=require('node:fs');
const {resolve}=require('node:path');
const host=process.argv[2];
if(!/^(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(host||''))throw Error('Private IPv4 required');
const url=`exp://${host}:8086`,data=toQR(url),size=Math.sqrt(data.length),quiet=4;
let blocks='';
for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(data[y*size+x])blocks+=`<rect x="${x+quiet}" y="${y+quiet}" width="1" height="1"/>`;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size+quiet*2} ${size+quiet*2}" width="360" height="360"><rect width="100%" height="100%" fill="white"/><g fill="black">${blocks}</g></svg>`;
const destination=resolve(__dirname,'../../api/.local');
writeFileSync(resolve(destination,'ai-demo-qr.svg'),svg);
writeFileSync(resolve(destination,'ai-demo-preview.html'),`<!doctype html><meta charset="utf-8"><title>Samvad AI demo</title><body style="font:20px system-ui;text-align:center;background:#f6f8f4;color:#173e2b"><h1>Samvad AI demo</h1><p>Connect the phone to the same Wi-Fi as this computer.</p>${svg}<p><a href="${url}">${url}</a></p><p>iPhone: scan with Camera and open in Expo Go.<br>Android: scan in Expo Go.</p><p>Keep this computer, Docker, gateway and Expo running.</p><p><a href="demo-login-sheet.md">Private local login sheet</a></p>`);
console.log('Local QR preview created for '+url);
