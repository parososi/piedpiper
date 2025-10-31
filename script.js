/**
 * Pied Piper Web Interface
 * Compression and decompression UI logic
 */

let selectedFileCompress = null;
let selectedFileDecompress = null;

// Initialize compressor
const compressor = new PiedPiperCompressor();

// Web Worker support for large files
let compressionWorker = null;
const WORKER_THRESHOLD = 5 * 1024 * 1024; // Use worker for files > 5MB

function getCompressionWorker() {
    if (!compressionWorker) {
        try {
            compressionWorker = new Worker('lib/compression-worker.js');
        } catch (error) {
            console.warn('Web Worker not available:', error);
            return null;
        }
    }
    return compressionWorker;
}

// Compress using Web Worker (for large files)
function compressWithWorker(data, level) {
    return new Promise((resolve, reject) => {
        const worker = getCompressionWorker();

        if (!worker) {
            // Fallback to main thread
            try {
                const result = compressor.compress(data, level);
                resolve(result);
            } catch (error) {
                reject(error);
            }
            return;
        }

        worker.onmessage = (e) => {
            const { type, data: resultData, stats, message } = e.data;

            if (type === 'progress') {
                updateProgress(resultData);
            } else if (type === 'complete') {
                resolve({ data: resultData, stats });
            } else if (type === 'error') {
                reject(new Error(message));
            }
        };

        worker.onerror = (error) => {
            reject(error);
        };

        // Send data to worker (copy buffer to avoid transfer issues)
        worker.postMessage({
            action: 'compress',
            data: new Uint8Array(data), // Create copy
            level: level
        });
    });
}

// Decompress using Web Worker (for large files)
function decompressWithWorker(data) {
    return new Promise((resolve, reject) => {
        const worker = getCompressionWorker();

        if (!worker) {
            // Fallback to main thread
            try {
                const result = compressor.decompress(data);
                resolve(result);
            } catch (error) {
                reject(error);
            }
            return;
        }

        worker.onmessage = (e) => {
            const { type, data: resultData, message } = e.data;

            if (type === 'progress') {
                updateProgress(resultData);
            } else if (type === 'complete') {
                resolve(resultData);
            } else if (type === 'error') {
                reject(new Error(message));
            }
        };

        worker.onerror = (error) => {
            reject(error);
        };

        // Send data to worker (copy buffer to avoid transfer issues)
        worker.postMessage({
            action: 'decompress',
            data: new Uint8Array(data) // Create copy
        });
    });
}

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
const dropZoneCompress = document.getElementById('drop-compress');
const fileInputCompress = document.getElementById('file-compress');
const fileNameCompress = document.getElementById('file-name-compress');

dropZoneCompress.addEventListener('click', () => fileInputCompress.click());

dropZoneCompress.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneCompress.classList.add('dragover');
});

dropZoneCompress.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneCompress.classList.remove('dragover');
});

dropZoneCompress.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneCompress.classList.remove('dragover');

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileCompress(e.dataTransfer.files[0]);
    }
});

fileInputCompress.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
        handleFileCompress(e.target.files[0]);
    }
});

function handleFileCompress(file) {
    if (!file) return;
    selectedFileCompress = file;
    fileNameCompress.innerHTML = `<strong>${file.name}</strong><br><small>${formatBytes(file.size)}</small>`;
    fileNameCompress.style.color = '#0071e3';
    dropZoneCompress.style.borderColor = '#0071e3';
}

// File upload handlers - Decompress
const dropZoneDecompress = document.getElementById('drop-decompress');
const fileInputDecompress = document.getElementById('file-decompress');
const fileNameDecompress = document.getElementById('file-name-decompress');

dropZoneDecompress.addEventListener('click', () => fileInputDecompress.click());

dropZoneDecompress.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneDecompress.classList.add('dragover');
});

dropZoneDecompress.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneDecompress.classList.remove('dragover');
});

dropZoneDecompress.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneDecompress.classList.remove('dragover');

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.name.endsWith('.pp')) {
            handleFileDecompress(file);
        } else {
            showResult('Por favor, arraste apenas arquivos .pp', 'error');
        }
    }
});

fileInputDecompress.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
        handleFileDecompress(e.target.files[0]);
    }
});

function handleFileDecompress(file) {
    if (!file) return;
    if (!file.name.endsWith('.pp')) {
        showResult('Por favor, selecione um arquivo .pp', 'error');
        return;
    }
    selectedFileDecompress = file;
    fileNameDecompress.innerHTML = `<strong>${file.name}</strong><br><small>${formatBytes(file.size)}</small>`;
    fileNameDecompress.style.color = '#0071e3';
    dropZoneDecompress.style.borderColor = '#0071e3';
}

// Password toggle handlers
document.getElementById('use-pass-compress').addEventListener('change', (e) => {
    document.getElementById('pass-compress').disabled = !e.target.checked;
});

document.getElementById('use-pass-decompress').addEventListener('change', (e) => {
    document.getElementById('pass-decompress').disabled = !e.target.checked;
});

