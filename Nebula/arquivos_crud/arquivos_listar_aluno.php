<?php
// ==========================================================
// GET arquivos_listar_aluno.php?pasta=ID&turma=bd&ordem=desc
// Devolve para o ALUNO os arquivos e pastas que os professores
// cadastraram (tabela arquivos_professor). Somente leitura:
// o aluno não envia, cria nem exclui nada.
// Mesmo formato de resposta do arquivos_listar.php do professor.
// ==========================================================

header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('aluno');

if (!isset($_SESSION['logado']) || $_SESSION['logado'] !== true) {
    http_response_code(401);
    echo json_encode(["sucesso" => false, "mensagem" => "Não autenticado"]);
    exit;
}

// Só aluno usa este endpoint (o professor continua usando arquivos_listar.php)
if (($_SESSION['tipo'] ?? '') !== 'aluno') {
    http_response_code(403);
    echo json_encode(["sucesso" => false, "mensagem" => "Sem permissão"]);
    exit;
}

include_once __DIR__ . '/../connect_nebula.php';

$pastaId = (isset($_GET["pasta"]) && $_GET["pasta"] !== "") ? (int) $_GET["pasta"] : 0;
$turma   = $_GET["turma"] ?? "todas";
$ordem   = (isset($_GET["ordem"]) && $_GET["ordem"] === "asc") ? "ASC" : "DESC";

$filtrarTurma = ($turma !== "" && $turma !== "todas");

// Monta a consulta com prepared statement (pasta raiz = pasta_pai IS NULL)
$sql = "SELECT id_arq_prof AS id, tipo, nome, caminho, turma, data_criacao
        FROM arquivos_professor
        WHERE " . ($pastaId ? "pasta_pai = ?" : "pasta_pai IS NULL")
        . ($filtrarTurma ? " AND turma = ?" : "") . "
        ORDER BY (tipo = 'pasta') DESC, data_criacao $ordem";

$stmt = mysqli_prepare($link, $sql);

if ($pastaId && $filtrarTurma) {
    mysqli_stmt_bind_param($stmt, "is", $pastaId, $turma);
} elseif ($pastaId) {
    mysqli_stmt_bind_param($stmt, "i", $pastaId);
} elseif ($filtrarTurma) {
    mysqli_stmt_bind_param($stmt, "s", $turma);
}

mysqli_stmt_execute($stmt);
$resultado = mysqli_stmt_get_result($stmt);

if (!$resultado) {
    http_response_code(500);
    echo json_encode(["sucesso" => false, "mensagem" => "Erro ao listar arquivos"]);
    exit;
}

$itens = [];
while ($linha = mysqli_fetch_assoc($resultado)) {
    $itens[] = $linha;
}

// Breadcrumb: sobe pela árvore de pastas (pasta_pai em pasta_pai)
$breadcrumb = [];
$idAtual = $pastaId;

while ($idAtual) {

    $stmtPasta = mysqli_prepare($link, "SELECT id_arq_prof AS id, nome, pasta_pai FROM arquivos_professor WHERE id_arq_prof = ?");
    mysqli_stmt_bind_param($stmtPasta, "i", $idAtual);
    mysqli_stmt_execute($stmtPasta);
    $pasta = mysqli_fetch_assoc(mysqli_stmt_get_result($stmtPasta));

    if (!$pasta) break;

    array_unshift($breadcrumb, ["id" => $pasta["id"], "nome" => $pasta["nome"]]);
    $idAtual = $pasta["pasta_pai"];

}

echo json_encode([
    "sucesso" => true,
    "itens" => $itens,
    "breadcrumb" => $breadcrumb
]);