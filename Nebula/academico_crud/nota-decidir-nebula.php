<?php
// Suporte aprova ou recusa a nota do vestibular; o candidato recebe e-mail com a nota e o resultado.
// Se aprovado, o e-mail leva um botão para a matrícula.
// Ao aprovar, o sistema reserva a vaga na turma (1ª opção; se cheia, 2ª opção; se cheia, reprova).
include_once(__DIR__ . "/academico-base-nebula.php");
require_once __DIR__ . '/../suporte_permissoes.php';
require_once __DIR__ . '/../vagas_nebula.php';
exigirPermissao($link, 'academico');
exigirMetodo('POST');

// Endereço da matrícula (o token do candidato vai na URL)
const URL_MATRICULA = 'https://nebula-ucen.duckdns.org/Nebula/Nebula/matricula.html';

$id     = filter_var($_POST['id'] ?? '', FILTER_VALIDATE_INT);
$acao   = campoPost('acao');
$motivo = campoPost('motivo');

if (!$id || !in_array($acao, ['aprovar', 'recusar'], true)) {
    responderErro("Pedido inválido.");
}
if ($acao === 'recusar' && (mb_strlen($motivo) < 5 || mb_strlen($motivo) > 500)) {
    responderErro("Escreva o motivo da recusa (de 5 a 500 caracteres).", "motivo");
}

try {

    mysqli_begin_transaction($link);

    // FOR UPDATE: se dois operadores decidirem ao mesmo tempo, só o primeiro vale
    $stmt = mysqli_prepare($link,
        "SELECT nome_completo, email, ingresso, nota_vestibular, status_vestibular, token_matricula,
                curso_opcao1, turno_opcao1, curso_opcao2, turno_opcao2
           FROM inscricoes WHERE id_inscricoes = ? FOR UPDATE");
    mysqli_stmt_bind_param($stmt, "i", $id);
    mysqli_stmt_execute($stmt);
    $insc = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

    if (!$insc || $insc['status_vestibular'] === null) {
        mysqli_rollback($link);
        responderErro("Nota não encontrada.");
    }
    if ($insc['status_vestibular'] !== 'pendente') {
        mysqli_rollback($link);
        responderErro("Esta nota já foi decidida (aprovada ou recusada).");
    }

    // Aprovar = reservar vaga. Sem vaga na 1ª nem na 2ª opção, vira reprovação automática.
    $turma   = null;
    $semVaga = false;

    if ($acao === 'aprovar') {
        $turma = reservarTurma($link, $insc, $insc['ingresso']);

        if (!$turma) {
            $semVaga = true;
            $motivo  = "Não há vagas disponíveis nas turmas escolhidas (1ª e 2ª opção).";
        }
    }

    if ($acao === 'aprovar' && $turma) {
        $stmt = mysqli_prepare($link,
            "UPDATE inscricoes
                SET status_vestibular = 'aprovado', motivo_vestibular = NULL, analisado_vestibular_em = NOW(),
                    id_turma = ?, reservada_em = NOW()
              WHERE id_inscricoes = ?");
        $idTurma = (int) $turma['id_turma'];
        mysqli_stmt_bind_param($stmt, "ii", $idTurma, $id);
    } else {
        $stmt = mysqli_prepare($link,
            "UPDATE inscricoes
                SET status_vestibular = 'reprovado', motivo_vestibular = ?, analisado_vestibular_em = NOW()
              WHERE id_inscricoes = ?");
        mysqli_stmt_bind_param($stmt, "si", $motivo, $id);
    }
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    mysqli_commit($link);

} catch (mysqli_sql_exception $e) {

    mysqli_rollback($link);
    error_log("decidir nota: " . $e->getMessage());
    http_response_code(500);
    responderErro("Não foi possível salvar a decisão.");

}

// ---------- E-mail (depois de gravar, para um problema no SMTP não desfazer a decisão) ----------
require_once __DIR__ . '/../mailer.php';

$nome = htmlspecialchars($insc['nome_completo'], ENT_QUOTES, 'UTF-8');
$nota = (int) $insc['nota_vestibular'];

// ENEM: não há nota sorteada (ela está no PDF do boletim), então o e-mail não cita número
$ehEnem  = ($insc['ingresso'] === 'enem');
$processo = $ehEnem ? 'ENEM' : 'vestibular';

$fraseAprovado  = $ehEnem
    ? "<p>Seu Boletim do ENEM foi analisado e você está <strong>aprovado(a)</strong>. Parabéns!</p>"
    : "<p>Sua nota no vestibular foi <strong>$nota</strong> e você está <strong>aprovado(a)</strong>. Parabéns!</p>";
$fraseReprovado = $ehEnem
    ? "<p>Seu Boletim do ENEM foi analisado e, infelizmente, você <strong>não foi aprovado(a)</strong>.</p>"
    : "<p>Sua nota no vestibular foi <strong>$nota</strong> e, infelizmente, você <strong>não foi aprovado(a)</strong>.</p>";

if ($acao === 'aprovar' && $turma) {

    $link_matricula = URL_MATRICULA . '?t=' . urlencode($insc['token_matricula']);

    // Se a 1ª opção estava cheia, avisa que a vaga veio da 2ª
    $avisoSegundaOpcao = ($turma['opcao'] === 2)
        ? "<p>As vagas da sua 1ª opção estavam esgotadas, por isso você foi alocado(a) na sua <strong>2ª opção</strong>.</p>"
        : "";

    $assunto = "Resultado do $processo: aprovado - Nebula";
    $corpo   = "<p>Olá, <strong>$nome</strong>!</p>"
             . $fraseAprovado
             . "<p>Sua vaga: <strong>" . htmlspecialchars($turma['sala'], ENT_QUOTES, 'UTF-8') . "</strong> - curso de <strong>"
             . htmlspecialchars($turma['curso'], ENT_QUOTES, 'UTF-8') . "</strong>, turno <strong>"
             . htmlspecialchars($turma['turno'], ENT_QUOTES, 'UTF-8') . "</strong>.</p>"
             . $avisoSegundaOpcao
             . "<p>Para continuar, faça a sua matrícula pelo botão abaixo até <strong>" . VAGAS_PRAZO_TEXTO . "</strong>, "
             . "quando a vaga reservada é liberada:</p>"
             . "<p><a href=\"$link_matricula\" style=\"display:inline-block;padding:12px 24px;background:#1a56db;color:#ffffff;"
             . "text-decoration:none;border-radius:6px;font-weight:bold;\">Ir para a matrícula</a></p>"
             . "<p>Atenciosamente,<br>Equipe Nebula</p>";

} else {

    $motivoHtml = nl2br(htmlspecialchars($motivo, ENT_QUOTES, 'UTF-8'));

    $assunto = "Resultado do $processo: não aprovado - Nebula";
    $corpo   = "<p>Olá, <strong>$nome</strong>!</p>"
             . $fraseReprovado
             . "<p><strong>Motivo:</strong><br>$motivoHtml</p>"
             . "<p>Atenciosamente,<br>Equipe Nebula</p>";
}

$enviado = enviarEmail($insc['email'], $insc['nome_completo'], $assunto, $corpo);

echo json_encode(["sucesso" => true, "email_enviado" => $enviado, "sem_vaga" => $semVaga]);