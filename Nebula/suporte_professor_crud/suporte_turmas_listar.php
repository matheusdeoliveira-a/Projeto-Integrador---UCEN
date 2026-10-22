<?php
// ==========================================================
// GET suporte_turmas_listar.php
// Lista as 30 turmas (sala + turno) para o suporte escolher
// quais turmas cada professor vai lecionar. Só para o suporte.
// ==========================================================
header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('suporte');

include_once __DIR__ . '/../connect_nebula.php';
require_once __DIR__ . '/../suporte_permissoes.php';
exigirPermissao($link, 'professores');

try {

    $res = mysqli_query($link,
        "SELECT t.id_turma, s.nome AS sala, s.curso, t.turno
           FROM turmas t
           JOIN salas s ON s.id_sala = t.id_sala
          ORDER BY s.id_sala, t.turno");

    $turmas = [];
    while ($l = mysqli_fetch_assoc($res)) {
        $turmas[] = [
            "id"    => (int) $l['id_turma'],
            "sala"  => $l['sala'],
            "curso" => $l['curso'],
            "turno" => $l['turno'],
        ];
    }

    echo json_encode(["sucesso" => true, "turmas" => $turmas]);

} catch (Throwable $erro) {

    error_log("Erro ao listar turmas: " . $erro->getMessage());
    http_response_code(500);
    echo json_encode(["sucesso" => false, "mensagem" => "Erro ao consultar as turmas."]);

}