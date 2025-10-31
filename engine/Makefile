# Makefile for Pied Piper Compression Engine
# High-performance C implementation with WebAssembly support

CC = gcc
CFLAGS = -O3 -Wall -Wextra -std=c99 -march=native -ffast-math
TARGET = ppcompress
WASM_TARGET = ../lib/ppcompress

all: $(TARGET)

# Native executable (fastest, command-line usage)
$(TARGET): piedpiper_compress.c
	$(CC) $(CFLAGS) -o $(TARGET) piedpiper_compress.c
	@echo "✓ Built native executable: $(TARGET)"
	@echo "  Usage: ./$(TARGET) compress input.txt output.pp [level]"

# WebAssembly build (requires Emscripten SDK)
# Install: https://emscripten.org/docs/getting_started/downloads.html
wasm: piedpiper_compress.c
	@command -v emcc >/dev/null 2>&1 || { echo "❌ Error: emcc not found"; echo "Install Emscripten SDK first:"; echo "  git clone https://github.com/emscripten-core/emsdk.git"; echo "  cd emsdk && ./emsdk install latest && ./emsdk activate latest"; echo "  source ./emsdk_env.sh"; exit 1; }
	@echo "Building WebAssembly module for web integration..."
	emcc -O3 piedpiper_compress.c \
		-s WASM=1 \
		-s EXPORTED_FUNCTIONS='["_pp_compress","_pp_decompress","_malloc","_free"]' \
		-s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
		-s ALLOW_MEMORY_GROWTH=1 \
		-s INITIAL_MEMORY=64MB \
		-s MAXIMUM_MEMORY=2GB \
		-s MODULARIZE=1 \
		-s EXPORT_NAME='PiedPiperWASM' \
		-o $(WASM_TARGET).js
	@echo "✓ Built WebAssembly module: $(WASM_TARGET).wasm"
	@echo "  JavaScript wrapper: $(WASM_TARGET).js"
	@echo "  Ready for web integration!"

# Test native build
test: $(TARGET)
	@echo "Testing compression engine..."
	@echo "Creating test file..."
	@head -c 1048576 /dev/urandom > test_input.bin
	@echo "Compressing..."
	@./$(TARGET) compress test_input.bin test_output.pp 6
	@echo "Decompressing..."
	@./$(TARGET) decompress test_output.pp test_decompressed.bin
	@echo "Verifying..."
	@cmp test_input.bin test_decompressed.bin && echo "✓ Test PASSED" || echo "❌ Test FAILED"
	@rm -f test_input.bin test_output.pp test_decompressed.bin

clean:
	rm -f $(TARGET) $(WASM_TARGET).wasm $(WASM_TARGET).js ppcompress.js *.o
	@echo "✓ Cleaned build artifacts"

help:
	@echo "Pied Piper Compression Engine - Build System"
	@echo ""
	@echo "Targets:"
	@echo "  make          - Build native executable (fastest)"
	@echo "  make wasm     - Build WebAssembly module (requires Emscripten)"
	@echo "  make test     - Run compression/decompression tests"
	@echo "  make clean    - Remove build artifacts"
	@echo "  make help     - Show this help message"
	@echo ""
	@echo "WebAssembly Setup:"
	@echo "  1. git clone https://github.com/emscripten-core/emsdk.git"
	@echo "  2. cd emsdk"
	@echo "  3. ./emsdk install latest"
	@echo "  4. ./emsdk activate latest"
	@echo "  5. source ./emsdk_env.sh"
	@echo "  6. cd ../engine && make wasm"

.PHONY: all wasm test clean help
