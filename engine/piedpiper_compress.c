#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <emscripten.h>

// Define a JS function that can be called from C
EM_JS(void, call_js_progress, (int percent), {
  if (typeof self.progressCallback === 'function') {
    self.progressCallback(percent);
  }
});

#define PP_VERSION "1.1.0"
#define PP_MAGIC 0x5050
#define MAX_WINDOW_SIZE 32768
#define MAX_LOOKAHEAD 258
#define MIN_MATCH 3
#define HASH_BITS 15
#define HASH_SIZE (1 << HASH_BITS)
#define HASH_MASK (HASH_SIZE - 1)

typedef struct {
    uint16_t magic;
    uint8_t version_major;
    uint8_t version_minor;
    uint32_t uncompressed_size;
    uint32_t compressed_size;
    uint8_t compression_level;
    uint8_t file_type;
    uint16_t checksum;
} PP_Header;

typedef struct {
    uint16_t offset;
    uint16_t length;
} LZ77_Match;

typedef struct {
    uint8_t *input;
    uint32_t input_size;
    uint8_t *output;
    uint32_t output_size;
    uint32_t output_pos;
    int32_t *hash_table;
    int32_t *prev;
    void (*progress_callback)(int);
} PP_Context;

static inline uint32_t hash_func(uint8_t *data) {
    return ((data[0] << 10) ^ (data[1] << 5) ^ data[2]) & HASH_MASK;
}

PP_Context* pp_init_context(uint8_t *input, uint32_t input_size) {
    PP_Context *ctx = (PP_Context*)calloc(1, sizeof(PP_Context));
    if (!ctx) return NULL;

    ctx->input = input;
    ctx->input_size = input_size;
    ctx->output_size = input_size + (input_size / 10) + 1024;
    ctx->output = (uint8_t*)malloc(ctx->output_size);
    ctx->hash_table = (int32_t*)malloc(HASH_SIZE * sizeof(int32_t));
    ctx->prev = (int32_t*)malloc(input_size * sizeof(int32_t));

    memset(ctx->hash_table, -1, HASH_SIZE * sizeof(int32_t));
    memset(ctx->prev, -1, input_size * sizeof(int32_t));
    ctx->progress_callback = NULL;

    return ctx;
}

LZ77_Match pp_find_longest_match(PP_Context *ctx, uint32_t pos) {
    LZ77_Match match = {0, 0};
    if (pos + MIN_MATCH > ctx->input_size) return match;
    uint32_t hash = hash_func(&ctx->input[pos]);
    int32_t chain_pos = ctx->hash_table[hash];
    uint32_t best_len = 0;
    uint32_t best_offset = 0;
    uint32_t max_match = (ctx->input_size - pos < MAX_LOOKAHEAD) ? ctx->input_size - pos : MAX_LOOKAHEAD;
    int chain_limit = 128;

    while (chain_pos >= 0 && chain_limit-- > 0) {
        uint32_t offset = pos - chain_pos;
        if (offset > MAX_WINDOW_SIZE) break;

        if (ctx->input[chain_pos + best_len] == ctx->input[pos + best_len]) {
            uint32_t len = 0;
            while (len < max_match && ctx->input[chain_pos + len] == ctx->input[pos + len]) {
                len++;
            }
            if (len > best_len) {
                best_len = len;
                best_offset = offset;
                if (len == max_match) break;
            }
        }
        chain_pos = ctx->prev[chain_pos];
    }

    if (best_len >= MIN_MATCH) {
        match.length = best_len;
        match.offset = best_offset;
    }
    return match;
}

void pp_update_hash(PP_Context *ctx, uint32_t pos) {
    if (pos + MIN_MATCH > ctx->input_size) return;
    uint32_t hash = hash_func(&ctx->input[pos]);
    ctx->prev[pos] = ctx->hash_table[hash];
    ctx->hash_table[hash] = pos;
}

void pp_write_bits(PP_Context *ctx, uint32_t bits, uint8_t num_bits) {
    static uint32_t bit_buffer = 0;
    static uint8_t bits_in_buffer = 0;
    bit_buffer |= (bits << bits_in_buffer);
    bits_in_buffer += num_bits;
    while (bits_in_buffer >= 8) {
        if (ctx->output_pos < ctx->output_size) {
            ctx->output[ctx->output_pos++] = bit_buffer & 0xFF;
        }
        bit_buffer >>= 8;
        bits_in_buffer -= 8;
    }
}

