<?php
// ==========================================================
// GET professor_minhas_turmas.php
// Devolve SÓ as turmas que o suporte atribuiu ao professor logado
// (tabela prof_turmas), cada uma com os alunos matriculados nela.
// ==========================================================
require_once __DIR__ . '/iniciar_sessao.php';
iniciarSessao('professor');

header("Content-Type: application/json; charset=utf-8");
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

include_once(__DIR__ . "/connect_nebula.php");
mysqli_set_charset($link, "utf8mb4");

if (empty($_SESSION['logado']) || ($_SESSION['tipo'] ?? '') !== 'professor' || empty($_SESSION['id_prof'])) {
    http_response_code(401);
    echo json_encode(["sucesso" => false, "mensagem" => "Sessão expirada. Faça login novamente."]);
    exit;
}

$idProf = (int) $_SESSION['id_prof'];

try {

    $stmt = mysqli_prepare($link,
        "SELECT t.id_turma, s.nome AS sala, s.curso, t.turno
           FROM prof_turmas pt
           JOIN turmas t ON t.id_turma = pt.id_turma
           JOIN salas  s ON s.id_sala  = t.id_sala
          WHERE pt.id_prof = ?
          ORDER BY s.id_sala, t.turno");
    mysqli_stmt_bind_param($stmt, "i", $idProf);
    mysqli_stmt_execute($stmt);
    $turmas = mysqli_fetch_all(mysqli_stmt_get_result($stmt), MYSQLI_ASSOC);
    mysqli_stmt_close($stmt);

    $alunosPorTurma = [];

    if ($turmas) {

        $ids    = array_map(fn($t) => (int) $t['id_turma'], $turmas);
        $marcas = implode(',', array_fill(0, count($ids), '?'));

        $stmt = mysqli_prepare($link,
            "SELECT id_turma, nome_completo, status_matricula
               FROM matriculas
              WHERE id_turma IN ($marcas)
              ORDER BY nome_completo");
        mysqli_stmt_bind_param($stmt, str_repeat('i', count($ids)), ...$ids);
        mysqli_stmt_execute($stmt);
        $res = mysqli_stmt_get_result($stmt);

        while ($a = mysqli_fetch_assoc($res)) {
            $alunosPorTurma[(int) $a['id_turma']][] = [
                "nome"       => $a['nome_completo'],
                "confirmada" => $a['status_matricula'] === 'confirmada',
            ];
        }
        mysqli_stmt_close($stmt);
    }

} catch (mysqli_sql_exception $e) {

    error_log("professor_minhas_turmas: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["sucesso" => false, "mensagem" => "Não foi possível carregar suas turmas."]);
    exit;

}

$saida = [];
foreach ($turmas as $t) {
    $id = (int) $t['id_turma'];
    $saida[] = [
        "id"     => $id,
        "sala"   => $t['sala'],
        "curso"  => $t['curso'],
        "turno"  => $t['turno'],
        "alunos" => $alunosPorTurma[$id] ?? [],
    ];
}

echo json_encode(["sucesso" => true, "turmas" => $saida]);
