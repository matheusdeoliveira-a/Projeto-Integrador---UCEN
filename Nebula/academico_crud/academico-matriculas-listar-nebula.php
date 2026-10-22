<?php
include_once(__DIR__ . "/academico-base-nebula.php");
exigirMetodo('GET');

// Lista TODAS as matrículas (tabela `matriculas`), tenham ou não a conta criada.
// Colunas da tela: aluno, curso, data da matrícula, forma de ingresso, status.

try {

    // Data da matrícula: usa a primeira coluna de data que existir na tabela.
    // (Se souber o nome certo, deixe só ele em $candidatas.)
    $candidatas = ['criado_em'];
    $colunaData = null;

    $res = mysqli_query($link, "SHOW COLUMNS FROM matriculas");
    $existentes = [];
    while ($c = mysqli_fetch_assoc($res)) {
        $existentes[] = $c['Field'];
    }
    foreach ($candidatas as $nomeColuna) {
        if (in_array($nomeColuna, $existentes, true)) {
            $colunaData = $nomeColuna;
            break;
        }
    }

    $selectData = $colunaData ? "m.`$colunaData`" : "NULL";

    $resultado = mysqli_query(
        $link,
        "SELECT m.id_matricula                  AS id,
                m.nome_completo                 AS aluno,
                COALESCE(m.curso, s.curso)      AS curso,
                $selectData                     AS data,
                COALESCE(i.ingresso, m.modalidade)  AS ingresso,
                m.status_matricula,
                m.status_aluno
           FROM matriculas m
           LEFT JOIN inscricoes i ON i.id_inscricoes = m.id_inscricoes
           LEFT JOIN turmas t ON t.id_turma = m.id_turma
           LEFT JOIN salas  s ON s.id_sala  = t.id_sala
          ORDER BY m.id_matricula DESC"
    );

    $rotulosIngresso = ['vestibular' => 'Vestibular', 'enem' => 'ENEM', 'prouni' => 'PROUNI'];

    $matriculas = [];

    while ($linha = mysqli_fetch_assoc($resultado)) {

        $ingresso = (string) $linha['ingresso'];
        $chave    = mb_strtolower($ingresso);

        $matriculas[] = [
            "id"       => (int) $linha['id'],
            "aluno"    => $linha['aluno'],
            "curso"    => $linha['curso'] ?? '',
            "data"     => $linha['data'] ? date('d/m/Y', strtotime($linha['data'])) : '—',
            "ingresso" => $rotulosIngresso[$chave] ?? ($ingresso !== '' ? $ingresso : '—'),
            // aguardando pagamento -> Pendente | senão vale o status_aluno
            "status"   => $linha['status_matricula'] === 'aguardando_pagamento' ? 'pendente' : $linha['status_aluno']
        ];
    }

    echo json_encode(["sucesso" => true, "matriculas" => $matriculas]);

} catch (mysqli_sql_exception $e) {

    error_log("listar matriculas: " . $e->getMessage());
    http_response_code(500);
    responderErro("Não foi possível carregar as matrículas.");

}
