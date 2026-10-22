<?php
// Entrega UM documento de isenção ao suporte (visualizar ou baixar).
// Os arquivos ficam em uploads_isencao/ (fora do alcance do navegador); só passam por aqui.
include_once(__DIR__ . "/academico-base-nebula.php");
require_once __DIR__ . '/../suporte_permissoes.php';
exigirPermissao($link, 'academico');
exigirMetodo('GET');

$id = filter_var($_GET['id'] ?? '', FILTER_VALIDATE_INT);
if (!$id) {
    http_response_code(400);
    responderErro("Documento inválido.");
}

try {

    $stmt = mysqli_prepare($link,
        "SELECT id_inscricoes, arquivo, nome_original FROM inscricao_documentos WHERE id_doc = ?");
    mysqli_stmt_bind_param($stmt, "i", $id);
    mysqli_stmt_execute($stmt);
    $doc = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

} catch (mysqli_sql_exception $e) {

    error_log("documento isencao: " . $e->getMessage());
    http_response_code(500);
    responderErro("Não foi possível abrir o documento.");

}

if (!$doc) {
    http_response_code(404);
    responderErro("Documento não encontrado.");
}

// Só aceita o nome que o próprio sistema gravou (sem barras nem "..")
$arquivo = basename($doc['arquivo']);
$pasta   = realpath(__DIR__ . '/../uploads_isencao/' . (int) $doc['id_inscricoes']);
$caminho = $pasta ? realpath($pasta . '/' . $arquivo) : false;

if (!$caminho || strpos($caminho, $pasta . DIRECTORY_SEPARATOR) !== 0 || !is_file($caminho)) {
    http_response_code(404);
    responderErro("O arquivo não está mais no servidor.");
}

$tipos = [
    'pdf'  => 'application/pdf',
    'png'  => 'image/png',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg'
];
$ext = strtolower(pathinfo($arquivo, PATHINFO_EXTENSION));
if (!isset($tipos[$ext])) {
    http_response_code(404);
    responderErro("Tipo de arquivo inválido.");
}

$baixar = (($_GET['baixar'] ?? '') === '1');
$nome   = preg_replace('/[^A-Za-z0-9._-]/', '_', $doc['nome_original']);
if (strtolower(pathinfo($nome, PATHINFO_EXTENSION)) !== $ext) {
    $nome .= '.' . $ext;
}

// Troca o "application/json" que o arquivo base colocou
header('Content-Type: ' . $tipos[$ext]);
header('Content-Disposition: ' . ($baixar ? 'attachment' : 'inline') . '; filename="' . $nome . '"');
header('Content-Length: ' . filesize($caminho));
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store');

readfile($caminho);