EMSCRIPTEN_KEEPALIVE
int pp_compress(uint8_t *input, uint32_t input_size, uint8_t *output, uint32_t *output_size, uint8_t level) {
    if (!input || !output || !output_size || input_size == 0) return -1;

    PP_Context *ctx = pp_init_context(input, input_size);
    if (!ctx) return -1;

    PP_Header header = { .magic = PP_MAGIC, .version_major = 1, .version_minor = 1, .uncompressed_size = input_size, .compression_level = level };
    memcpy(ctx->output, &header, sizeof(PP_Header));
    ctx->output_pos = sizeof(PP_Header);

    uint32_t pos = 0;
    uint32_t last_progress = 0;

    while (pos < input_size) {
        pp_update_hash(ctx, pos);
        LZ77_Match match = pp_find_longest_match(ctx, pos);

        if (match.length >= MIN_MATCH) {
            pp_write_bits(ctx, 1, 1);
            pp_write_bits(ctx, match.offset, 15);
            pp_write_bits(ctx, match.length - MIN_MATCH, 8);
            for (uint32_t i = 1; i < match.length; i++) {
                if(pos + i < input_size) pp_update_hash(ctx, pos + i);
            }
            pos += match.length;
        } else {
            pp_write_bits(ctx, 0, 1);
            pp_write_bits(ctx, input[pos], 8);
            pos++;
        }

        uint32_t progress = (pos * 100) / input_size;
        if (progress > last_progress) {
            call_js_progress(progress);
            last_progress = progress;
        }
    }

    pp_write_bits(ctx, 0, 7); // Flush
    ((PP_Header*)ctx->output)->compressed_size = ctx->output_pos;

    uint16_t checksum = 0;
    for (uint32_t i = 0; i < input_size; i++) checksum += input[i];
    ((PP_Header*)ctx->output)->checksum = checksum;

    if (ctx->output_pos > *output_size) {
        *output_size = ctx->output_pos;
        free(ctx->output); free(ctx->hash_table); free(ctx->prev); free(ctx);
        return -2;
    }

    memcpy(output, ctx->output, ctx->output_pos);
    *output_size = ctx->output_pos;

    free(ctx->output); free(ctx->hash_table); free(ctx->prev); free(ctx);
    return 0;
}

EMSCRIPTEN_KEEPALIVE
int pp_decompress(uint8_t *input, uint32_t input_size, uint8_t *output, uint32_t *output_size) {
    if (!input || !output || !output_size || input_size < sizeof(PP_Header)) return -1;

    PP_Header *header = (PP_Header*)input;
    if (header->magic != PP_MAGIC) return -1;
    if (*output_size < header->uncompressed_size) {
        *output_size = header->uncompressed_size;
        return -2;
    }

    uint8_t *in_ptr = input + sizeof(PP_Header);
    uint32_t out_pos = 0;
    uint32_t bit_buffer = 0;
    uint8_t bits_available = 0;
    uint32_t last_progress = 0;

    #define READ_BITS(n, val) \
        while (bits_available < (n)) { \
            bit_buffer |= (*in_ptr++) << bits_available; \
            bits_available += 8; \
        } \
        val = bit_buffer & ((1 << (n)) - 1); \
        bit_buffer >>= (n); \
        bits_available -= (n);

    while (out_pos < header->uncompressed_size) {
        uint8_t flag;
        READ_BITS(1, flag);

        if (flag == 1) {
            uint16_t offset, length;
            READ_BITS(15, offset);
            READ_BITS(8, length);
            length += MIN_MATCH;
            uint32_t src_pos = out_pos - offset;
            for (uint16_t i = 0; i < length; i++) {
                output[out_pos] = output[src_pos];
                out_pos++;
                src_pos++;
            }
        } else {
            uint8_t literal;
            READ_BITS(8, literal);
            output[out_pos++] = literal;
        }

        uint32_t progress = (out_pos * 100) / header->uncompressed_size;
        if (progress > last_progress) {
            call_js_progress(progress);
            last_progress = progress;
        }
    }

    *output_size = out_pos;
    uint16_t checksum = 0;
    for (uint32_t i = 0; i < out_pos; i++) checksum += output[i];
    if (checksum != header->checksum) return -3;

    return 0;
}
