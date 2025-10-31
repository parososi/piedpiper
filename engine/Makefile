# Makefile for Pied Piper Compression Engine

CC = gcc
CFLAGS = -O3 -Wall -Wextra -std=c99 -march=native -ffast-math
TARGET = ppcompress
WASM_TARGET = ppcompress.wasm

all: $(TARGET)

$(TARGET): piedpiper_compress.c
	$(CC) $(CFLAGS) -o $(TARGET) piedpiper_compress.c

# WebAssembly build (requires emscripten)
wasm: piedpiper_compress.c
	emcc -O3 piedpiper_compress.c \
		-s WASM=1 \
		-s EXPORTED_FUNCTIONS='["_pp_compress","_pp_decompress","_malloc","_free"]' \
		-s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
		-s ALLOW_MEMORY_GROWTH=1 \
		-o $(WASM_TARGET)

clean:
	rm -f $(TARGET) $(WASM_TARGET) ppcompress.js

.PHONY: all wasm clean
