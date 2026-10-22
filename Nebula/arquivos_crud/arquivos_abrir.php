<?php
// ==========================================================
// GET arquivos_abrir.php?id=ID
// Abre um arquivo no navegador (PDF e imagens abrem na aba; os outros
// tipos baixam). Serve para PROFESSOR (só arquivos de turmas dele) e
// para ALUNO (somente leitura).
// Existe porque o upload grava o arquivo em arquivos_crud/uploads/..., e o
// link direto "uploads/..." (a partir da raiz do site) dava 404.
// ==========================================================

require_once __DIR__ . '/../iniciar_sessao.php';

function responderErro($codigo, $mensagem) {
    http_response_code($codigo);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode(["sucesso" => false, "mensagem" => $mensagem]);
    exit;
}

// ----- Quem está pedindo? (cada portal tem o seu cookie de sessão) -----
$papel  = null;
$idProf = 0;

if (isset($_COOKIE['SESSAO_PROFESSOR'])) {
    iniciarSessao('professor');
    if (!empty($_SESSION['logado']) && ($_SESSION['tipo'] ?? '') === 'professor' && !empty($_SESSION['id_prof'])) {
        $papel  = 'professor';
        $idProf = (int) $_SESSION['id_prof'];
    }
    session_write_close();
}
if ($papel === null && isset($_COOKIE['SESSAO_ALUNO'])) {
    iniciarSessao('aluno');
    if (!empty($_SESSION['logado']) && ($_SESSION['tipo'] ?? '') === 'aluno') {
        $papel = 'aluno';
    }
    session_write_close();
}
if ($papel === null) {
    responderErro(401, "Não autenticado");
}

include_once __DIR__ . '/../connect_nebula.php';
require_once __DIR__ . '/arquivos_helpers.php';

$id = isset($_GET["id"]) ? (int) $_GET["id"] : 0;
if ($id <= 0) {
    responderErro(400, "Item inválido.");
}

$stmt = mysqli_prepare($link, "SELECT tipo, nome, caminho, id_turma FROM arquivos_professor WHERE id_arq_prof = ?");
mysqli_stmt_bind_param($stmt, "i", $id);
mysqli_stmt_execute($stmt);
$item = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
mysqli_stmt_close($stmt);

if (!$item || $item["tipo"] === "pasta" || !$item["caminho"]) {
    responderErro(404, "Arquivo não encontrado.");
}

// Professor: o arquivo tem que ser de uma turma dele
if ($papel === 'professor') {
    if ($item["id_turma"] === null || !turmaDoProfessor($link, $idProf, (int) $item["id_turma"])) {
        responderErro(403, "Este arquivo não pertence a uma turma sua.");
    }
}

// ----- Acha o arquivo no disco (só dentro de uploads/professor_arquivos) -----
function localizarArquivoFisico($caminho) {
    foreach ([realpath(__DIR__ . '/..'), realpath(__DIR__)] as $base) {
        if (!$base) continue;
        $permitida = realpath($base . '/uploads/professor_arquivos');
        $completo  = realpath($base . '/' . $caminho);
        if ($permitida && $completo && is_file($completo)
            && strpos($completo, $permitida . DIRECTORY_SEPARATOR) === 0) {
            return $completo;
        }
    }
    return null;
}

$fisico = localizarArquivoFisico($item["caminho"]);
if (!$fisico) {
    responderErro(404, "Arquivo não encontrado no servidor.");
}

// ----- Envia -----
$ext = strtolower(pathinfo($fisico, PATHINFO_EXTENSION));
$tiposAbreNaAba = [
    "pdf"  => "application/pdf",
    "png"  => "image/png",
    "jpg"  => "image/jpeg",
    "jpeg" => "image/jpeg",
];
$abreNaAba = isset($tiposAbreNaAba[$ext]);
$mime      = $tiposAbreNaAba[$ext] ?? "application/octet-stream";

// Nome do arquivo para o navegador (garante a extensão)
$nome = trim(preg_replace('/[\\\\\/:*?"<>|\x00-\x1F]/u', '_', (string) $item["nome"]), ". ");
if ($nome === '') $nome = 'arquivo';
if (strtolower(pathinfo($nome, PATHINFO_EXTENSION)) !== $ext) $nome .= '.' . $ext;
$nomeAscii = preg_replace('/[^A-Za-z0-9._ -]/', '_', $nome);

while (ob_get_level()) ob_end_clean();

header("Content-Type: $mime");
header("X-Content-Type-Options: nosniff");
header('Content-Disposition: ' . ($abreNaAba ? 'inline' : 'attachment')
     . '; filename="' . $nomeAscii . '"; filename*=UTF-8\'\'' . rawurlencode($nome));
header("Content-Length: " . filesize($fisico));
header("Cache-Control: private, no-transform");

readfile($fisico);
