<?php
// ==========================================================
// GET arquivos_turmas.php
// Retorna, em JSON, a lista de turmas/disciplinas distintas já
// usadas em arquivos_professor - usada para montar os botões de
// filtro no topo da página e as sugestões (datalist) dos campos
// de "Turma / Disciplina" dos modais.
// ==========================================================

header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('professor');

// Só professor logado pode usar esta rotina
if (!isset($_SESSION['logado']) || $_SESSION['logado'] !== true) {
    http_response_code(401);
    echo json_encode(["sucesso" => false, "mensagem" => "Não autenticado"]);
    exit;
}
if (($_SESSION['tipo'] ?? '') !== 'professor') {
    http_response_code(403);
    echo json_encode(["sucesso" => false, "mensagem" => "Sem permissão"]);
    exit;
}

include_once __DIR__ . '/../connect_nebula.php';

$sql = "SELECT DISTINCT turma FROM arquivos_professor WHERE turma <> '' ORDER BY turma ASC";
$resultado = mysqli_query($link, $sql);

if (!$resultado) {
    echo json_encode(["sucesso" => false, "mensagem" => mysqli_error($link)]);
    exit;
}

$turmas = [];
while ($linha = mysqli_fetch_assoc($resultado)) {
    $turmas[] = $linha["turma"];
}

echo json_encode(["sucesso" => true, "turmas" => $turmas]);
