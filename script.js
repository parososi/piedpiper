/**
 * Pied Piper Web Interface v2.0
 * Compression and decompression logic using WebAssembly
 */

let selectedFileCompress = null;
let selectedFileDecompress = null;

// --- Web Worker Initialization ---
let compressionWorker = null;
let workerReadyPromise = null;

function initializeWorker() {
    if (!compressionWorker) {
        try {
            compressionWorker = new Worker('lib/compression-worker.js');

            workerReadyPromise = new Promise((resolve, reject) => {
                const readinessTimeout = setTimeout(() => {
                    reject(new Error('Worker initialization timed out.'));
                }, 10000); // 10-second timeout

                compressionWorker.onmessage = (e) => {
                    if (e.data.type === 'ready') {
                        clearTimeout(readinessTimeout);
                        console.log('Compression worker is ready.');
                        resolve(compressionWorker);
                    }
                };

                compressionWorker.onerror = (err) => {
                    clearTimeout(readinessTimeout);
                    console.error("Error initializing worker:", err);
                    reject(err);
                };
            });
        } catch (error) {
            console.error('Failed to create Web Worker:', error);
            workerReadyPromise = Promise.reject(error);
        }
    }
    return workerReadyPromise;
}

// Initialize the worker as soon as the script loads
initializeWorker().catch(err => {
    showResult('Could not initialize the compression engine. Please refresh the page.', 'error');
});

// --- Worker Communication ---
function callWorker(action, data, level) {
    return new Promise(async (resolve, reject) => {
        try {
            const worker = await workerReadyPromise;
            if (!worker) {
                 return reject(new Error("Worker not available."));
            }

            // Generate a unique ID for this job
            const jobId = Date.now() + Math.random();

            const messageHandler = (e) => {
                // Ensure the message is for this job
                if (e.data.jobId !== jobId) return;

                const { type, data: resultData, message, stats } = e.data;
                if (type === 'progress') {
                    updateProgress(resultData);
                } else if (type === 'complete') {
                    worker.removeEventListener('message', messageHandler);
                    resolve(action === 'compress' ? { data: new Uint8Array(resultData), stats } : new Uint8Array(resultData));
                } else if (type === 'error') {
                    worker.removeEventListener('message', messageHandler);
                    reject(new Error(message));
                }
            };

            worker.addEventListener('message', messageHandler);

            // Post the job to the worker
            // The data buffer is transferred, not copied
            worker.postMessage({
                jobId,
                action,
                data: data,
                level
            }, [data.buffer]);

        } catch (error) {
            reject(error);
        }
    });
}

// --- UI Mode Switching ---
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

// --- File Handling ---
function setupDropZone(zoneId, inputId, nameId, fileHandler) {
    const dropZone = document.getElementById(zoneId);
    const fileInput = document.getElementById(inputId);
    const fileName = document.getElementById(nameId);

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            fileHandler(e.dataTransfer.files[0]);
        }
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            fileHandler(e.target.files[0]);
        }
    });
}

function handleFileCompress(file) {
    if (!file) return;
     // 1GB limit
    if (file.size > 1024 * 1024 * 1024) {
       showResult('File is too large. Please select a file up to 1GB.', 'error');
       return;
    }
    selectedFileCompress = file;
    document.getElementById('file-name-compress').innerHTML = `<strong>${file.name}</strong><br><small>${formatBytes(file.size)}</small>`;
}

function handleFileDecompress(file) {
    if (!file) return;
    if (!file.name.endsWith('.pp')) {
        showResult('Please select a valid .pp file.', 'error');
        return;
    }
    selectedFileDecompress = file;
     document.getElementById('file-name-decompress').innerHTML = `<strong>${file.name}</strong><br><small>${formatBytes(file.size)}</small>`;
}

setupDropZone('drop-compress', 'file-compress', 'file-name-compress', handleFileCompress);
setupDropZone('drop-decompress', 'file-decompress', 'file-name-decompress', handleFileDecompress);

