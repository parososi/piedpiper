/**
 * Pied Piper Web Interface
 * Compression and decompression UI logic
 */

let selectedFileCompress = null;
let selectedFileDecompress = null;

// Initialize compressor
const compressor = new PiedPiperCompressor();

// Mode switching
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;

        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.mode').forEach(m => m.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(`${mode}-mode`).classList.add('active');

        hideResult();
    });
});

// File upload handlers - Compress
const dropZoneCompress = document.getElementById('drop-encrypt');
const fileInputCompress = document.getElementById('file-encrypt');
const fileNameCompress = document.getElementById('file-name-encrypt');

dropZoneCompress.addEventListener('click', () => fileInputCompress.click());

dropZoneCompress.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZoneCompress.classList.add('dragover');
});

dropZoneCompress.addEventListener('dragleave', () => {
    dropZoneCompress.classList.remove('dragover');
});

dropZoneCompress.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZoneCompress.classList.remove('dragover');
    handleFileCompress(e.dataTransfer.files[0]);
});

fileInputCompress.addEventListener('change', (e) => {
    handleFileCompress(e.target.files[0]);
});

function handleFileCompress(file) {
    if (!file) return;
    selectedFileCompress = file;
    fileNameCompress.textContent = file.name;
    fileNameCompress.style.color = '#0071e3';
}

// File upload handlers - Decompress
const dropZoneDecompress = document.getElementById('drop-decrypt');
const fileInputDecompress = document.getElementById('file-decrypt');
const fileNameDecompress = document.getElementById('file-name-decrypt');

dropZoneDecompress.addEventListener('click', () => fileInputDecompress.click());

dropZoneDecompress.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZoneDecompress.classList.add('dragover');
});

dropZoneDecompress.addEventListener('dragleave', () => {
    dropZoneDecompress.classList.remove('dragover');
});

dropZoneDecompress.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZoneDecompress.classList.remove('dragover');
    handleFileDecompress(e.dataTransfer.files[0]);
});

fileInputDecompress.addEventListener('change', (e) => {
    handleFileDecompress(e.target.files[0]);
});

function handleFileDecompress(file) {
    if (!file) return;
    selectedFileDecompress = file;
    fileNameDecompress.textContent = file.name;
    fileNameDecompress.style.color = '#0071e3';
}

// Password toggle handlers
document.getElementById('use-pass-encrypt').addEventListener('change', (e) => {
    document.getElementById('pass-encrypt').disabled = !e.target.checked;
});

document.getElementById('use-pass-decrypt').addEventListener('change', (e) => {
    document.getElementById('pass-decrypt').disabled = !e.target.checked;
});

// Compress button
document.getElementById('btn-encrypt').addEventListener('click', async () => {
    if (!selectedFileCompress) {
        showResult('Por favor, selecione um arquivo', 'error');
        return;
    }

    try {
        showResult('Comprimindo...', 'info');

        const arrayBuffer = await selectedFileCompress.arrayBuffer();
        const input = new Uint8Array(arrayBuffer);

        // Compress using Pied Piper algorithm
        const compressed = compressor.compress(input, 6);

        // Add password encryption if enabled
        const usePassword = document.getElementById('use-pass-encrypt').checked;
        const password = document.getElementById('pass-encrypt').value;

        let finalData = compressed;

        if (usePassword && password) {
            // Encrypt with AES-256
            const wordArray = CryptoJS.lib.WordArray.create(compressed);
            const encrypted = CryptoJS.AES.encrypt(wordArray, password).toString();
            const encryptedBytes = new TextEncoder().encode(encrypted);

            // Add encryption flag to header
            finalData = new Uint8Array(1 + encryptedBytes.length);
            finalData[0] = 0x01; // Encrypted flag
            finalData.set(encryptedBytes, 1);
        } else {
            // Add no-encryption flag
            const temp = new Uint8Array(1 + compressed.length);
            temp[0] = 0x00; // Not encrypted flag
            temp.set(compressed, 1);
            finalData = temp;
        }

        // Get stats
        const stats = compressor.getStats();

        // Download file
        const blob = new Blob([finalData], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = selectedFileCompress.name + '.pp';
        a.click();
        URL.revokeObjectURL(url);

        showResult(
            `✓ Arquivo comprimido com sucesso!<br>` +
            `<small>Original: ${formatBytes(stats.inputSize)} → Comprimido: ${formatBytes(stats.outputSize)} ` +
            `(${stats.compressionRatio}%)</small>`,
            'success'
        );
    } catch (error) {
        console.error(error);
        showResult('Erro ao comprimir arquivo: ' + error.message, 'error');
    }
});

// Decompress button
document.getElementById('btn-decrypt').addEventListener('click', async () => {
    if (!selectedFileDecompress) {
        showResult('Por favor, selecione um arquivo .pp', 'error');
        return;
    }

    try {
        showResult('Descomprimindo...', 'info');

        const arrayBuffer = await selectedFileDecompress.arrayBuffer();
        let data = new Uint8Array(arrayBuffer);

        // Check encryption flag
        const encryptedFlag = data[0];
        data = data.slice(1);

        if (encryptedFlag === 0x01) {
            // Decrypt with password
            const usePassword = document.getElementById('use-pass-decrypt').checked;
            const password = document.getElementById('pass-decrypt').value;

            if (!usePassword || !password) {
                showResult('Este arquivo está protegido por senha', 'error');
                return;
            }

            try {
                const encryptedStr = new TextDecoder().decode(data);
                const decrypted = CryptoJS.AES.decrypt(encryptedStr, password);
                const decryptedArray = [];

                for (let i = 0; i < decrypted.sigBytes; i++) {
                    decryptedArray.push((decrypted.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
                }

                data = new Uint8Array(decryptedArray);
            } catch (error) {
                showResult('Senha incorreta', 'error');
                return;
            }
        }

        // Decompress using Pied Piper algorithm
        const decompressed = compressor.decompress(data);

        // Download file
        const blob = new Blob([decompressed], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Remove .pp extension
        let fileName = selectedFileDecompress.name;
        if (fileName.endsWith('.pp')) {
            fileName = fileName.slice(0, -3);
        }
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);

        showResult(
            `✓ Arquivo descomprimido com sucesso!<br>` +
            `<small>Tamanho: ${formatBytes(decompressed.length)}</small>`,
            'success'
        );
    } catch (error) {
        console.error(error);
        showResult('Erro ao descomprimir arquivo: ' + error.message, 'error');
    }
});

// Utility functions
function showResult(message, type) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = message;
    resultDiv.className = 'result ' + type;
    resultDiv.style.display = 'block';
}

function hideResult() {
    const resultDiv = document.getElementById('result');
    resultDiv.style.display = 'none';
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Initialize
hideResult();
