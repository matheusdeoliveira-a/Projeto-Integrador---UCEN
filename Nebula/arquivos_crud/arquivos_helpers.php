<?php
// ==========================================================
// arquivos_helpers.php
// Funções compartilhadas pelo CRUD de arquivos do PROFESSOR
// (arquivos_listar, arquivos_upload, arquivos_nova_pasta,
//  arquivos_excluir, arquivos_todas_pastas).
// Cada arquivo faz require_once deste, DEPOIS do connect_nebula.php.
//
// Regra de ouro: o professor só mexe em arquivos de turmas que o
// suporte atribuiu a ele (tabela prof_turmas).
// ==========================================================

// Devolve a turma (id_turma, sala, curso, turno) SE ela for do professor; senão null.
function turmaDoProfessor(mysqli $link, int $idProf, int $idTurma): ?array {
    if ($idProf <= 0 || $idTurma <= 0) {
        return null;
    }
    $stmt = mysqli_prepare($link,
        "SELECT t.id_turma, s.nome AS sala, s.curso, t.turno
           FROM prof_turmas pt
           JOIN turmas t ON t.id_turma = pt.id_turma
           JOIN salas  s ON s.id_sala  = t.id_sala
          WHERE pt.id_prof = ? AND pt.id_turma = ?
          LIMIT 1");
    mysqli_stmt_bind_param($stmt, "ii", $idProf, $idTurma);
    mysqli_stmt_execute($stmt);
    $linha = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);
    return $linha ?: null;
}

// Texto da turma que aparece na etiqueta da linha e no filtro do aluno. Ex.: "Sala 01 - Matutino"
// (também é gravado na coluna antiga "turma", que o portal do aluno ainda usa para filtrar)
function rotuloTurma(array $turma): string {
    return $turma['sala'] . ' - ' . $turma['turno'];
}

// A pasta existe, é uma pasta (não um arquivo) e é DESTA turma?
function pastaDaTurma(mysqli $link, int $idPasta, int $idTurma): bool {
    $stmt = mysqli_prepare($link,
        "SELECT 1 FROM arquivos_professor
          WHERE id_arq_prof = ? AND id_turma = ? AND tipo = 'pasta' LIMIT 1");
    mysqli_stmt_bind_param($stmt, "ii", $idPasta, $idTurma);
    mysqli_stmt_execute($stmt);
    $achou = mysqli_fetch_row(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);
    return (bool) $achou;
}

// Caminho "Início > Pasta A > Pasta B" até a pasta atual: [["id"=>1,"nome"=>"Pasta A"], ...]
function montarBreadcrumb(mysqli $link, ?int $pastaId, int $idTurma): array {
    $caminho = [];
    $atual   = $pastaId;
    $voltas  = 0;

    while ($atual && $voltas++ < 50) {   // trava contra pastas encadeadas em círculo
        $stmt = mysqli_prepare($link,
            "SELECT id_arq_prof AS id, nome, pasta_pai
               FROM arquivos_professor
              WHERE id_arq_prof = ? AND id_turma = ? LIMIT 1");
        mysqli_stmt_bind_param($stmt, "ii", $atual, $idTurma);
        mysqli_stmt_execute($stmt);
        $pasta = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
        mysqli_stmt_close($stmt);

        if (!$pasta) break;

        array_unshift($caminho, ["id" => (int) $pasta["id"], "nome" => $pasta["nome"]]);
        $atual = $pasta["pasta_pai"] !== null ? (int) $pasta["pasta_pai"] : null;
    }

    return $caminho;
}
