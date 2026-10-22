<?php
// ==========================================================
// vagas_nebula.php
// Regras das vagas, usadas na APROVAÇÃO do vestibular.
//
// - Cada graduação tem 1 sala; cada sala tem 3 turmas (Matutino, Vespertino, Noturno).
// - Cada turma tem 25 vagas: 15 (60%) para o vestibular e 10 (40%) para o ENEM.
//   Por enquanto só o vestibular existe, então só as 15 são usadas aqui.
// - Ao aprovar, tenta a turma da 1ª opção (curso1 + turno1); se estiver cheia, a da
//   2ª opção (curso2 + turno2); se as duas estiverem cheias, não há vaga (reprovado).
// - A vaga fica reservada até VAGAS_PRAZO_RESERVA. Depois dessa data, quem não se
//   matriculou deixa de ocupar vaga (sem precisar de rotina agendada).
//
// Chame reservarTurma() DENTRO de uma transação já aberta.
// ==========================================================

const VAGAS_PRAZO_RESERVA = '2027-02-20';   // último dia (inclusive) da reserva e da matrícula
const VAGAS_PRAZO_TEXTO   = '20/02/2027';

// Vagas do ENEM por turma (40% de 25). O vestibular continua usando turmas.vagas_vestibular.
const VAGAS_ENEM_POR_TURMA = 10;

// Hoje no horário de Brasília (o servidor da EC2 costuma estar em UTC)
function hojeBrasilia() {
    return (new DateTime('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
}

function prazoReservaEncerrado() {
    return hojeBrasilia() > VAGAS_PRAZO_RESERVA;
}

// Quantas vagas da turma já estão ocupadas por esta forma de ingresso ('vestibular' ou 'enem')
function vagasOcupadasVestibular($link, $idTurma, $ingresso = 'vestibular') {

    $reservaAtiva = prazoReservaEncerrado() ? 0 : 1;

    $stmt = mysqli_prepare($link,
        "SELECT COUNT(*) AS total
           FROM inscricoes i
          WHERE i.id_turma = ?
            AND i.ingresso = ?
            AND (? = 1 OR EXISTS (SELECT 1 FROM matriculas m WHERE m.id_inscricoes = i.id_inscricoes))");
    mysqli_stmt_bind_param($stmt, "isi", $idTurma, $ingresso, $reservaAtiva);
    mysqli_stmt_execute($stmt);
    $linha = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

    return (int) $linha['total'];
}

// Tenta reservar uma turma para a inscrição. Devolve os dados da turma escolhida
// ou null se a 1ª e a 2ª opção estiverem cheias. $ingresso ('vestibular' ou 'enem') define
// qual cota de vagas é usada. $insc precisa ter
// curso_opcao1, turno_opcao1, curso_opcao2 e turno_opcao2.
function reservarTurma($link, array $insc, $ingresso = 'vestibular') {

    $opcoes = [
        1 => [$insc['curso_opcao1'], $insc['turno_opcao1']],
        2 => [$insc['curso_opcao2'], $insc['turno_opcao2']],
    ];

    // 1) acha a turma de cada opção
    $candidatas = [];

    foreach ($opcoes as $numero => [$curso, $turno]) {

        $stmt = mysqli_prepare($link,
            "SELECT t.id_turma, t.turno, t.vagas_vestibular, s.nome AS sala, s.curso
               FROM turmas t
               JOIN salas s ON s.id_sala = t.id_sala
              WHERE s.curso = ? AND t.turno = ?");
        mysqli_stmt_bind_param($stmt, "ss", $curso, $turno);
        mysqli_stmt_execute($stmt);
        $turma = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
        mysqli_stmt_close($stmt);

        if ($turma) {
            $turma['opcao'] = $numero;
            $candidatas[$numero] = $turma;
        }
    }

    if (!$candidatas) return null;

    // 2) trava as turmas candidatas (sempre em ordem de id, para duas aprovações
    //    ao mesmo tempo não se travarem uma na outra) e conta as vagas só depois disso
    $ids = array_map('intval', array_column($candidatas, 'id_turma'));
    sort($ids);
    $marcas = implode(',', array_fill(0, count($ids), '?'));

    $stmt = mysqli_prepare($link,
        "SELECT id_turma FROM turmas WHERE id_turma IN ($marcas) ORDER BY id_turma FOR UPDATE");
    mysqli_stmt_bind_param($stmt, str_repeat('i', count($ids)), ...$ids);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_get_result($stmt);
    mysqli_stmt_close($stmt);

    // 3) 1ª opção primeiro, depois a 2ª
    ksort($candidatas);

    foreach ($candidatas as $turma) {
        $limite = ($ingresso === 'enem') ? VAGAS_ENEM_POR_TURMA : (int) $turma['vagas_vestibular'];

        if (vagasOcupadasVestibular($link, (int) $turma['id_turma'], $ingresso) < $limite) {
            return $turma;
        }
    }

    return null;
}
