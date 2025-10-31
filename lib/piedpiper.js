/**
 * Pied Piper Compression Library (JavaScript Implementation)
 * Optimized for browser and Node.js environments
 *
 * This is a pure JavaScript implementation of the Pied Piper algorithm
 * for maximum compatibility. For best performance, use the C engine.
 */

class PiedPiperCompressor {
    constructor() {
        this.PP_MAGIC = 0x5050;
        this.VERSION_MAJOR = 1;
        this.VERSION_MINOR = 0;
        this.MAX_WINDOW_SIZE = 32768;
        this.MAX_LOOKAHEAD = 258;
        this.MIN_MATCH = 3;
        this.HASH_SIZE = 65536; // Increased from 32768 for better distribution
        this.HASH_SHIFT = 5;
        this.HASH_MASK = this.HASH_SIZE - 1;

        this.stats = {
            inputSize: 0,
            outputSize: 0,
            matchesFound: 0,
            literalsCount: 0,
            compressionRatio: 0
        };
    }

    // Optimized 3-byte rolling hash function
    hashFunc(data, pos) {
        if (pos + 2 >= data.length) return 0;
        // Use better hash distribution
        return ((data[pos] << 10) ^ (data[pos + 1] << 5) ^ data[pos + 2]) & this.HASH_MASK;
    }

    // Find longest match with lazy matching optimization
    findLongestMatch(data, pos, hashTable, prevTable, level = 6) {
        if (pos + this.MIN_MATCH > data.length) {
            return { offset: 0, length: 0 };
        }

        const hash = this.hashFunc(data, pos);
        let chainPos = hashTable[hash];
        let bestLen = 0;
        let bestOffset = 0;
        const maxMatch = Math.min(this.MAX_LOOKAHEAD, data.length - pos);

        // Chain limit based on compression level
        let chainLimit = level * 32; // Higher level = more exhaustive search

        while (chainPos >= 0 && chainLimit-- > 0) {
            const offset = pos - chainPos;

            if (offset > this.MAX_WINDOW_SIZE || offset === 0) break;

            // Quick check: verify last byte of potential match first (optimization)
            if (data[chainPos + bestLen] !== data[pos + bestLen]) {
                chainPos = prevTable[chainPos];
                continue;
            }

            // Check for match
            if (data[chainPos] === data[pos] &&
                data[chainPos + 1] === data[pos + 1] &&
                data[chainPos + 2] === data[pos + 2]) {

                let len = 3;
                // Optimized match length calculation
                while (len < maxMatch && data[chainPos + len] === data[pos + len]) {
                    len++;
                }

                if (len > bestLen) {
                    bestLen = len;
                    bestOffset = offset;

                    // Early exit if we found the maximum possible match
                    if (len === maxMatch) break;
                }
            }

            chainPos = prevTable[chainPos];
        }

        if (bestLen >= this.MIN_MATCH) {
            return { offset: bestOffset, length: bestLen };
        }

        return { offset: 0, length: 0 };
    }

    // Update hash chains
    updateHash(pos, data, hashTable, prevTable) {
        if (pos + 2 >= data.length) return;

        const hash = this.hashFunc(data, pos);
        prevTable[pos] = hashTable[hash];
        hashTable[hash] = pos;
    }

