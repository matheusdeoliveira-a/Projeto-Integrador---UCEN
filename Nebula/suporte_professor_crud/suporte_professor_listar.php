<?php
// ==========================================================
// GET suporte_professor_listar.php
// Devolve os professores de prof_login, cada um com a lista de
// disciplinas (tabela prof_disciplinas). Só para o suporte.
// Colocar na mesma pasta do suporte_professor_criar.php.
// ==========================================================

header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../iniciar_sessao.php';
header("Content-Type: application/json; charset=utf-8");
iniciarSessao('suporte');

include_once __DIR__ . '/../connect_nebula.php';
require_once __DIR__ . '/../suporte_permissoes.php';
exigirPermissao($link, 'professores');

try {
    // Descobre sozinho o nome da chave primária de prof_login (id, id_prof, ...)
    $rk = mysqli_query($link, "SHOW KEYS FROM prof_login WHERE Key_name = 'PRIMARY'");
    $pk = mysqli_fetch_assoc($rk)["Column_name"] ?? "id";
    if (!preg_match('/^[A-Za-z0-9_]+$/', $pk)) {
        throw new Exception("Chave primária inesperada");
    }

    $res = mysqli_query($link, "SELECT `$pk` AS id_prof, nome, email, matricula, departamento, titulacao, ativo
                                FROM prof_login
                                ORDER BY nome");

    // ===== DISCIPLINAS: agrupa as disciplinas por professor =====
    // Se a tabela prof_disciplinas ainda não existir, lista os professores sem disciplinas.
    $porProfessor = [];
    try {
        $rd = mysqli_query($link, "SELECT id_prof, nome FROM prof_disciplinas ORDER BY nome");
        while ($d = mysqli_fetch_assoc($rd)) {
            $porProfessor[$d["id_prof"]][] = $d["nome"];
        }
    } catch (Throwable $e) {
        error_log("Listar disciplinas: " . $e->getMessage());
    }

    // ===== TURMAS: agrupa as turmas (sala + turno) por professor =====
    $turmasPorProfessor = [];
    try {
        $rt = mysqli_query($link, "SELECT pt.id_prof, t.id_turma, s.nome AS sala, t.turno
                                   FROM prof_turmas pt
                                   JOIN turmas t ON t.id_turma = pt.id_turma
                                   JOIN salas  s ON s.id_sala  = t.id_sala
                                   ORDER BY s.id_sala, t.turno");
        while ($t = mysqli_fetch_assoc($rt)) {
            $turmasPorProfessor[$t["id_prof"]][] = [
                "id"   => (int) $t["id_turma"],
                "nome" => $t["sala"] . " · " . $t["turno"]
            ];
        }
    } catch (Throwable $e) {
        error_log("Listar turmas dos professores: " . $e->getMessage());
    }

    $professores = [];
    while ($l = mysqli_fetch_assoc($res)) {
        $professores[] = [
            "id"           => (int) $l["id_prof"],   // EDITAR: o JS usa o id para saber qual professor editar
            "nome"         => $l["nome"],
            "email"        => $l["email"],
            "matricula"    => $l["matricula"]    ?? "—",
            "departamento" => $l["departamento"] ?? "—",
            "titulacao"    => $l["titulacao"]    ?? "—",
            "disciplinas"  => $porProfessor[$l["id_prof"]] ?? [],
            "turmas"       => $turmasPorProfessor[$l["id_prof"]] ?? [],
            "status"       => ((int) $l["ativo"] === 1) ? "ativo" : "inativo"
        ];
    }

    echo json_encode(["sucesso" => true, "professores" => $professores]);

} catch (Throwable $erro) {
    error_log("Erro ao listar professores: " . $erro->getMessage());
    http_response_code(500);
    echo json_encode(["sucesso" => false, "mensagem" => "Erro ao consultar os professores."]);
}