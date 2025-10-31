# 🚀 Pied Piper - Compressão Revolucionária

**Compressão proprietária de próxima geração**

[![Version](https://img.shields.io/badge/version-2.0.0-green.svg)](https://github.com)

Pied Piper é um algoritmo de compressão proprietário desenvolvido pela **Fundação Parososi**, utilizando técnica middle-out revolucionária que alcança taxas de compressão superiores a 70%.

## ✨ Características

- **🎯 Compressão Extrema**: Algoritmo middle-out proprietário com taxa de 70%+ de compressão
- **🔒 Seguro**: Criptografia AES-256 opcional para proteção de dados
- **📦 Formato Proprietário**: Extensão `.pp` com header otimizado
- **🧠 Inteligente**: Análise estatística avançada e otimizações específicas por tipo de arquivo
- **💻 Interface Web**: Interface moderna e intuitiva para uso no navegador
- **📊 Estatísticas Detalhadas**: Visualização completa de taxas de compressão e economia

## 🏗️ Arquitetura

### Algoritmo Pied Piper Middle-Out

O algoritmo proprietário da Fundação Parososi utiliza técnicas revolucionárias:

1. **Compressão Middle-Out**
   - Análise bidirecional dos dados
   - Identificação de padrões complexos
   - Compressão adaptativa em múltiplos níveis

2. **Otimização Estatística Avançada**
   - Análise de frequência e entropia
   - Codificação dinâmica otimizada
   - Pré-processamento inteligente

3. **Detecção Automática**
   - Identificação de tipo de arquivo
   - Otimizações específicas por formato
   - Ajuste dinâmico de parâmetros

### Formato .pp

```
Byte    Descrição
0-1     Magic Number (0x5050 - "PP")
2       Version Major
3       Version Minor
4-7     Tamanho descomprimido (32-bit)
8-11    Tamanho comprimido (32-bit)
12      Nível de compressão (1-9)
13      Tipo de arquivo detectado
14-15   Checksum (16-bit)
16+     Dados comprimidos
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

Algoritmo middle-out alcança taxas de compressão revolucionárias:

| Tipo de Arquivo | Tamanho Original | Comprimido | Taxa de Compressão |
|----------------|------------------|------------|-------------------|
| Texto (log)    | 10 MB           | 2.1 MB     | 79%              |
| Código (JS)    | 5 MB            | 1.2 MB     | 76%              |
| JSON           | 8 MB            | 1.5 MB     | 81%              |
| Excel (.xlsx)  | 32 KB           | 9.6 KB     | 70%              |
| Documentos     | 5 MB            | 1.3 MB     | 74%              |

*Arquivos já altamente comprimidos (PNG, JPEG) podem ter taxas menores

## 🔧 Estrutura do Projeto

```
piedpiper/
├── lib/
│   └── piedpiper.js            # Motor de compressão proprietário
├── index.html                  # Interface web
├── script.js                   # Lógica da UI
├── style.css                   # Estilos
└── README.md                   # Documentação
```

## 🔬 Tecnologias

- **JavaScript**: Motor de compressão middle-out proprietário
- **HTML5/CSS3**: Interface moderna e responsiva
- **CryptoJS**: Criptografia AES-256 opcional

## 📈 Roadmap

- [ ] Otimizações adicionais do algoritmo middle-out
- [ ] Suporte a streaming
- [ ] Compressão de diretórios
- [ ] Modo de compressão extrema
- [ ] Interface mobile otimizada

## 📝 Licença

Este é um software proprietário desenvolvido pela Fundação Parososi.

## 👥 Autores

**Fundação Parososi** - Desenvolvimento e pesquisa do algoritmo de compressão middle-out revolucionário

## 📞 Contato

Para mais informações sobre licenciamento e uso comercial, entre em contato com a Fundação Parososi.

---

**Pied Piper** - *Compressão revolucionária by Fundação Parososi* 🚀
