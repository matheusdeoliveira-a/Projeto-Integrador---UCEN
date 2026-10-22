<?php
// ==========================================================
// POST relatorios_crud/relatorio_upload.php  (multipart/form-data)
// Campos: titulo, categoria, periodo, arquivo (PDF)
// ==========================================================
require_once __DIR__ . '/relatorios_comum.php';
exigirPost();

const TAMANHO_MAX_PDF = 20 * 1024 * 1024;   // 20 MB (o php.ini também precisa permitir: upload_max_filesize / post_max_size)

$titulo    = campo('titulo');
$categoria = campo('categoria');
$periodo   = campo('periodo');

if ($titulo === '' || mb_strlen($titulo) > 150)   falha("Informe o título do relatório (até 150 caracteres).");
if ($periodo === '' || mb_strlen($periodo) > 60)  falha("Informe o período (até 60 caracteres).");
if (!in_array($categoria, CATEGORIAS_RELATORIO, true)) $categoria = 'Outro';

// ----- Arquivo enviado? -----
if (!isset($_FILES['arquivo'])) {
    falha("Escolha um arquivo PDF.");
}
$arq = $_FILES['arquivo'];

if ($arq['error'] !== UPLOAD_ERR_OK) {
    $mensagens = [
        UPLOAD_ERR_INI_SIZE  => "O arquivo é maior que o limite do servidor (upload_max_filesize).",
        UPLOAD_ERR_FORM_SIZE => "O arquivo é grande demais.",
        UPLOAD_ERR_PARTIAL   => "O envio foi interrompido. Tente de novo.",
        UPLOAD_ERR_NO_FILE   => "Escolha um arquivo PDF."
    ];
    falha($mensagens[$arq['error']] ?? "Não foi possível receber o arquivo.");
}
if ($arq['size'] > TAMANHO_MAX_PDF) {
    falha("O PDF passa de 20 MB.");
}
if (!is_uploaded_file($arq['tmp_name'])) {
    falha("Arquivo inválido.");
}

// ----- É mesmo um PDF? (extensão + tipo real + assinatura "%PDF-") -----
if (strtolower(pathinfo($arq['name'], PATHINFO_EXTENSION)) !== 'pdf') {
    falha("Só é permitido enviar arquivos .pdf.");
}
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime  = finfo_file($finfo, $arq['tmp_name']);
finfo_close($finfo);

$f = fopen($arq['tmp_name'], 'rb');
$cabecalho = $f ? fread($f, 5) : '';
if ($f) fclose($f);

if ($mime !== 'application/pdf' || $cabecalho !== '%PDF-') {
    falha("O arquivo não parece ser um PDF válido.");
}

// ----- Pasta de destino (bloqueada para acesso direto) -----
if (!is_dir(PASTA_RELATORIOS) && !mkdir(PASTA_RELATORIOS, 0755, true)) {
    falha("Não foi possível criar a pasta de uploads no servidor.");
}
$bloqueio = PASTA_RELATORIOS . '/.htaccess';
if (!is_file($bloqueio)) {
    file_put_contents($bloqueio, "Require all denied\n");
}

// Nome físico aleatório: não dá para adivinhar nem sobrescrever outro arquivo
$nomeFisico    = 'rel_' . bin2hex(random_bytes(12)) . '.pdf';
$caminhoFisico = PASTA_RELATORIOS . '/' . $nomeFisico;
$caminhoSalvo  = 'uploads/relatorios/' . $nomeFisico;

if (!move_uploaded_file($arq['tmp_name'], $caminhoFisico)) {
    falha("Falha ao salvar o arquivo no servidor.");
}

$original = mb_substr(basename($arq['name']), 0, 255);
$tamanho  = (int) $arq['size'];

try {
    $stmt = mysqli_prepare($link,
        "INSERT INTO relatorios_suporte (titulo, categoria, periodo, arquivo_original, caminho, tamanho, enviado_por, id_suporte)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    mysqli_stmt_bind_param($stmt, "sssssisi",
        $titulo, $categoria, $periodo, $original, $caminhoSalvo, $tamanho, $eu['nome'], $eu['id']);
    mysqli_stmt_execute($stmt);
    $novoId = mysqli_insert_id($link);
    mysqli_stmt_close($stmt);
} catch (Throwable $e) {
    // Sem linha no banco não faz sentido deixar o arquivo órfão no disco
    @unlink($caminhoFisico);
    throw $e;
}

saida(["sucesso" => true, "id" => $novoId, "mensagem" => "Relatório adicionado."]);
