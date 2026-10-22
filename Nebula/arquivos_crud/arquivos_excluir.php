<?php
// ==========================================================
// POST arquivos_excluir.php
// Campo: id
// Só exclui itens de turmas atribuídas ao professor logado.
// Se for uma pasta, apaga tudo que está dentro dela também
// (subpastas e arquivos), tanto no banco quanto fisicamente.
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

$idProf = (int) $_SESSION['id_prof'];
$id = isset($_POST["id"]) ? (int) $_POST["id"] : 0;

if (!$id) {
    echo json_encode(["sucesso" => false, "mensagem" => "Item inválido."]);
    exit;
}

$stmt = mysqli_prepare($link, "SELECT tipo, caminho, id_turma FROM arquivos_professor WHERE id_arq_prof = ?");
mysqli_stmt_bind_param($stmt, "i", $id);
mysqli_stmt_execute($stmt);
$itemAtual = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
mysqli_stmt_close($stmt);

if (!$itemAtual) {
    echo json_encode(["sucesso" => false, "mensagem" => "Item não encontrado."]);
    exit;
}

// Itens antigos (criados antes da separação por turma) ainda não têm id_turma
if ($itemAtual["id_turma"] === null) {
    echo json_encode(["sucesso" => false, "mensagem" => "Este item antigo ainda não está ligado a uma turma."]);
    exit;
}

// O item precisa ser de uma turma deste professor
if (!turmaDoProfessor($link, $idProf, (int) $itemAtual["id_turma"])) {
    http_response_code(403);
    echo json_encode(["sucesso" => false, "mensagem" => "Este item não pertence a uma turma sua."]);
    exit;
}

// Percorre recursivamente as subpastas para juntar o caminho de
// todos os arquivos físicos que precisam ser apagados do servidor
// (o banco em si é resolvido sozinho pelo ON DELETE CASCADE)
function coletarCaminhosFisicos($link, $idPasta, &$caminhos, $nivel = 0) {
    if ($nivel > 50) return;
    $stmt = mysqli_prepare($link, "SELECT id_arq_prof AS id, tipo, caminho FROM arquivos_professor WHERE pasta_pai = ?");
    mysqli_stmt_bind_param($stmt, "i", $idPasta);
    mysqli_stmt_execute($stmt);
    $itens = mysqli_fetch_all(mysqli_stmt_get_result($stmt), MYSQLI_ASSOC);
    mysqli_stmt_close($stmt);

    foreach ($itens as $item) {
        if ($item["caminho"]) {
            $caminhos[] = $item["caminho"];
        }
        if ($item["tipo"] === "pasta") {
            coletarCaminhosFisicos($link, (int) $item["id"], $caminhos, $nivel + 1);
        }
    }
}

$caminhos = [];
if ($itemAtual["caminho"]) {
    $caminhos[] = $itemAtual["caminho"];
}
if ($itemAtual["tipo"] === "pasta") {
    coletarCaminhosFisicos($link, $id, $caminhos);
}

$stmt = mysqli_prepare($link, "DELETE FROM arquivos_professor WHERE id_arq_prof = ? AND id_turma = ?");
$idTurmaItem = (int) $itemAtual["id_turma"];
mysqli_stmt_bind_param($stmt, "ii", $id, $idTurmaItem);

if (mysqli_stmt_execute($stmt)) {
    foreach ($caminhos as $caminho) {
        $caminhoCompleto = __DIR__ . "/" . $caminho;
        if (file_exists($caminhoCompleto)) {
            unlink($caminhoCompleto);
        }
    }
    echo json_encode(["sucesso" => true]);
} else {
    echo json_encode(["sucesso" => false, "mensagem" => mysqli_error($link)]);
}
