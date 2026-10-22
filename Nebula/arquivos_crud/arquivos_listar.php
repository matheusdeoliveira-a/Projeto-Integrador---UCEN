<?php
// ==========================================================
// GET arquivos_listar.php?id_turma=ID&pasta=ID&ordem=desc
// Retorna em JSON os itens da pasta atual (ou da raiz, se "pasta"
// vier vazio) DA TURMA escolhida, e o caminho (breadcrumb) até ela.
// ==========================================================

header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('professor');

if (!isset($_SESSION['logado']) || $_SESSION['logado'] !== true) {
    http_response_code(401);
    echo json_encode(["sucesso" => false, "mensagem" => "Não autenticado"]);
    exit;
}
if (($_SESSION['tipo'] ?? '') !== 'professor' || empty($_SESSION['id_prof'])) {
    http_response_code(403);
    echo json_encode(["sucesso" => false, "mensagem" => "Sem permissão"]);
    exit;
}

include_once __DIR__ . '/../connect_nebula.php';
require_once __DIR__ . '/arquivos_helpers.php';

$idProf  = (int) $_SESSION['id_prof'];
$idTurma = (int) ($_GET["id_turma"] ?? 0);

// A turma precisa ser uma das atribuídas a este professor
$turma = turmaDoProfessor($link, $idProf, $idTurma);
if (!$turma) {
    http_response_code(403);
    echo json_encode(["sucesso" => false, "mensagem" => "Turma não pertence a este professor"]);
    exit;
}
$rotulo = rotuloTurma($turma);

$pastaId = (isset($_GET["pasta"]) && $_GET["pasta"] !== "") ? (int) $_GET["pasta"] : null;
$ordem   = (isset($_GET["ordem"]) && $_GET["ordem"] === "asc") ? "ASC" : "DESC";

// A pasta pedida precisa ser desta turma
if ($pastaId && !pastaDaTurma($link, $pastaId, $idTurma)) {
    echo json_encode(["sucesso" => false, "mensagem" => "Pasta não encontrada nesta turma."]);
    exit;
}

// Pastas sempre aparecem primeiro, depois os arquivos, ordenados pela data
$sql = "SELECT id_arq_prof AS id, tipo, nome, caminho, data_criacao
        FROM arquivos_professor
        WHERE id_turma = ? AND " . ($pastaId ? "pasta_pai = ?" : "pasta_pai IS NULL") . "
        ORDER BY (tipo = 'pasta') DESC, data_criacao $ordem";

$stmt = mysqli_prepare($link, $sql);
if ($pastaId) {
    mysqli_stmt_bind_param($stmt, "ii", $idTurma, $pastaId);
} else {
    mysqli_stmt_bind_param($stmt, "i", $idTurma);
}
mysqli_stmt_execute($stmt);
$resultado = mysqli_stmt_get_result($stmt);

if (!$resultado) {
    echo json_encode(["sucesso" => false, "mensagem" => mysqli_error($link)]);
    exit;
}

$itens = [];
while ($linha = mysqli_fetch_assoc($resultado)) {
    $linha["turma"] = $rotulo; // o front mostra esse texto na etiqueta da linha
    $itens[] = $linha;
}
mysqli_stmt_close($stmt);

echo json_encode([
    "sucesso" => true,
    "itens" => $itens,
    "breadcrumb" => montarBreadcrumb($link, $pastaId, $idTurma)
]);
