<?php
// Suporte aprova ou recusa a isenção de um candidato e o candidato recebe o e-mail.
include_once(__DIR__ . "/academico-base-nebula.php");
require_once __DIR__ . '/../suporte_permissoes.php';
require_once __DIR__ . '/../vestibular_nota_nebula.php';
exigirPermissao($link, 'academico');
exigirMetodo('POST');

const MAX_TENTATIVAS_ISENCAO = 3;
// Endereço da página de inscrição (vai no e-mail de recusa, para a pessoa tentar de novo)
const URL_INSCRICAO = 'https://nebula-ucen.duckdns.org/Nebula/Nebula/inscricao.html';

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
        "SELECT nome_completo, email, status_isencao, tentativas_isencao
           FROM inscricoes WHERE id_inscricoes = ? FOR UPDATE");
    mysqli_stmt_bind_param($stmt, "i", $id);
    mysqli_stmt_execute($stmt);
    $insc = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

    if (!$insc || $insc['status_isencao'] === null) {
        mysqli_rollback($link);
        responderErro("Inscrição não encontrada.");
    }
    if ($insc['status_isencao'] !== 'em_analise') {
        mysqli_rollback($link);
        responderErro("Esta isenção já foi decidida (aprovada ou recusada).");
    }

    if ($acao === 'aprovar') {
        $stmt = mysqli_prepare($link,
            "UPDATE inscricoes
                SET status_isencao = 'aprovada', motivo_recusa = NULL, analisado_em = NOW()
              WHERE id_inscricoes = ?");
        mysqli_stmt_bind_param($stmt, "i", $id);
    } else {
        $stmt = mysqli_prepare($link,
            "UPDATE inscricoes SET status_isencao = 'recusada', motivo_recusa = ?, analisado_em = NOW()
              WHERE id_inscricoes = ?");
        mysqli_stmt_bind_param($stmt, "si", $motivo, $id);
    }
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    // Isenção aprovada: gera a nota (50 a 100) e deixa pendente para o suporte decidir.
    // É a mesma função que o Pix usa (vestibular_nota_nebula.php).
    if ($acao === 'aprovar') {
        gerarNotaVestibular($link, $id);
    }

    mysqli_commit($link);

} catch (mysqli_sql_exception $e) {

    mysqli_rollback($link);
    error_log("decidir isencao: " . $e->getMessage());
    http_response_code(500);
    responderErro("Não foi possível salvar a decisão.");

}

// ---------- E-mail (depois de gravar, para um problema no SMTP não desfazer a decisão) ----------
require_once __DIR__ . '/../mailer.php';

$nome = htmlspecialchars($insc['nome_completo'], ENT_QUOTES, 'UTF-8');

if ($acao === 'aprovar') {

    $assunto = "Isenção aprovada - Vestibular Nebula";
    $corpo   = "<p>Olá, <strong>$nome</strong>!</p>"
             . "<p>Sua solicitação de isenção da taxa foi <strong>aprovada</strong> e sua inscrição no vestibular está confirmada.</p>"
             . "<p>Sua nota do vestibular será analisada pelo suporte acadêmico e o resultado será enviado a você por e-mail.</p>"
             . "<p>Atenciosamente,<br>Equipe Nebula</p>";

} else {

    $restantes = MAX_TENTATIVAS_ISENCAO - (int) $insc['tentativas_isencao'];
    $motivoHtml = nl2br(htmlspecialchars($motivo, ENT_QUOTES, 'UTF-8'));

    if ($restantes > 0) {
        $proximo = "<p>Você ainda pode tentar novamente: restam <strong>$restantes</strong> tentativa(s). "
                 . "Refaça a inscrição com o mesmo CPF e envie os documentos corrigidos: "
                 . "<a href=\"" . URL_INSCRICAO . "\">" . URL_INSCRICAO . "</a></p>";
    } else {
        $proximo = "<p>Suas " . MAX_TENTATIVAS_ISENCAO . " tentativas de isenção acabaram. "
                 . "Para participar do vestibular, faça a inscrição pagando a taxa: "
                 . "<a href=\"" . URL_INSCRICAO . "\">" . URL_INSCRICAO . "</a></p>";
    }

    $assunto = "Isenção não aprovada - Vestibular Nebula";
    $corpo   = "<p>Olá, <strong>$nome</strong>!</p>"
             . "<p>Analisamos seus documentos e sua solicitação de isenção da taxa <strong>não foi aprovada</strong>.</p>"
             . "<p><strong>Motivo:</strong><br>$motivoHtml</p>"
             . $proximo
             . "<p>Atenciosamente,<br>Equipe Nebula</p>";
}

$enviado = enviarEmail($insc['email'], $insc['nome_completo'], $assunto, $corpo);

echo json_encode(["sucesso" => true, "email_enviado" => $enviado]);
