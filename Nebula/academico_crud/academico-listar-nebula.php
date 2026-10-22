<?php
include_once(__DIR__ . "/academico-base-nebula.php");
exigirMetodo('GET');

// Os alunos cadastrados ficam na tabela `matriculas`.
// "Cadastrado" = a matrícula já tem conta criada (id_usuarios preenchido pelo link do e-mail).
// Não existe tabela `alunos` no banco.

try {

    $resultado = mysqli_query(
        $link,
        "SELECT m.id_matricula                              AS id,
                m.nome_completo                             AS nome,
                LPAD(m.id_matricula, 6, '0')                AS matricula,   -- RA (mesmo cálculo do aluno_eu.php)
                COALESCE(m.curso, s.curso)                  AS curso,
                m.email                                     AS contato,
                m.semestre,
                m.status_aluno,
                m.status_matricula
           FROM matriculas m
           LEFT JOIN turmas t ON t.id_turma = m.id_turma
           LEFT JOIN salas  s ON s.id_sala  = t.id_sala
          WHERE m.id_usuarios IS NOT NULL
          ORDER BY m.nome_completo"
    );

    $alunos = [];

    while ($linha = mysqli_fetch_assoc($resultado)) {

        $alunos[] = [
            "id"        => (int) $linha['id'],
            "nome"      => $linha['nome'],
            "matricula" => $linha['matricula'],
            "curso"     => $linha['curso'] ?? '',
            "semestre"  => $linha['semestre'],
            "contato"   => $linha['contato'],
            // aguardando pagamento -> Pendente | senão vale o status_aluno (ativo/trancado/cancelado)
            "status"    => $linha['status_matricula'] === 'aguardando_pagamento' ? 'pendente' : $linha['status_aluno']
        ];
    }

    echo json_encode(["sucesso" => true, "alunos" => $alunos]);

} catch (mysqli_sql_exception $e) {

    error_log("listar alunos: " . $e->getMessage());
    http_response_code(500);
    responderErro("Não foi possível carregar os alunos.");

}