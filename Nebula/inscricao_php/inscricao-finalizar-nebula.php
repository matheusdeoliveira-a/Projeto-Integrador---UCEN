<?php
header("Content-type: application/json;charset=utf-8");

session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'httponly' => true,
    'samesite' => 'Lax'
]);
session_start();

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

include_once(__DIR__ . "/../connect_nebula.php");
mysqli_set_charset($link, "utf8mb4");

// Quantas vezes a pessoa pode pedir a isenção (a 1ª conta como tentativa)
const MAX_TENTATIVAS_ISENCAO = 3;

function responderErro($mensagem) {
    echo json_encode(["sucesso" => false, "erro" => $mensagem]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    responderErro("Método inválido");
}

// ---------- Confere se a inscrição na sessão está completa ----------
$r = $_SESSION['inscricao'] ?? null;

if (empty($r['pessoais']) || empty($r['jornada']) || empty($r['ensino_medio'])) {
    responderErro("Sua sessão expirou. Recarregue a página e comece a inscrição novamente.");
}

// Só quem tem direito à isenção finaliza por aqui (quem paga finaliza pelo pagamento)
if (!in_array($r['ensino_medio'], ['Publica', 'Privada Bolsa'], true)) {
    responderErro("Esta inscrição só é concluída após o pagamento da taxa.");
}

// Se veio de uma isenção recusada (nova tentativa), a etapa 1 guardou o id dela na sessão
$idReenvio = (int) ($r['reenvio_id'] ?? 0);

// ---------- Valida os 4 documentos ----------
$campos = ['doc-historico', 'doc-residencia', 'doc-holerite', 'doc-extrato'];
$extPermitidas = [
    'pdf'  => 'application/pdf',
    'png'  => 'image/png',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg'
];
$tamanhoMax = 5 * 1024 * 1024; // 5 MB por arquivo

$finfo = new finfo(FILEINFO_MIME_TYPE);
$arquivos = [];

foreach ($campos as $campo) {

    $f = $_FILES[$campo] ?? null;

    if (!$f || $f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) {
        responderErro("Envie todos os documentos obrigatórios (máx. 5 MB cada).");
    }
    if ($f['size'] > $tamanhoMax) {
        responderErro("Cada arquivo pode ter no máximo 5 MB.");
    }

    $ext  = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
    $mime = $finfo->file($f['tmp_name']);

    if (!isset($extPermitidas[$ext]) || $extPermitidas[$ext] !== $mime) {
        responderErro("Formato inválido. Envie PDF, PNG ou JPG.");
    }

    $arquivos[$campo] = [
        'tmp'      => $f['tmp_name'],
        'ext'      => $ext,
        // nome que a pessoa deu ao arquivo (só para o suporte reconhecer; limpo e curto)
        'original' => mb_substr(preg_replace('/[^\p{L}\p{N}._ -]/u', '', basename($f['name'])), 0, 150)
    ];
}

$p = $r['pessoais'];
$j = $r['jornada'];

$pasta     = null;
$gravados  = [];   // só os arquivos DESTA tentativa (os das tentativas antigas ficam)

try {

    mysqli_begin_transaction($link);

    if ($idReenvio > 0) {

        // ----- Nova tentativa: confere se ainda pode e atualiza a mesma inscrição -----
        $stmt = mysqli_prepare($link,
            "SELECT status_isencao, tentativas_isencao FROM inscricoes
              WHERE id_inscricoes = ? FOR UPDATE");
        mysqli_stmt_bind_param($stmt, "i", $idReenvio);
        mysqli_stmt_execute($stmt);
        $atual = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
        mysqli_stmt_close($stmt);

        if (!$atual || $atual['status_isencao'] !== 'recusada') {
            mysqli_rollback($link);
            responderErro("Não é possível reenviar a isenção desta inscrição.");
        }
        if ((int) $atual['tentativas_isencao'] >= MAX_TENTATIVAS_ISENCAO) {
            mysqli_rollback($link);
            responderErro("Suas " . MAX_TENTATIVAS_ISENCAO . " tentativas de isenção acabaram. Para continuar, pague a taxa de inscrição.");
        }

        $idInscricao = $idReenvio;
        $tentativa   = (int) $atual['tentativas_isencao'] + 1;

        $stmt = mysqli_prepare($link,
            "UPDATE inscricoes
                SET nome_completo = ?, email = ?, telefone = ?, telefone_reserva = ?,
                    curso_opcao1 = ?, curso_opcao2 = ?, turno_opcao1 = ?, turno_opcao2 = ?,
                    modalidade = ?, ensino_medio = ?,
                    status_isencao = 'em_analise', tentativas_isencao = ?,
                    motivo_recusa = NULL, analisado_em = NULL, etapa_atual = 5
              WHERE id_inscricoes = ?");
        mysqli_stmt_bind_param($stmt, "ssssssssssii",
            $p['nome'], $p['email'], $p['telefone'], $p['reserva'],
            $j['curso1'], $j['curso2'], $j['turno1'], $j['turno2'], $j['modalidade'],
            $r['ensino_medio'], $tentativa, $idInscricao);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);

    } else {

        // ----- Primeira tentativa: cria a inscrição já "em análise" -----
        $tentativa = 1;

        $stmt = mysqli_prepare($link,
            "INSERT INTO inscricoes
                (nome_completo, cpf, data_nascimento, email, telefone, telefone_reserva,
                 curso_opcao1, curso_opcao2, turno_opcao1, turno_opcao2, modalidade,
                 ensino_medio, status_isencao, tentativas_isencao, etapa_atual)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'em_analise', 1, 5)");
        mysqli_stmt_bind_param($stmt, "ssssssssssss",
            $p['nome'], $p['cpf'], $p['nascimento'], $p['email'], $p['telefone'], $p['reserva'],
            $j['curso1'], $j['curso2'], $j['turno1'], $j['turno2'], $j['modalidade'],
            $r['ensino_medio']);
        mysqli_stmt_execute($stmt);
        $idInscricao = mysqli_insert_id($link);
        mysqli_stmt_close($stmt);
    }

    // Pasta privada: fora de acesso direto pelo navegador
    $base  = __DIR__ . '/../uploads_isencao';
    $pasta = $base . '/' . $idInscricao;

    if (!is_dir($pasta) && !mkdir($pasta, 0750, true)) {
        throw new RuntimeException("Não foi possível criar a pasta de documentos.");
    }
    if (!file_exists($base . '/.htaccess')) {
        file_put_contents($base . '/.htaccess', "Require all denied\n");
    }

    $stmtDoc = mysqli_prepare($link,
        "INSERT INTO inscricao_documentos (id_inscricoes, tipo, arquivo, nome_original, tentativa)
         VALUES (?, ?, ?, ?, ?)");

    foreach ($arquivos as $campo => $a) {
        $nomeArquivo = $campo . '-' . bin2hex(random_bytes(8)) . '.' . $a['ext'];
        $destino     = $pasta . '/' . $nomeArquivo;

        if (!move_uploaded_file($a['tmp'], $destino)) {
            throw new RuntimeException("Falha ao salvar o arquivo $campo.");
        }
        $gravados[] = $destino;

        $original = $a['original'] !== '' ? $a['original'] : $campo . '.' . $a['ext'];
        mysqli_stmt_bind_param($stmtDoc, "isssi", $idInscricao, $campo, $nomeArquivo, $original, $tentativa);
        mysqli_stmt_execute($stmtDoc);
    }
    mysqli_stmt_close($stmtDoc);

    mysqli_commit($link);

} catch (Throwable $e) {

    mysqli_rollback($link);

    // Apaga só os arquivos gravados nesta tentativa
    foreach ($gravados as $arq) {
        @unlink($arq);
    }
    if ($pasta && $idReenvio === 0 && is_dir($pasta)) {
        @rmdir($pasta);
    }

    if ($e instanceof mysqli_sql_exception && $e->getCode() === 1062) {
        responderErro("Já existe uma inscrição com estes dados (CPF, e-mail ou telefone).");
    }

    error_log("finalizar inscricao: " . $e->getMessage());
    http_response_code(500);
    responderErro("Não foi possível concluir sua inscrição. Tente novamente.");
}

// Pronto: agora sim ela existe no banco. Limpa o rascunho da sessão.
unset($_SESSION['inscricao']);
$_SESSION['id_inscricao'] = $idInscricao;

echo json_encode(["sucesso" => true]);
