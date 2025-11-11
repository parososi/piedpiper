// lib/compression-worker.js

importScripts('piedpiper.js');

let compress, decompress, malloc, free;

Module.onRuntimeInitialized = () => {
    compress = Module.cwrap('pp_compress', 'number', ['number', 'number', 'number', 'number', 'number']);
    decompress = Module.cwrap('pp_decompress', 'number', ['number', 'number', 'number', 'number']);
    malloc = Module._malloc;
    free = Module._free;
    postMessage({ type: 'ready' });
};

self.progressCallback = (percent) => {
    postMessage({
        type: 'progress',
        data: {
            stage: 'COMPRESSING',
            percent: percent,
            message: `Processing... ${percent}%`
        }
    });
};

self.addEventListener('message', (e) => {
    const { action, data, level, jobId } = e.data;

    if (!compress || !decompress) {
        postMessage({ type: 'error', message: 'WASM module not ready.', jobId });
        return;
    }

    try {
        const input = new Uint8Array(data);
        const inputSize = input.length;
        const inputPtr = malloc(inputSize);
        Module.HEAPU8.set(input, inputPtr);
        const outputSizePtr = malloc(4);

        let resultData;

        if (action === 'compress') {
            const initialOutputSize = inputSize * 1.2 + 1024; // A better guess
            let outputPtr = malloc(initialOutputSize);
            Module.setValue(outputSizePtr, initialOutputSize, 'i32');

            let result = compress(inputPtr, inputSize, outputPtr, outputSizePtr, level || 6);

            if (result === -2) { // Buffer too small
                const requiredSize = Module.getValue(outputSizePtr, 'i32');
                free(outputPtr);
                outputPtr = malloc(requiredSize);
                Module.setValue(outputSizePtr, requiredSize, 'i32');
                result = compress(inputPtr, inputSize, outputPtr, outputSizePtr, level || 6);
            }

            if (result !== 0) throw new Error(`Compression failed: code ${result}`);

            const compressedSize = Module.getValue(outputSizePtr, 'i32');
            resultData = new Uint8Array(Module.HEAPU8.subarray(outputPtr, outputPtr + compressedSize));
            free(outputPtr);

        } else if (action === 'decompress') {
            const uncompressedSize = new DataView(input.buffer, 4, 4).getUint32(0, true);
            if (!uncompressedSize || uncompressedSize > 1024 * 1024 * 1024) { // 1GB sanity check
                throw new Error('Invalid uncompressed size in header.');
            }

            const outputPtr = malloc(uncompressedSize);
            Module.setValue(outputSizePtr, uncompressedSize, 'i32');

            const result = decompress(inputPtr, inputSize, outputPtr, outputSizePtr);
            if (result !== 0) throw new Error(`Decompression failed: code ${result}`);

            const decompressedSize = Module.getValue(outputSizePtr, 'i32');
            resultData = new Uint8Array(Module.HEAPU8.subarray(outputPtr, outputPtr + decompressedSize));
            free(outputPtr);
        }

        free(inputPtr);
        free(outputSizePtr);

        postMessage({ type: 'complete', data: resultData.buffer, jobId }, [resultData.buffer]);

    } catch (error) {
        postMessage({ type: 'error', message: error.message, stack: error.stack, jobId });
    }
});