// --- Password Toggles ---
document.getElementById('use-pass-compress').addEventListener('change', (e) => {
    document.getElementById('pass-compress').disabled = !e.target.checked;
});
document.getElementById('use-pass-decompress').addEventListener('change', (e) => {
    document.getElementById('pass-decompress').disabled = !e.target.checked;
});

// --- UI Updates ---
function showProgress() {
    document.getElementById('progress-container').style.display = 'block';
    hideResult();
}

function hideProgress() {
    document.getElementById('progress-container').style.display = 'none';
}

function updateProgress({ stage, percent, message }) {
    document.getElementById('progress-fill').style.width = percent + '%';
    document.getElementById('progress-percent').textContent = Math.floor(percent) + '%';
    document.getElementById('progress-stage').textContent = stage;
    document.getElementById('progress-message').textContent = message;
}

function showResult(message, type) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = message;
    resultDiv.className = `result ${type}`;
    resultDiv.style.display = 'block';
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideResult() {
    document.getElementById('result').style.display = 'none';
}


// --- Main Actions (Compression / Decompression) ---
async function performAction(buttonId, file, action) {
    if (!file) {
        showResult(`Please select a file to ${action}.`, 'error');
        return;
    }

    const button = document.getElementById(buttonId);
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<i class="ri-loader-4-line"></i> <span>${action === 'compress' ? 'Compressing' : 'Decompressing'}...</span>`;

    showProgress();
    updateProgress({ stage: 'INIT', percent: 0, message: 'Reading file...' });

    try {
        const arrayBuffer = await file.arrayBuffer();
        const inputData = new Uint8Array(arrayBuffer);

        if (action === 'compress') {
            await handleCompression(inputData, file.name);
        } else {
            await handleDecompression(inputData, file.name);
        }
    } catch (error) {
        console.error(`${action} failed:`, error);
        hideProgress();
        showResult(`An error occurred during ${action}: ${error.message}`, 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

async function handleCompression(inputData, fileName) {
    const originalSize = inputData.length;

    // Call the worker to compress
    const { data: compressedData } = await callWorker('compress', inputData, 9);

    // Handle encryption
    const usePassword = document.getElementById('use-pass-compress').checked;
    const password = document.getElementById('pass-compress').value;
    let finalData = compressedData;

    if (usePassword && password) {
         updateProgress({ stage: 'ENCRYPTING', percent: 95, message: 'Adding AES-256 encryption...' });
        const wordArray = CryptoJS.lib.WordArray.create(finalData);
        const encrypted = CryptoJS.AES.encrypt(wordArray, password).toString();
        const encryptedBytes = new TextEncoder().encode(encrypted);
        finalData = new Uint8Array(1 + encryptedBytes.length);
        finalData[0] = 0x01; // Encrypted flag
        finalData.set(encryptedBytes, 1);
    } else {
         // Add no-encryption flag
        const temp = new Uint8Array(1 + finalData.length);
        temp[0] = 0x00; // Not encrypted flag
        temp.set(finalData, 1);
        finalData = temp;
    }

    // Download the result
    downloadFile(finalData, fileName + '.pp');

    // Display results
    hideProgress();
    showCompressionSuccess(originalSize, finalData.length);
}

async function handleDecompression(inputData, fileName) {
    const compressedSize = inputData.length;
    let dataToDecompress = inputData;

    // Handle decryption
    const encryptedFlag = inputData[0];
    if (encryptedFlag === 0x01) {
        const usePassword = document.getElementById('use-pass-decompress').checked;
        const password = document.getElementById('pass-decompress').value;

        if (!usePassword || !password) {
            throw new Error('This file is password-protected.');
        }

        updateProgress({ stage: 'DECRYPTING', percent: 5, message: 'Decrypting AES-256...' });

        try {
            const encryptedStr = new TextDecoder().decode(inputData.slice(1));
            const decrypted = CryptoJS.AES.decrypt(encryptedStr, password);
            if (!decrypted || decrypted.sigBytes <= 0) {
                 throw new Error('Incorrect password or corrupted file.');
            }
            dataToDecompress = convertWordArrayToUint8Array(decrypted);
        } catch (err) {
            console.error(err);
            throw new Error('Incorrect password or corrupted file.');
        }
    } else {
       dataToDecompress = inputData.slice(1);
    }

    // Call the worker to decompress
    const decompressedData = await callWorker('decompress', dataToDecompress);

    // Download the result
    downloadFile(decompressedData, fileName.replace(/\.pp$/, ''));

    // Display results
    hideProgress();
    showDecompressionSuccess(compressedSize, decompressedData.length, fileName.replace(/\.pp$/, ''));
}


document.getElementById('btn-compress').addEventListener('click', () => performAction('btn-compress', selectedFileCompress, 'compress'));
document.getElementById('btn-decompress').addEventListener('click', () => performAction('btn-decompress', selectedFileDecompress, 'decompress'));


// --- Utility and Display Functions ---
function downloadFile(data, fileName) {
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function showCompressionSuccess(originalSize, finalSize) {
    const savedBytes = originalSize - finalSize;
    const savedPercentage = originalSize > 0 ? (savedBytes / originalSize * 100).toFixed(1) : 0;
    const isSmaller = finalSize < originalSize;
    const compressionRatio = originalSize > 0 ? (finalSize / originalSize * 100).toFixed(1) : 0;

    const message = `
        <div style="text-align: center;">
            <div style="font-size: 28px; margin-bottom: 12px;">✅</div>
            <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Compressão Concluída!</div>
            <div style="display: flex; justify-content: space-around; align-items: center; margin: 20px 0; padding: 20px; background: #f0f8ff; border-radius: 16px;">
                <div>Tamanho Original: <strong>${formatBytes(originalSize)}</strong></div>
                <div>Tamanho Final: <strong>${formatBytes(finalSize)}</strong></div>
            </div>
            ${isSmaller ? `
                <div style="padding: 16px; background: #e8f5e9; color: #2e7d32; border-radius: 12px;">
                    <strong>Economia de ${formatBytes(savedBytes)} (${savedPercentage}%)</strong>
                </div>
            ` : `
                <div style="padding: 16px; background: #fff3e0; color: #e65100; border-radius: 12px;">
                    <strong>O arquivo aumentou em ${formatBytes(Math.abs(savedBytes))}.</strong>
                    <p><small>Isso pode acontecer com arquivos já comprimidos.</small></p>
                </div>
            `}
        </div>
    `;
    showResult(message, 'success');
}

function showDecompressionSuccess(compressedSize, originalSize, fileName) {
    const message = `
        <div style="text-align: center;">
            <div style="font-size: 28px; margin-bottom: 12px;">✅</div>
            <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Descompressão Concluída!</div>
            <div style="padding: 8px; background: #f0f0f0; border-radius: 8px; font-size: 13px; color: #666;">
                📄 ${fileName}
            </div>
            <div style="display: flex; justify-content: space-around; align-items: center; margin-top: 20px; padding: 16px; background: #f0f8ff; border-radius: 12px;">
                 <div>Tamanho Comprimido: <strong>${formatBytes(compressedSize)}</strong></div>
                 <div>Tamanho Original: <strong>${formatBytes(originalSize)}</strong></div>
            </div>
        </div>
    `;
    showResult(message, 'success');
}


function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function convertWordArrayToUint8Array(wordArray) {
    const l = wordArray.sigBytes;
    const u8_array = new Uint8Array(l);
    for (let i = 0; i < l; i++) {
        u8_array[i] = (wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }
    return u8_array;
}

// Initial UI setup
hideResult();
hideProgress();
