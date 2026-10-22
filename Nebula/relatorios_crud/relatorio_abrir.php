<?php
// ==========================================================
// GET relatorios_crud/relatorio_abrir.php?id=ID[&baixar=1]
// Entrega o PDF para o suporte com o menu "Relatórios".
// Sem &baixar abre dentro do navegador (usado na janela de visualização);
// com &baixar=1 força o download.
// ==========================================================
define('RELATORIOS_BINARIO', true);
require_once __DIR__ . '/relatorios_comum.php';

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
    falha("Relatório inválido.", 400);
}

$stmt = mysqli_prepare($link, "SELECT titulo, caminho FROM relatorios_suporte WHERE id_relatorio = ? LIMIT 1");
mysqli_stmt_bind_param($stmt, "i", $id);
mysqli_stmt_execute($stmt);
$rel = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
mysqli_stmt_close($stmt);

if (!$rel) {
    falha("Relatório não encontrado.", 404);
}

// Só serve arquivos que estejam DENTRO da pasta de relatórios
$pasta   = realpath(PASTA_RELATORIOS);
$fisico  = realpath(__DIR__ . '/' . $rel['caminho']);
if (!$pasta || !$fisico || !is_file($fisico) || strpos($fisico, $pasta . DIRECTORY_SEPARATOR) !== 0) {
    falha("O arquivo não está mais no servidor.", 404);
}

// Nome amigável para o navegador
$nome = trim(preg_replace('/[\\\\\/:*?"<>|\x00-\x1F]/u', '_', $rel['titulo']), ". ");
if ($nome === '') $nome = 'relatorio';
$nome .= '.pdf';
$nomeAscii = preg_replace('/[^A-Za-z0-9._ -]/', '_', $nome);

$baixar = isset($_GET['baixar']) && $_GET['baixar'] === '1';

while (ob_get_level()) ob_end_clean();

header("Content-Type: application/pdf");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: SAMEORIGIN");   // deixa aparecer no iframe do próprio portal
header('Content-Disposition: ' . ($baixar ? 'attachment' : 'inline')
     . '; filename="' . $nomeAscii . '"; filename*=UTF-8\'\'' . rawurlencode($nome));
header("Content-Length: " . filesize($fisico));
header("Cache-Control: private, no-transform");

readfile($fisico);