    // Detect file type for optimization hints
    detectFileType(data) {
        if (data.length < 4) return 0;

        // Check magic numbers/signatures
        if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) return 1; // PNG
        if (data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF) return 2; // JPEG
        if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) return 3; // GIF
        if (data[0] === 0x50 && data[1] === 0x4B) return 4; // ZIP/DOCX/etc
        if (data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46) return 5; // PDF
        if (data[0] === 0x1F && data[1] === 0x8B) return 6; // GZIP
        if (data[0] === 0x42 && data[1] === 0x5A && data[2] === 0x68) return 7; // BZIP2
        if (data[0] === 0x52 && data[1] === 0x61 && data[2] === 0x72 && data[3] === 0x21) return 8; // RAR

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

        return 0; // Unknown/Binary
    }

    // Optimized bit writer class
    createBitWriter() {
        const output = [];
        let bitBuffer = 0;
        let bitsInBuffer = 0;

        return {
            writeBits: (bits, numBits) => {
                bitBuffer |= (bits << bitsInBuffer);
                bitsInBuffer += numBits;

                while (bitsInBuffer >= 8) {
                    output.push(bitBuffer & 0xFF);
                    bitBuffer >>>= 8;
                    bitsInBuffer -= 8;
                }
            },
            flush: () => {
                if (bitsInBuffer > 0) {
                    output.push(bitBuffer & 0xFF);
                    bitBuffer = 0;
                    bitsInBuffer = 0;
                }
            },
            getOutput: () => new Uint8Array(output)
        };
    }

    // Main compression function with lazy matching
    compress(input, level = 6) {
        const data = input instanceof Uint8Array ? input : new Uint8Array(input);

        // Reset stats
        this.stats.inputSize = data.length;
        this.stats.matchesFound = 0;
        this.stats.literalsCount = 0;

        // Clamp level between 1-9
        level = Math.max(1, Math.min(9, level));

        // Create header
        const header = new ArrayBuffer(16);
        const headerView = new DataView(header);
        headerView.setUint16(0, this.PP_MAGIC, true);
        headerView.setUint8(2, this.VERSION_MAJOR);
        headerView.setUint8(3, this.VERSION_MINOR);
        headerView.setUint32(4, data.length, true); // uncompressed size
        headerView.setUint8(12, level);
        headerView.setUint8(13, this.detectFileType(data));

        // Initialize compression structures
        const hashTable = new Int32Array(this.HASH_SIZE).fill(-1);
        const prevTable = new Int32Array(data.length).fill(-1);
        const bitWriter = this.createBitWriter();

        // LZ77 compression with lazy matching
        let pos = 0;
        while (pos < data.length) {
            // Update hash for current position
            this.updateHash(pos, data, hashTable, prevTable);

            // Find best match at current position
            const match = this.findLongestMatch(data, pos, hashTable, prevTable, level);

            // Lazy matching: check if next position has a better match
            let useLazyMatch = false;
            if (match.length >= this.MIN_MATCH && match.length < this.MAX_LOOKAHEAD && pos + 1 < data.length) {
                this.updateHash(pos + 1, data, hashTable, prevTable);
                const nextMatch = this.findLongestMatch(data, pos + 1, hashTable, prevTable, level);

                // Use lazy match if next position offers significantly better compression
                if (nextMatch.length > match.length + 1) {
                    // Output current byte as literal
                    bitWriter.writeBits(0, 1);
                    bitWriter.writeBits(data[pos], 8);
                    this.stats.literalsCount++;
                    pos++;
                    useLazyMatch = true;
                }
            }

            if (!useLazyMatch) {
                if (match.length >= this.MIN_MATCH) {
                    // Write match: flag(1) + offset(15) + length(8)
                    bitWriter.writeBits(1, 1);
                    bitWriter.writeBits(match.offset, 15);
                    bitWriter.writeBits(match.length - this.MIN_MATCH, 8);
                    this.stats.matchesFound++;

                    // Update hash for all positions in match
                    for (let i = 1; i < match.length && pos + i < data.length; i++) {
                        this.updateHash(pos + i, data, hashTable, prevTable);
                    }

                    pos += match.length;
                } else {
                    // Write literal: flag(0) + byte(8)
                    bitWriter.writeBits(0, 1);
                    bitWriter.writeBits(data[pos], 8);
                    this.stats.literalsCount++;
                    pos++;
                }
            }
        }

        bitWriter.flush();
        const compressed = bitWriter.getOutput();

        // Calculate checksum (CRC-like)
        let checksum = 0;
        for (let i = 0; i < data.length; i++) {
            checksum = (checksum + data[i]) & 0xFFFF;
        }
        headerView.setUint16(14, checksum, true);

        // Update compressed size in header
        headerView.setUint32(8, compressed.length, true);

        // Combine header and compressed data
        const result = new Uint8Array(16 + compressed.length);
        result.set(new Uint8Array(header), 0);
        result.set(compressed, 16);

        this.stats.outputSize = result.length;
        this.stats.compressionRatio = (100 * result.length / data.length).toFixed(2);

        return result;
    }

    // Decompression function
    decompress(input) {
        const data = input instanceof Uint8Array ? input : new Uint8Array(input);

        if (data.length < 16) {
            throw new Error('Invalid Pied Piper file: too small');
        }

        // Read header
        const headerView = new DataView(data.buffer, data.byteOffset, 16);
        const magic = headerView.getUint16(0, true);

        if (magic !== this.PP_MAGIC) {
            throw new Error('Invalid Pied Piper file: bad magic number (0x' + magic.toString(16) + ')');
        }

        const uncompressedSize = headerView.getUint32(4, true);
        const compressedSize = headerView.getUint32(8, true);
        const checksum = headerView.getUint16(14, true);

        // Validate sizes
        if (uncompressedSize > 1024 * 1024 * 1024) { // 1GB limit
            throw new Error('File too large to decompress');
        }

        // Prepare output buffer
        const output = new Uint8Array(uncompressedSize);
        let outPos = 0;

        // Bit reader
        let inPtr = 16;
        let bitBuffer = 0;
        let bitsAvailable = 0;

        const readBits = (n) => {
            while (bitsAvailable < n) {
                if (inPtr >= data.length) {
                    throw new Error('Unexpected end of compressed data');
                }
                bitBuffer |= (data[inPtr++] << bitsAvailable);
                bitsAvailable += 8;
            }
            const val = bitBuffer & ((1 << n) - 1);
            bitBuffer >>>= n;
            bitsAvailable -= n;
            return val;
        };

        // Decompress
        while (outPos < uncompressedSize) {
            const flag = readBits(1);

            if (flag === 1) {
                // Match: copy from window
                const offset = readBits(15);
                const length = readBits(8) + this.MIN_MATCH;

                if (offset === 0 || offset > outPos) {
                    throw new Error('Invalid offset in compressed data');
                }

                let srcPos = outPos - offset;

                // Handle overlapping copies (RLE)
                for (let i = 0; i < length; i++) {
                    if (outPos >= uncompressedSize) break;
                    output[outPos++] = output[srcPos++];
                }
            } else {
                // Literal: copy byte directly
                if (outPos >= uncompressedSize) break;
                output[outPos++] = readBits(8);
            }
        }

        // Verify we got the expected size
        if (outPos !== uncompressedSize) {
            throw new Error(`Size mismatch: expected ${uncompressedSize}, got ${outPos}`);
        }

        // Verify checksum
        let calcChecksum = 0;
        for (let i = 0; i < output.length; i++) {
            calcChecksum = (calcChecksum + output[i]) & 0xFFFF;
        }

        if (calcChecksum !== checksum) {
            throw new Error('Checksum mismatch - file may be corrupted');
        }

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
