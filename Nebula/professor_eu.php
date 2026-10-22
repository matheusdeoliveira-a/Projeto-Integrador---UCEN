<?php
// ==========================================================
// GET professor_eu.php
// Devolve os dados do PROFESSOR LOGADO (só dele): nome, e-mail, matrícula,
// departamento, titulação e as disciplinas cadastradas pelo suporte.
// Usado pelo usuario_portal.js para preencher "Olá, Prof. <nome>" e o perfil.
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
        "SELECT nome, email, matricula, departamento, titulacao FROM prof_login WHERE id_prof = ?");
    mysqli_stmt_bind_param($stmt, "i", $idProf);
    mysqli_stmt_execute($stmt);
    $p = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

    if (!$p) {
        http_response_code(401);
        echo json_encode(["sucesso" => false, "mensagem" => "Conta não encontrada."]);
        exit;
    }

    $disciplinas = [];
    $stmt = mysqli_prepare($link, "SELECT nome FROM prof_disciplinas WHERE id_prof = ? ORDER BY nome");
    mysqli_stmt_bind_param($stmt, "i", $idProf);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    while ($d = mysqli_fetch_assoc($res)) {
        $disciplinas[] = $d['nome'];
    }
    mysqli_stmt_close($stmt);

} catch (mysqli_sql_exception $e) {

    error_log("professor_eu: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["sucesso" => false, "mensagem" => "Não foi possível carregar seus dados."]);
    exit;

}

$nome     = $p['nome'];
$primeiro = preg_split('/\s+/', trim($nome))[0] ?? $nome;

echo json_encode([
    "sucesso" => true,
    "eu" => [
        "nome"          => $nome,
        "primeiro_nome" => $primeiro,
        "inicial"       => mb_strtoupper(mb_substr($nome, 0, 1)),
        "email"         => $p['email'],
        "nome_completo" => mb_strtoupper($nome),
        "matricula"     => $p['matricula'],
        "departamento"  => $p['departamento'],
        "titulacao"     => $p['titulacao'],
        "disciplinas"   => $disciplinas,
    ]
]);
