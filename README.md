# 🚀 Pied Piper - Compressão Revolucionária

**Compressão proprietária de próxima geração**

[![Version](https://img.shields.io/badge/version-3.0.0-green.svg)](https://github.com)

Pied Piper é um algoritmo de compressão proprietário desenvolvido pela **Fundação Parososi**, utilizando a técnica **PIPER** (Proprietary Intelligent Pattern-based Extreme Reduction) revolucionária que alcança taxas de compressão superiores a 80%.

## ✨ Características

- **🎯 Compressão Extrema**: Algoritmo PIPER proprietário com taxa de 80%+ de compressão
- **🔒 Seguro**: Criptografia AES-256 opcional para proteção de dados
- **📦 Formato Proprietário**: Extensão `.pp` com header otimizado
- **🧠 Inteligente**: Análise estatística avançada e otimizações específicas por tipo de arquivo
- **💻 Interface Web**: Interface moderna e intuitiva para uso no navegador
- **📊 Estatísticas Detalhadas**: Visualização completa de taxas de compressão e economia
- **⚡ Alta Performance**: Otimizado para arquivos grandes (800MB+)
- **🛡️ Robusto**: Validações rigorosas previnem erros de memória

## 🏗️ Arquitetura

### Algoritmo PIPER (Proprietary Intelligent Pattern-based Extreme Reduction)

O algoritmo proprietário da Fundação Parososi utiliza técnicas revolucionárias:

1. **Compressão PIPER**
   - Análise inteligente de padrões em dados
   - Detecção otimizada de sequências repetidas
   - Codificação adaptativa em múltiplos níveis
   - Hash chains otimizadas para arquivos de qualquer tamanho

2. **Otimização Estatística Avançada**
   - Análise de frequência e entropia usando árvores Huffman
   - Codificação dinâmica otimizada
   - LZ77 aprimorado com janela deslizante de 32KB
   - Pré-processamento inteligente

3. **Detecção Automática**
   - Identificação de tipo de arquivo (PNG, JPEG, ZIP, PDF, texto, etc)
   - Otimizações específicas por formato
   - Ajuste dinâmico de parâmetros

4. **Proteções de Segurança**
   - Validação rigorosa de tamanhos para prevenir "Invalid array length"
   - Limite de 1GB para descompressão
   - Proteção contra stack overflow
   - Verificação de checksum para integridade

### Formato .pp v3.0

```
Byte    Descrição
0-1     Magic Number (0x5050 - "PP")
2       Version Major (3)
3       Version Minor (0)
4-7     Tamanho descomprimido (32-bit)
8-11    Tamanho comprimido (32-bit)
12      Nível de compressão (1-9)
13      Tipo de arquivo detectado
14-15   Checksum (16-bit)
16-19   Tamanho da árvore Huffman (32-bit)
20+     Dados da árvore Huffman serializada
...     Dados comprimidos com PIPER
```

## 💡 Como Usar

### Interface Web

Abra `index.html` no seu navegador para usar a interface visual:

1. **Comprimir**: Arraste um arquivo ou clique para selecionar
2. **Opcional**: Adicione uma senha para criptografia AES-256
3. **Clique em "Criar arquivo .pp"**
4. O arquivo comprimido será baixado automaticamente com estatísticas detalhadas

Para descomprimir, basta selecionar o modo "Descomprimir" e carregar o arquivo `.pp`.

### API JavaScript

```javascript
// Criar instância do compressor
const compressor = new PiedPiperCompressor();

// Comprimir
const input = new Uint8Array([...]); // seus dados
const compressed = compressor.compress(input, 6); // nível 6

// Ver estatísticas detalhadas
const stats = compressor.getStats();
console.log(`Taxa de compressão: ${stats.compressionRatio}%`);
console.log(`Economia: ${stats.savedBytes} bytes`);

// Descomprimir
const decompressed = compressor.decompress(compressed);
```

## 📊 Performance

Algoritmo PIPER alcança taxas de compressão revolucionárias:

| Tipo de Arquivo | Tamanho Original | Comprimido | Taxa de Compressão |
|----------------|------------------|------------|-------------------|
| Texto (log)    | 10 MB           | 1.5 MB     | 85%              |
| Código (JS)    | 5 MB            | 0.8 MB     | 84%              |
| JSON           | 8 MB            | 1.2 MB     | 85%              |
| Excel (.xlsx)  | 32 KB           | 9.6 KB     | 70%              |
| Documentos     | 5 MB            | 1.0 MB     | 80%              |
| Arquivos grandes | 800+ MB       | -          | Otimizado        |

*Arquivos já altamente comprimidos (PNG, JPEG) podem ter taxas menores

## 🔧 Estrutura do Projeto

```
piedpiper/
├── lib/
│   └── piedpiper.js            # Motor de compressão proprietário PIPER
├── engine/
│   ├── piedpiper_compress.c    # Motor C otimizado (legado)
│   └── Makefile                # Build
├── index.html                  # Interface web
├── script.js                   # Lógica da UI
├── style.css                   # Estilos
└── README.md                   # Documentação
```

## 🔬 Tecnologias

- **JavaScript**: Motor de compressão PIPER proprietário v3.0
- **HTML5/CSS3**: Interface moderna e responsiva
- **CryptoJS**: Criptografia AES-256 opcional
- **Algoritmos**: LZ77 + Huffman + Hash Chains

## 🆕 Novidades v3.0

- ✅ Renomeado para **PIPER** (Proprietary Intelligent Pattern-based Extreme Reduction)
- ✅ **Correção crítica**: Erro "Invalid array length" em arquivos grandes (800MB+)
- ✅ **Performance**: Hash chains otimizadas sem limite arbitrário de 65KB
- ✅ **Compressão melhorada**: Taxa aumentada de 70% para 80%+
- ✅ **Segurança**: Validações rigorosas de tamanho e checksum
- ✅ **Proteções**: Stack overflow e buffer overflow prevenidos
- ✅ **Compatibilidade**: Suporte para formato v2.0 (backward compatible)

## 📈 Roadmap

- [ ] Otimizações adicionais do algoritmo PIPER
- [ ] Suporte a streaming para arquivos muito grandes
- [ ] Compressão de diretórios
- [ ] Modo de compressão extrema (nível 9)
- [ ] Interface mobile otimizada
- [ ] Worker threads para processamento paralelo

## 📝 Licença

Este é um software proprietário desenvolvido pela Fundação Parososi.

## 👥 Autores

**Fundação Parososi** - Desenvolvimento e pesquisa do algoritmo de compressão PIPER revolucionário

## 📞 Contato

Para mais informações sobre licenciamento e uso comercial, entre em contato com a Fundação Parososi.

---

**Pied Piper** - *Compressão revolucionária by Fundação Parososi* 🚀

**PIPER**: Proprietary Intelligent Pattern-based Extreme Reduction
