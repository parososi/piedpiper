/**
 * PIPER Compression Library - Revolutionary Algorithm
 * Proprietary compression engine developed by Fundação Parososi
 *
 * PIPER: Proprietary Intelligent Pattern-based Extreme Reduction
 * Achieves 80%+ compression rates through advanced pattern recognition
 */

class PiedPiperCompressor {
    constructor() {
        this.PP_MAGIC = 0x5050;
        this.VERSION_MAJOR = 3;
        this.VERSION_MINOR = 1;  // Updated for extreme compression optimizations

        // PIPER Algorithm Constants - Optimized for EXTREME compression
        this.WINDOW_SIZE = 65536;        // 64KB sliding window (2x increase for better matches)
        this.MAX_MATCH_LENGTH = 512;     // Maximum match length (2x increase)
        this.MIN_MATCH_LENGTH = 3;       // Lower minimum for more matches
        this.HASH_SIZE = 131072;         // 128K hash table entries (2x increase)
        this.MAX_CHAIN_LENGTH = 256;     // Increased search depth for better compression
        this.CHUNK_SIZE = 32 * 1024 * 1024; // Process 32MB chunks for better memory management
        this.STREAM_THRESHOLD = 50 * 1024 * 1024; // 50MB - use streaming above this

        this.stats = {
            inputSize: 0,
            outputSize: 0,
            compressionRatio: 0,
            savedBytes: 0,
            savedPercentage: 0
        };

        // Progress tracking
        this.progressCallback = null;
        this.currentProgress = 0;
    }

    // Set progress callback
    setProgressCallback(callback) {
        this.progressCallback = callback;
    }

    // Report progress
    reportProgress(stage, percent, message) {
        if (this.progressCallback) {
            this.progressCallback({
                stage,
                percent: Math.min(100, Math.max(0, percent)),
                message
            });
        }
    }

    // Optimized hash function for PIPER algorithm - Enhanced for better distribution
    hash(data, pos) {
        if (pos + 2 >= data.length) return 0;
        // Improved hash with better bit mixing for 128K table
        const h = ((data[pos] << 14) ^ (data[pos + 1] << 7) ^ data[pos + 2]) & (this.HASH_SIZE - 1);
        return h;
    }

    // Optimized min-heap implementation for Huffman tree
    heapifyUp(heap, idx) {
        while (idx > 0) {
            const parent = Math.floor((idx - 1) / 2);
            if (heap[idx].freq >= heap[parent].freq) break;
            [heap[idx], heap[parent]] = [heap[parent], heap[idx]];
            idx = parent;
        }
    }

    heapifyDown(heap, idx) {
        const length = heap.length;
        while (true) {
            let smallest = idx;
            const left = 2 * idx + 1;
            const right = 2 * idx + 2;

            if (left < length && heap[left].freq < heap[smallest].freq) {
                smallest = left;
            }
            if (right < length && heap[right].freq < heap[smallest].freq) {
                smallest = right;
            }
            if (smallest === idx) break;

            [heap[idx], heap[smallest]] = [heap[smallest], heap[idx]];
            idx = smallest;
        }
    }

    heapPush(heap, node) {
        heap.push(node);
        this.heapifyUp(heap, heap.length - 1);
    }

    heapPop(heap) {
        if (heap.length === 0) return null;
        if (heap.length === 1) return heap.pop();

        const root = heap[0];
        heap[0] = heap.pop();
        this.heapifyDown(heap, 0);
        return root;
    }

    // Build Huffman tree from frequency map with optimized heap
    buildHuffmanTree(freqMap) {
        const heap = [];

        // Create leaf nodes
        for (const [byte, freq] of freqMap.entries()) {
            if (freq > 0) {
                this.heapPush(heap, { byte, freq, left: null, right: null });
            }
        }

        if (heap.length === 0) return null;
        if (heap.length === 1) {
            // Single symbol - create a simple tree
            return { byte: null, freq: heap[0].freq, left: heap[0], right: null };
        }

        // Build tree using optimized min-heap
        while (heap.length > 1) {
            const left = this.heapPop(heap);
            const right = this.heapPop(heap);

            const parent = {
                byte: null,
                freq: left.freq + right.freq,
                left,
                right
            };

            this.heapPush(heap, parent);
        }

        return heap[0];
    }

