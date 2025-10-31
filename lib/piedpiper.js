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
        this.HASH_SIZE = 32768;

        this.stats = {
            inputSize: 0,
            outputSize: 0,
            matchesFound: 0,
            compressionRatio: 0
        };
    }

    // Initialize hash function
    hashFunc(data, pos) {
        return ((data[pos] << 10) ^ (data[pos + 1] << 5) ^ data[pos + 2]) & (this.HASH_SIZE - 1);
    }

    // Find longest match
    findLongestMatch(data, pos, hashTable, prevTable) {
        if (pos + this.MIN_MATCH > data.length) {
            return { offset: 0, length: 0 };
        }

        const hash = this.hashFunc(data, pos);
        let chainPos = hashTable[hash];
        let bestLen = 0;
        let bestOffset = 0;
        const maxMatch = Math.min(this.MAX_LOOKAHEAD, data.length - pos);
        let chainLimit = 128;

        while (chainPos >= 0 && chainLimit-- > 0) {
            const offset = pos - chainPos;

            if (offset > this.MAX_WINDOW_SIZE || offset === 0) break;

            // Check for match
            if (data[chainPos + bestLen] === data[pos + bestLen]) {
                let len = 0;
                while (len < maxMatch && data[chainPos + len] === data[pos + len]) {
                    len++;
                }

                if (len >= this.MIN_MATCH && len > bestLen) {
                    bestLen = len;
                    bestOffset = offset;
                    if (len === maxMatch) break;
                }
            }

            chainPos = prevTable[chainPos];
        }

        if (bestLen >= this.MIN_MATCH) {
            this.stats.matchesFound++;
            return { offset: bestOffset, length: bestLen };
        }

        return { offset: 0, length: 0 };
    }

    // Update hash chains
    updateHash(pos, data, hashTable, prevTable) {
        if (pos + this.MIN_MATCH > data.length) return;

        const hash = this.hashFunc(data, pos);
        prevTable[pos] = hashTable[hash];
        hashTable[hash] = pos;
    }

    // Detect file type
    detectFileType(data) {
        if (data.length < 4) return 0;

        // Check signatures
        if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) return 1; // PNG
        if (data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF) return 2; // JPEG
        if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) return 3; // GIF
        if (data[0] === 0x50 && data[1] === 0x4B) return 4; // ZIP
        if (data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46) return 5; // PDF

        // Check for text
        let textChars = 0;
        const sampleSize = Math.min(1024, data.length);
        for (let i = 0; i < sampleSize; i++) {
            if ((data[i] >= 32 && data[i] <= 126) || data[i] === 10 || data[i] === 13 || data[i] === 9) {
                textChars++;
            }
        }

        if (textChars > sampleSize * 0.9) return 10; // Text

        return 0; // Unknown
    }

    // Bit writer class
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
                    bitBuffer >>= 8;
                    bitsInBuffer -= 8;
                }
            },
            flush: () => {
                if (bitsInBuffer > 0) {
                    output.push(bitBuffer & 0xFF);
                }
            },
            getOutput: () => new Uint8Array(output)
        };
    }

    // Main compression function
    compress(input, level = 6) {
        const data = input instanceof Uint8Array ? input : new Uint8Array(input);

        this.stats.inputSize = data.length;
        this.stats.matchesFound = 0;

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

        // LZ77 compression
        let pos = 0;
        while (pos < data.length) {
            this.updateHash(pos, data, hashTable, prevTable);

            const match = this.findLongestMatch(data, pos, hashTable, prevTable);

            if (match.length >= this.MIN_MATCH) {
                // Write match: flag(1) + offset(15) + length(8)
                bitWriter.writeBits(1, 1);
                bitWriter.writeBits(match.offset, 15);
                bitWriter.writeBits(match.length - this.MIN_MATCH, 8);

                // Update hash for all positions in match
                for (let i = 1; i < match.length && pos + i < data.length; i++) {
                    this.updateHash(pos + i, data, hashTable, prevTable);
                }

                pos += match.length;
            } else {
                // Write literal: flag(0) + byte(8)
                bitWriter.writeBits(0, 1);
                bitWriter.writeBits(data[pos], 8);
                pos++;
            }
        }

        bitWriter.flush();
        const compressed = bitWriter.getOutput();

        // Calculate checksum
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
            throw new Error('Invalid Pied Piper file: bad magic number');
        }

        const uncompressedSize = headerView.getUint32(4, true);
        const checksum = headerView.getUint16(14, true);

        // Prepare output
        const output = new Uint8Array(uncompressedSize);
        let outPos = 0;

        // Bit reader
        let inPtr = 16;
        let bitBuffer = 0;
        let bitsAvailable = 0;

        const readBits = (n) => {
            while (bitsAvailable < n) {
                if (inPtr >= data.length) break;
                bitBuffer |= (data[inPtr++] << bitsAvailable);
                bitsAvailable += 8;
            }
            const val = bitBuffer & ((1 << n) - 1);
            bitBuffer >>= n;
            bitsAvailable -= n;
            return val;
        };

        // Decompress
        while (outPos < uncompressedSize) {
            const flag = readBits(1);

            if (flag === 1) {
                // Match
                const offset = readBits(15);
                const length = readBits(8) + this.MIN_MATCH;

                let srcPos = outPos - offset;
                for (let i = 0; i < length; i++) {
                    output[outPos++] = output[srcPos++];
                }
            } else {
                // Literal
                output[outPos++] = readBits(8);
            }
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
