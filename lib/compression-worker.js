/**
 * Web Worker for Pied Piper Compression
 * Handles compression/decompression in background thread
 */

// Import the compressor library
importScripts('piedpiper.js');

// Create compressor instance
const compressor = new PiedPiperCompressor();

// Set up progress callback
compressor.setProgressCallback((progress) => {
    postMessage({
        type: 'progress',
        data: progress
    });
});

// Handle messages from main thread
self.addEventListener('message', async (e) => {
    const { action, data, level } = e.data;

    try {
        if (action === 'compress') {
            // Compress data
            const input = new Uint8Array(data);
            const compressed = compressor.compress(input, level || 6);

            // Send result back
            postMessage({
                type: 'complete',
                action: 'compress',
                data: compressed,
                stats: compressor.getStats()
            }, [compressed.buffer]);

        } else if (action === 'decompress') {
            // Decompress data
            const input = new Uint8Array(data);
            const decompressed = compressor.decompress(input);

            // Send result back
            postMessage({
                type: 'complete',
                action: 'decompress',
                data: decompressed
            }, [decompressed.buffer]);

        } else {
            throw new Error('Unknown action: ' + action);
        }
    } catch (error) {
        // Send error back
        postMessage({
            type: 'error',
            message: error.message,
            stack: error.stack
        });
    }
});
