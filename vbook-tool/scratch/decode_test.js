const fs = require('fs');

const filePath = 'c:\\Users\\11244077\\Documents\\ext-source-vbooks\\vbook-extensions\\zip\\hhtqhay_extracted\\src\\config.js';
const code = fs.readFileSync(filePath, 'utf8').trim();

// Thay thế các token
const base64Str = code
    .replace(/x0P1Xx/g, '+')
    .replace(/x0P2Xx/g, '/')
    .replace(/x0P3Xx/g, '=');

console.log('Processed Base64 Str:', base64Str);

function tryDecode(str) {
    try {
        const buf = Buffer.from(str, 'base64');
        
        // 1. Thử UTF-8 trực tiếp
        let text = buf.toString('utf8');
        if (text.includes('function') || text.includes('var') || text.includes('const') || text.includes('BASE_URL')) {
            return text;
        }

        // 2. Thử đảo ngược byte
        const revBuf = Buffer.alloc(buf.length);
        for (let i = 0; i < buf.length; i++) {
            revBuf[i] = buf[buf.length - 1 - i];
        }
        text = revBuf.toString('utf8');
        if (text.includes('function') || text.includes('var') || text.includes('const') || text.includes('BASE_URL')) {
            return text;
        }

        // 3. Thử XOR với mọi key (cho cả buf và revBuf)
        for (let key = 1; key < 256; key++) {
            const xorBuf = Buffer.alloc(buf.length);
            const xorRevBuf = Buffer.alloc(buf.length);
            for (let i = 0; i < buf.length; i++) {
                xorBuf[i] = buf[i] ^ key;
                xorRevBuf[i] = revBuf[i] ^ key;
            }
            
            text = xorBuf.toString('utf8');
            if (text.includes('function') || text.includes('var') || text.includes('const') || text.includes('BASE_URL') || text.includes('load')) {
                console.log('Found XOR key:', key);
                return text;
            }

            text = xorRevBuf.toString('utf8');
            if (text.includes('function') || text.includes('var') || text.includes('const') || text.includes('BASE_URL') || text.includes('load')) {
                console.log('Found XOR key (reversed bytes):', key);
                return text;
            }
        }
    } catch (e) {}
    return null;
}

// Thử với chuỗi gốc
let res = tryDecode(base64Str);
if (res) {
    console.log('=== SUCCESS ===\n', res);
    process.exit(0);
}

// Thử đảo ngược chuỗi base64 (giữ nguyên padding ở cuối nếu có)
const cleanStr = base64Str.replace(/=/g, '');
const reversedBase64 = cleanStr.split('').reverse().join('') + "=".repeat((4 - cleanStr.length % 4) % 4);
console.log('Reversed Base64 Str:', reversedBase64);
res = tryDecode(reversedBase64);
if (res) {
    console.log('=== SUCCESS (reversed base64) ===\n', res);
    process.exit(0);
}

console.log('All decoding attempts failed.');