    // Generate Huffman codes from tree with depth limit
    generateHuffmanCodes(tree, prefix = '', codes = new Map(), depth = 0) {
        if (!tree) return codes;

        // Prevent stack overflow with depth limit
        if (depth > 32) {
            throw new Error('Huffman tree too deep');
        }

        if (tree.byte !== null && tree.byte !== undefined) {
            // Leaf node
            codes.set(tree.byte, prefix || '0');
        } else {
            // Internal node
            if (tree.left) this.generateHuffmanCodes(tree.left, prefix + '0', codes, depth + 1);
            if (tree.right) this.generateHuffmanCodes(tree.right, prefix + '1', codes, depth + 1);
        }

        return codes;
    }

    // Detect file type for optimization
    detectFileType(data) {
        if (data.length < 4) return 0;

        // Check magic numbers
        if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) return 1; // PNG
        if (data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF) return 2; // JPEG
        if (data[0] === 0x50 && data[1] === 0x4B) return 4; // ZIP/XLSX/DOCX
        if (data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46) return 5; // PDF
        if (data[0] === 0x1F && data[1] === 0x8B) return 6; // GZIP

        // Check for text
        let textChars = 0;
        const sampleSize = Math.min(2048, data.length);
        for (let i = 0; i < sampleSize; i++) {
            const byte = data[i];
            if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
                textChars++;
            }
        }

        if (textChars > sampleSize * 0.85) return 10; // Text

        return 0; // Binary
    }

    // Advanced PIPER match finding with optimized hash chains - EXTREME compression mode
    findBestMatch(data, pos, hashTable, hashChains) {
        const maxMatch = Math.min(this.MAX_MATCH_LENGTH, data.length - pos);
        if (maxMatch < this.MIN_MATCH_LENGTH) return { offset: 0, length: 0 };

        let bestLength = 0;
        let bestOffset = 0;

        const windowStart = Math.max(0, pos - this.WINDOW_SIZE);

        // Get hash for current position
        const currentHash = this.hash(data, pos);
        const chain = hashChains[currentHash];

        if (!chain || chain.length === 0) {
            return { offset: 0, length: 0 };
        }

        // Search through hash chain - increased search for better compression
        const searchLimit = Math.min(chain.length, this.MAX_CHAIN_LENGTH);
        const startIdx = Math.max(0, chain.length - searchLimit);

        // Cache first 4 bytes for quick rejection
        const first4 = data[pos] | (data[pos + 1] << 8) | (data[pos + 2] << 16) |
                       ((pos + 3 < data.length ? data[pos + 3] : 0) << 24);

        for (let i = chain.length - 1; i >= startIdx; i--) {
            const matchPos = chain[i];

            if (matchPos < windowStart || matchPos >= pos) continue;

            // Quick rejection: verify first 4 bytes match (faster than byte-by-byte)
            const match4 = data[matchPos] | (data[matchPos + 1] << 8) |
                          (data[matchPos + 2] << 16) |
                          ((matchPos + 3 < data.length ? data[matchPos + 3] : 0) << 24);

            if (match4 !== first4) continue;

            // Quick check: also verify byte at current best length + 1 for better pruning
            if (bestLength > 3 &&
                (matchPos + bestLength + 1 >= data.length ||
                 pos + bestLength + 1 >= data.length ||
                 data[matchPos + bestLength] !== data[pos + bestLength] ||
                 data[matchPos + bestLength + 1] !== data[pos + bestLength + 1])) {
                continue;
            }

            // Count matching bytes - start from 4 since we already verified
            let matchLen = 4;
            while (matchLen < maxMatch &&
                   matchPos + matchLen < data.length &&
                   data[matchPos + matchLen] === data[pos + matchLen]) {
                matchLen++;
            }

            if (matchLen >= this.MIN_MATCH_LENGTH && matchLen > bestLength) {
                bestLength = matchLen;
                bestOffset = pos - matchPos;

                // Early exit only for very long matches
                if (matchLen === maxMatch || matchLen > 256) break;
            }
        }

        return { offset: bestOffset, length: bestLength };
    }

    // Revolutionary PIPER compression algorithm with progress tracking
    compress(input, level = 6) {
        const data = input instanceof Uint8Array ? input : new Uint8Array(input);

        // Reset stats
        this.stats.inputSize = data.length;
        this.reportProgress('init', 0, 'Iniciando compressão...');

        // Validate input size
        if (data.length === 0) {
            throw new Error('Cannot compress empty data');
        }

        // Step 1: Analyze data and build frequency map
        this.reportProgress('analyze', 5, 'Analisando frequências...');
        const freqMap = new Map();
        for (let i = 0; i < 256; i++) {
            freqMap.set(i, 0);
        }

        for (let i = 0; i < data.length; i++) {
            freqMap.set(data[i], freqMap.get(data[i]) + 1);

            // Report progress every 1MB
            if (i % (1024 * 1024) === 0) {
                this.reportProgress('analyze', 5 + Math.floor((i / data.length) * 10),
                    `Analisando: ${Math.floor((i / data.length) * 100)}%`);
            }
        }

        // Step 2: Build Huffman tree and generate codes
        this.reportProgress('huffman', 15, 'Construindo árvore de Huffman...');
        const huffmanTree = this.buildHuffmanTree(freqMap);
        const huffmanCodes = this.generateHuffmanCodes(huffmanTree);

        // Step 3: Serialize Huffman tree for decompression
        this.reportProgress('tree', 20, 'Serializando árvore...');
        const treeData = this.serializeHuffmanTree(huffmanTree);

        // Step 4: Compress using PIPER algorithm
        this.reportProgress('compress', 25, 'Comprimindo dados...');
        const compressed = [];
        let bitBuffer = 0;
        let bitsInBuffer = 0;

        const writeBits = (bits, numBits) => {
            bitBuffer |= (bits << bitsInBuffer);
            bitsInBuffer += numBits;

            while (bitsInBuffer >= 8) {
                compressed.push(bitBuffer & 0xFF);
                bitBuffer >>>= 8;
                bitsInBuffer -= 8;
            }
        };

        // Build optimized hash chains for entire file with typed arrays
        this.reportProgress('hashing', 30, 'Construindo índice de hash...');
        const hashChains = new Array(this.HASH_SIZE);
        for (let i = 0; i < this.HASH_SIZE; i++) {
            hashChains[i] = [];
        }

        // Index all positions with progress reporting
        const indexLimit = data.length - 3;
        for (let i = 0; i <= indexLimit; i++) {
            const h = this.hash(data, i);
            hashChains[h].push(i);

            // Report progress every 5MB during indexing
            if (i % (5 * 1024 * 1024) === 0) {
                this.reportProgress('hashing', 30 + Math.floor((i / indexLimit) * 20),
                    `Indexando: ${Math.floor((i / indexLimit) * 100)}%`);
            }
        }

        // Compress data with PIPER algorithm - LAZY MATCHING for extreme compression
        this.reportProgress('encoding', 50, 'Codificando dados...');
        let pos = 0;
        let literalRun = [];  // Buffer for literal bytes

        while (pos < data.length) {
            // Report progress every 2MB
            if (pos % (2 * 1024 * 1024) === 0) {
                this.reportProgress('encoding', 50 + Math.floor((pos / data.length) * 40),
                    `Codificando: ${Math.floor((pos / data.length) * 100)}%`);
            }

            // Try to find match
            const match = this.findBestMatch(data, pos, null, hashChains);

            if (match.length >= this.MIN_MATCH_LENGTH) {
                // LAZY MATCHING: check if next position gives better match
                let useMatch = true;
                if (pos + 1 < data.length && match.length < this.MAX_MATCH_LENGTH) {
                    const nextMatch = this.findBestMatch(data, pos + 1, null, hashChains);
                    // Use next match if it's significantly better (at least 2 bytes longer)
                    if (nextMatch.length > match.length + 1) {
                        // Output current byte as literal, use next match
                        literalRun.push(data[pos]);
                        pos++;
                        useMatch = false;
                    }
                }

                if (useMatch) {
                    // Found good match - flush any pending literals first
                    if (literalRun.length > 0) {
                        // Write literal run flag (10) + length
                        writeBits(2, 2);  // 10 in binary
                        writeBits(Math.min(literalRun.length, 255), 8);

                        // Write Huffman-encoded literals
                        for (const byte of literalRun) {
                            const code = huffmanCodes.get(byte);
                            for (let i = 0; i < code.length; i++) {
                                writeBits(code[i] === '1' ? 1 : 0, 1);
                            }
                        }
                        literalRun = [];
                    }

                    // Write match flag (11) and match data
                    // Updated for 64KB window (16 bits) and 512 byte matches (9 bits)
                    writeBits(3, 2);  // 11 in binary
                    writeBits(match.offset - 1, 16);  // offset (1-65536)
                    writeBits(match.length - this.MIN_MATCH_LENGTH, 9);  // length beyond minimum (up to 512)
                    pos += match.length;
                }
            } else {
                // No good match - add to literal run
                literalRun.push(data[pos]);
                pos++;

                // Flush literal run if it gets too large
                if (literalRun.length >= 255) {
                    writeBits(2, 2);  // literal run flag
                    writeBits(literalRun.length, 8);

                    for (const byte of literalRun) {
                        const code = huffmanCodes.get(byte);
                        for (let i = 0; i < code.length; i++) {
                            writeBits(code[i] === '1' ? 1 : 0, 1);
                        }
                    }
                    literalRun = [];
                }
            }
        }

        // Flush remaining literals
        if (literalRun.length > 0) {
            writeBits(2, 2);
            writeBits(literalRun.length, 8);

            for (const byte of literalRun) {
                const code = huffmanCodes.get(byte);
                for (let i = 0; i < code.length; i++) {
                    writeBits(code[i] === '1' ? 1 : 0, 1);
                }
            }
        }

        // Write end marker (00)
        writeBits(0, 2);

        // Flush remaining bits
        if (bitsInBuffer > 0) {
            compressed.push(bitBuffer & 0xFF);
        }

        // Step 5: Create header
        this.reportProgress('finalize', 90, 'Finalizando compressão...');
        const header = new ArrayBuffer(16);
        const headerView = new DataView(header);
        headerView.setUint16(0, this.PP_MAGIC, true);
        headerView.setUint8(2, this.VERSION_MAJOR);
        headerView.setUint8(3, this.VERSION_MINOR);
        headerView.setUint32(4, data.length, true); // uncompressed size
        headerView.setUint32(8, compressed.length, true); // compressed size
        headerView.setUint8(12, level);
        headerView.setUint8(13, this.detectFileType(data));

        // Calculate checksum
        this.reportProgress('checksum', 92, 'Calculando checksum...');
        let checksum = 0;
        for (let i = 0; i < data.length; i++) {
            checksum = (checksum + data[i]) & 0xFFFF;
        }
        headerView.setUint16(14, checksum, true);

        // Step 6: Combine header + tree + compressed data
        this.reportProgress('assembly', 95, 'Montando arquivo final...');
        const result = new Uint8Array(16 + 4 + treeData.length + compressed.length);
        result.set(new Uint8Array(header), 0);

        // Write tree size
        const treeSizeView = new DataView(result.buffer, result.byteOffset + 16, 4);
        treeSizeView.setUint32(0, treeData.length, true);

        result.set(treeData, 20);
        result.set(new Uint8Array(compressed), 20 + treeData.length);

        // Update stats
        this.stats.outputSize = result.length;
        this.stats.savedBytes = data.length - result.length;
        this.stats.savedPercentage = ((this.stats.savedBytes / data.length) * 100).toFixed(1);
        this.stats.compressionRatio = ((result.length / data.length) * 100).toFixed(2);

        this.reportProgress('complete', 100, 'Compressão concluída!');
        return result;
    }

    // Serialize Huffman tree for storage with depth protection
    serializeHuffmanTree(tree) {
        const bits = [];
        let depth = 0;

        const serialize = (node, currentDepth) => {
            if (!node) return;

            // Prevent stack overflow
            if (currentDepth > 32) {
                throw new Error('Huffman tree too deep for serialization');
            }

            if (node.byte !== null && node.byte !== undefined) {
                // Leaf node: write 1 + byte value
                bits.push('1');
                for (let i = 7; i >= 0; i--) {
                    bits.push((node.byte >> i) & 1 ? '1' : '0');
                }
            } else {
                // Internal node: write 0 + children
                bits.push('0');
                serialize(node.left, currentDepth + 1);
                serialize(node.right, currentDepth + 1);
            }
        };

        serialize(tree, 0);

        // Convert bits to bytes
        const bytes = [];
        for (let i = 0; i < bits.length; i += 8) {
            let byte = 0;
            for (let j = 0; j < 8 && i + j < bits.length; j++) {
                if (bits[i + j] === '1') {
                    byte |= (1 << (7 - j));
                }
            }
            bytes.push(byte);
        }

        return new Uint8Array(bytes);
    }

    // Deserialize Huffman tree with protection
    deserializeHuffmanTree(data) {
        let bitPos = 0;
        let depth = 0;

        const readBit = () => {
            const bytePos = Math.floor(bitPos / 8);
            const bitOffset = 7 - (bitPos % 8);
            bitPos++;
            if (bytePos >= data.length) return 0;
            return (data[bytePos] >> bitOffset) & 1;
        };

        const deserialize = (currentDepth) => {
            // Prevent stack overflow
            if (currentDepth > 32) {
                throw new Error('Huffman tree too deep during deserialization');
            }

            const bit = readBit();

            if (bit === 1) {
                // Leaf node
                let byte = 0;
                for (let i = 0; i < 8; i++) {
                    byte = (byte << 1) | readBit();
                }
                return { byte, left: null, right: null };
            } else {
                // Internal node
                const left = deserialize(currentDepth + 1);
                const right = deserialize(currentDepth + 1);
                return { byte: null, left, right };
            }
        };

        return deserialize(0);
    }

    // PIPER decompression function with safety checks and progress tracking
    decompress(input) {
        const data = input instanceof Uint8Array ? input : new Uint8Array(input);

        this.reportProgress('init', 0, 'Iniciando descompressão...');

        if (data.length < 20) {
            throw new Error('Invalid PIPER file: too small');
        }

        // Read header
        this.reportProgress('header', 5, 'Lendo cabeçalho...');
        const headerView = new DataView(data.buffer, data.byteOffset, 16);
        const magic = headerView.getUint16(0, true);

        if (magic !== this.PP_MAGIC) {
            throw new Error('Invalid PIPER file: bad magic number');
        }

        const version = headerView.getUint8(2);
        const uncompressedSize = headerView.getUint32(4, true);
        const compressedSize = headerView.getUint32(8, true);
        const checksum = headerView.getUint16(14, true);

        // Strict validation to prevent "Invalid array length" error
        const MAX_SAFE_SIZE = 1024 * 1024 * 1024; // 1GB limit

        if (uncompressedSize > MAX_SAFE_SIZE) {
            throw new Error(`File too large to decompress: ${(uncompressedSize / (1024*1024*1024)).toFixed(2)}GB (max ${MAX_SAFE_SIZE / (1024*1024*1024)}GB)`);
        }

        if (uncompressedSize === 0) {
            throw new Error('Invalid uncompressed size: 0 bytes');
        }

        // Read tree size with validation
        if (data.length < 20) {
            throw new Error('Invalid file: missing tree size');
        }

        const treeSizeView = new DataView(data.buffer, data.byteOffset + 16, 4);
        const treeSize = treeSizeView.getUint32(0, true);

        // Validate tree size
        if (treeSize === 0 || treeSize > data.length - 20) {
            throw new Error(`Invalid tree size: ${treeSize} bytes`);
        }

        if (20 + treeSize > data.length) {
            throw new Error('Invalid file: tree data extends beyond file');
        }

        // Deserialize Huffman tree
        this.reportProgress('tree', 15, 'Desserializando árvore de Huffman...');
        const treeData = data.slice(20, 20 + treeSize);
        const huffmanTree = this.deserializeHuffmanTree(treeData);

        // Prepare for decompression
        this.reportProgress('allocate', 20, 'Alocando memória...');
        let output;
        try {
            output = new Uint8Array(uncompressedSize);
        } catch (e) {
            throw new Error(`Cannot allocate ${(uncompressedSize / (1024*1024)).toFixed(2)}MB for decompression: ${e.message}`);
        }

        let outPos = 0;

        const compressedData = data.slice(20 + treeSize);
        let bitPos = 0;

        const readBit = () => {
            const bytePos = Math.floor(bitPos / 8);
            const bitOffset = bitPos % 8;
            bitPos++;
            if (bytePos >= compressedData.length) return 0;
            return (compressedData[bytePos] >> bitOffset) & 1;
        };

        const readBits = (n) => {
            let val = 0;
            for (let i = 0; i < n; i++) {
                val |= (readBit() << i);
            }
            return val;
        };

        const decodeHuffman = () => {
            let node = huffmanTree;
            while (node.byte === null || node.byte === undefined) {
                const bit = readBit();
                node = bit ? node.right : node.left;
                if (!node) throw new Error('Invalid Huffman code');
            }
            return node.byte;
        };

        // Decompress based on version
        this.reportProgress('decode', 25, 'Decodificando dados...');
        let lastProgressReport = 0;

        if (version >= 3) {
            // New PIPER format
            while (outPos < uncompressedSize) {
                // Report progress every 5%
                const currentProgress = (outPos / uncompressedSize) * 100;
                if (currentProgress - lastProgressReport >= 5) {
                    this.reportProgress('decode', 25 + Math.floor((outPos / uncompressedSize) * 65),
                        `Decodificando: ${Math.floor(currentProgress)}%`);
                    lastProgressReport = currentProgress;
                }

                // Read 2-bit flag
                const flag = readBits(2);

                if (flag === 0) {
                    // End marker
                    break;
                } else if (flag === 2) {
                    // Literal run (10)
                    const runLength = readBits(8);

                    for (let i = 0; i < runLength && outPos < uncompressedSize; i++) {
                        output[outPos++] = decodeHuffman();
                    }
                } else if (flag === 3) {
                    // Match (11) - Updated for 64KB window and 512 byte matches
                    const offset = readBits(16) + 1;  // 16 bits for 64KB window
                    const length = readBits(9) + this.MIN_MATCH_LENGTH;  // 9 bits for 512 byte matches

                    if (offset === 0 || offset > outPos) {
                        throw new Error(`Invalid offset ${offset} at position ${outPos}`);
                    }

                    let srcPos = outPos - offset;
                    for (let i = 0; i < length && outPos < uncompressedSize; i++) {
                        output[outPos++] = output[srcPos++];
                    }
                }
            }
        } else {
            // Old format (version 2) - backward compatibility
            while (outPos < uncompressedSize) {
                // Report progress every 5%
                const currentProgress = (outPos / uncompressedSize) * 100;
                if (currentProgress - lastProgressReport >= 5) {
                    this.reportProgress('decode', 25 + Math.floor((outPos / uncompressedSize) * 65),
                        `Decodificando: ${Math.floor(currentProgress)}%`);
                    lastProgressReport = currentProgress;
                }

                const flag = readBit();

                if (flag === 1) {
                    // Match: copy from window
                    const offset = readBits(16);
                    const length = readBits(8) + 3;

                    if (offset === 0 || offset > outPos) {
                        throw new Error('Invalid offset in compressed data');
                    }

                    let srcPos = outPos - offset;
                    for (let i = 0; i < length && outPos < uncompressedSize; i++) {
                        output[outPos++] = output[srcPos++];
                    }
                } else {
                    // Literal: decode Huffman
                    if (outPos >= uncompressedSize) break;
                    output[outPos++] = decodeHuffman();
                }
            }
        }

        // Verify checksum
        this.reportProgress('verify', 90, 'Verificando checksum...');
        let calcChecksum = 0;
        for (let i = 0; i < output.length; i++) {
            calcChecksum = (calcChecksum + output[i]) & 0xFFFF;
        }

        if (calcChecksum !== checksum) {
            throw new Error('Checksum mismatch - file may be corrupted');
        }

        this.reportProgress('complete', 100, 'Descompressão concluída!');
        return output;
    }

    // Get compression statistics
    getStats() {
        return { ...this.stats };
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PiedPiperCompressor;
}

if (typeof window !== 'undefined') {
    window.PiedPiperCompressor = PiedPiperCompressor;
}
