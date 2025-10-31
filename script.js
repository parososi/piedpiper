<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Encripte .enc</title>
  <link rel="stylesheet" href="style.css" />
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="container">
    <header>
      <h1>.enc</h1>
      <p>Encripte arquivos com ZIP + AES-256.<br>Compatível com WinRAR, 7-Zip, etc.</p>
    </header>

    <main>
      <div class="mode-selector">
        <button class="mode-btn active" data-mode="encrypt">Encriptar</button>
        <button class="mode-btn" data-mode="decrypt">Desencriptar</button>
      </div>

      <!-- ENCRIPTAR -->
      <div id="encrypt-mode" class="mode active">
        <div class="drop-zone" id="drop-encrypt">
          <i class="ri-upload-cloud-2-line"></i>
          <p id="file-name-encrypt">Nenhum arquivo</p>
          <input type="file" id="file-encrypt" />
        </div>

        <label class="checkbox-label">
          <input type="checkbox" id="use-pass-encrypt" checked />
          <span>Usar senha</span>
        </label>
        <input type="password" id="pass-encrypt" placeholder="Senha (opcional)" />

        <button id="btn-encrypt" class="action-btn">
          <span>Criar .enc</span>
          <i class="ri-arrow-right-line"></i>
        </button>
      </div>

      <!-- DESENCRIPTAR -->
      <div id="decrypt-mode" class="mode">
        <div class="drop-zone" id="drop-decrypt">
          <i class="ri-folder-zip-line"></i>
          <p id="file-name-decrypt">Nenhum .enc</p>
          <input type="file" id="file-decrypt" accept=".enc" />
        </div>

        <label class="checkbox-label">
          <input type="checkbox" id="use-pass-decrypt" checked />
          <span>Usar senha</span>
        </label>
        <input type="password" id="pass-decrypt" placeholder="Senha do .enc" />

        <button id="btn-decrypt" class="action-btn">
          <span>Extrair arquivos</span>
          <i class="ri-arrow-right-line"></i>
        </button>
      </div>
    </main>

    <div id="result" class="result"></div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/crypto-js@4.2.0/crypto-js.min.js"></script>
  <script src="script.js"></script>
</body>
</html>