// Progress bar functions
function showProgress() {
    const progressContainer = document.getElementById('progress-container');
    progressContainer.style.display = 'block';
    hideResult();
}

function hideProgress() {
    const progressContainer = document.getElementById('progress-container');
    progressContainer.style.display = 'none';
}

function updateProgress(progressData) {
    const progressFill = document.getElementById('progress-fill');
    const progressPercent = document.getElementById('progress-percent');
    const progressStage = document.getElementById('progress-stage');
    const progressMessage = document.getElementById('progress-message');

    progressFill.style.width = progressData.percent + '%';
    progressPercent.textContent = Math.floor(progressData.percent) + '%';
    progressStage.textContent = progressData.stage.toUpperCase();
    progressMessage.textContent = progressData.message;
}

// Compress button
document.getElementById('btn-compress').addEventListener('click', async () => {
    if (!selectedFileCompress) {
        showResult('❌ Por favor, selecione um arquivo primeiro', 'error');
        return;
    }

    const button = document.getElementById('btn-compress');
    const originalText = button.innerHTML;

    try {
        // Show loading state
        button.disabled = true;
        button.innerHTML = '<i class="ri-loader-4-line"></i> <span>Comprimindo...</span>';

        // Show progress bar
        showProgress();

        const arrayBuffer = await selectedFileCompress.arrayBuffer();
        const input = new Uint8Array(arrayBuffer);
        const originalSize = input.length;

        // Use worker for large files, main thread for small files
        let compressed;
        let compressionStats;

        if (originalSize > WORKER_THRESHOLD) {
            // Use Web Worker for large files to avoid blocking UI
            const result = await compressWithWorker(input, 9);  // Level 9 for extreme compression
            compressed = result.data;
            compressionStats = result.stats;
        } else {
            // Use main thread for small files
            compressor.setProgressCallback(updateProgress);
            compressed = compressor.compress(input, 9);  // Level 9 for extreme compression
            compressionStats = compressor.getStats();
            compressor.setProgressCallback(null);
        }

        // Add password encryption if enabled
        const usePassword = document.getElementById('use-pass-compress').checked;
        const password = document.getElementById('pass-compress').value;

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

        // Get compression statistics
        const stats = compressor.getStats();
        const finalSize = finalData.length;
        const savedBytes = originalSize - finalSize;
        const savedPercentage = ((savedBytes / originalSize) * 100).toFixed(1);
        const compressionRatio = ((finalSize / originalSize) * 100).toFixed(1);

        // Download file
        const blob = new Blob([finalData], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = selectedFileCompress.name + '.pp';
        a.click();
        URL.revokeObjectURL(url);

        // Show detailed success message with advanced statistics
        const isSmaller = finalSize < originalSize;
        const message = `
            <div style="text-align: center;">
                <div style="font-size: 28px; margin-bottom: 12px;">✅</div>
                <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Compressão Concluída!</div>
                <div style="font-size: 13px; color: #86868b; margin-bottom: 16px;">Algoritmo PIPER • Fundação Parososi</div>

                <div style="display: flex; justify-content: space-around; align-items: center; margin: 20px 0; padding: 20px; background: linear-gradient(135deg, rgba(0,113,227,0.08) 0%, rgba(0,113,227,0.02) 100%); border-radius: 16px; border: 1px solid rgba(0,113,227,0.1);">
                    <div style="text-align: center;">
                        <div style="font-size: 11px; color: #86868b; margin-bottom: 6px; letter-spacing: 0.5px;">TAMANHO ORIGINAL</div>
                        <div style="font-size: 22px; font-weight: 700; color: #1d1d1f;">${formatBytes(originalSize)}</div>
                    </div>
                    <div style="font-size: 28px; color: #0071e3;">→</div>
                    <div style="text-align: center;">
                        <div style="font-size: 11px; color: #86868b; margin-bottom: 6px; letter-spacing: 0.5px;">COMPRIMIDO</div>
                        <div style="font-size: 22px; font-weight: 700; color: #0071e3;">${formatBytes(finalSize)}</div>
                    </div>
                </div>

                ${isSmaller ? `
                    <div style="padding: 16px; background: linear-gradient(135deg, #30d158 0%, #28a745 100%); color: white; border-radius: 12px; margin-top: 12px; box-shadow: 0 4px 12px rgba(48,209,88,0.3);">
                        <div style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">🎉 Compressão Bem-Sucedida!</div>
                        <div style="display: flex; justify-content: space-around; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.3);">
                            <div>
                                <div style="font-size: 11px; opacity: 0.9;">ECONOMIA</div>
                                <div style="font-size: 18px; font-weight: 700;">${formatBytes(savedBytes)}</div>
                            </div>
                            <div>
                                <div style="font-size: 11px; opacity: 0.9;">TAXA DE COMPRESSÃO</div>
                                <div style="font-size: 18px; font-weight: 700;">${savedPercentage}%</div>
                            </div>
                            <div>
                                <div style="font-size: 11px; opacity: 0.9;">TAMANHO FINAL</div>
                                <div style="font-size: 18px; font-weight: 700;">${compressionRatio}%</div>
                            </div>
                        </div>
                    </div>
                ` : `
                    <div style="padding: 16px; background: linear-gradient(135deg, #ff9500 0%, #ff6b00 100%); color: white; border-radius: 12px; margin-top: 12px;">
                        <div style="font-size: 14px; font-weight: 600; margin-bottom: 6px;">⚠️ Arquivo Não Comprimível</div>
                        <div style="font-size: 12px; opacity: 0.95;">Este arquivo já está comprimido ou não possui padrões comprimíveis (ZIP, JPEG, PNG, etc).</div>
                        <div style="margin-top: 8px; font-size: 11px; opacity: 0.85;">Aumento: ${formatBytes(Math.abs(savedBytes))}</div>
                    </div>
                `}
            </div>
        `;

        hideProgress();
        showResult(message, 'success');
    } catch (error) {
        console.error(error);
        hideProgress();
        showResult('❌ Erro ao comprimir arquivo: ' + error.message, 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
        compressor.setProgressCallback(null);
    }
});

// Decompress button
document.getElementById('btn-decompress').addEventListener('click', async () => {
    if (!selectedFileDecompress) {
        showResult('❌ Por favor, selecione um arquivo .pp primeiro', 'error');
        return;
    }

    const button = document.getElementById('btn-decompress');
    const originalText = button.innerHTML;

    try {
        // Show loading state
        button.disabled = true;
        button.innerHTML = '<i class="ri-loader-4-line"></i> <span>Descomprimindo...</span>';

        // Show progress bar
        showProgress();

        const arrayBuffer = await selectedFileDecompress.arrayBuffer();
        let data = new Uint8Array(arrayBuffer);
        const compressedSize = data.length;

        // Check encryption flag
        const encryptedFlag = data[0];
        data = data.slice(1);

        if (encryptedFlag === 0x01) {
            // Decrypt with password
            const usePassword = document.getElementById('use-pass-decompress').checked;
            const password = document.getElementById('pass-decompress').value;

            if (!usePassword || !password) {
                showResult('🔒 Este arquivo está protegido por senha. Por favor, marque a opção e digite a senha.', 'error');
                button.disabled = false;
                button.innerHTML = originalText;
                return;
            }

            try {
                const encryptedStr = new TextDecoder().decode(data);
                const decrypted = CryptoJS.AES.decrypt(encryptedStr, password);

                if (decrypted.sigBytes <= 0) {
                    throw new Error('Invalid password');
                }

                const decryptedArray = [];
                for (let i = 0; i < decrypted.sigBytes; i++) {
                    decryptedArray.push((decrypted.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
                }

                data = new Uint8Array(decryptedArray);
            } catch (error) {
                showResult('❌ Senha incorreta ou arquivo corrompido', 'error');
                button.disabled = false;
                button.innerHTML = originalText;
                return;
            }
        }

        // Use worker for large files, main thread for small files
        let decompressed;

        if (data.length > WORKER_THRESHOLD) {
            // Use Web Worker for large files to avoid blocking UI
            decompressed = await decompressWithWorker(data);
        } else {
            // Use main thread for small files
            compressor.setProgressCallback(updateProgress);
            decompressed = compressor.decompress(data);
            compressor.setProgressCallback(null);
        }

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

        // Show detailed success message
        const message = `
            <div style="text-align: center;">
                <div style="font-size: 28px; margin-bottom: 12px;">✅</div>
                <div style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">Arquivo descomprimido com sucesso!</div>
                <div style="display: flex; justify-content: space-around; align-items: center; margin: 20px 0; padding: 16px; background: rgba(0,113,227,0.05); border-radius: 12px;">
                    <div style="text-align: center;">
                        <div style="font-size: 12px; color: #86868b; margin-bottom: 4px;">COMPRIMIDO</div>
                        <div style="font-size: 18px; font-weight: 700; color: #1d1d1f;">${formatBytes(compressedSize)}</div>
                    </div>
                    <div style="font-size: 24px; color: #0071e3;">→</div>
                    <div style="text-align: center;">
                        <div style="font-size: 12px; color: #86868b; margin-bottom: 4px;">ORIGINAL</div>
                        <div style="font-size: 18px; font-weight: 700; color: #30d158;">${formatBytes(decompressed.length)}</div>
                    </div>
                </div>
                <div style="padding: 8px; background: #f0f0f0; border-radius: 8px; font-size: 13px; color: #666;">
                    📄 ${fileName}
                </div>
            </div>
        `;

        hideProgress();
        showResult(message, 'success');
    } catch (error) {
        console.error(error);
        hideProgress();
        showResult('❌ Erro ao descomprimir arquivo: ' + error.message, 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
        compressor.setProgressCallback(null);
    }
});

// Utility functions
function showResult(message, type) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = message;
    resultDiv.className = 'result ' + type;
    resultDiv.style.display = 'block';

    // Scroll to result
    setTimeout(() => {
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
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
