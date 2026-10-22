<?php
// ==========================================================
// POST salva_preferencia_aluno.php
// Campos: campo (notificacoes_email | lembrete_aulas | alerta_frequencia), valor (0/1)
// Chamado quando o ALUNO liga/desliga um toggle de "Configurações".
// ==========================================================
require_once __DIR__ . '/iniciar_sessao.php';
iniciarSessao('aluno');

header("Content-Type: application/json; charset=utf-8");
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

include_once(__DIR__ . "/connect_nebula.php");
mysqli_set_charset($link, "utf8mb4");

if (empty($_SESSION['logado']) || ($_SESSION['tipo'] ?? '') !== 'aluno' || empty($_SESSION['id_usuarios'])) {
    echo json_encode(["sucesso" => false, "mensagem" => "Sessão expirada. Faça login novamente."]);
    exit;
}

$idUsuario = (int) $_SESSION['id_usuarios'];

$campo = isset($_POST['campo']) && is_string($_POST['campo']) ? trim($_POST['campo']) : '';
$valor = ((int) ($_POST['valor'] ?? 0)) === 1 ? 1 : 0;

// Lista fixa: o nome da coluna nunca vem direto do navegador para o SQL
$colunasPermitidas = ['notificacoes_email', 'lembrete_aulas', 'alerta_frequencia'];

if (!in_array($campo, $colunasPermitidas, true)) {
    echo json_encode(["sucesso" => false, "mensagem" => "Campo inválido."]);
    exit;
}

try {

    $stmt = mysqli_prepare($link,
        "INSERT INTO aluno_perfil (id_usuarios, `$campo`) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE `$campo` = VALUES(`$campo`)");
    mysqli_stmt_bind_param($stmt, "ii", $idUsuario, $valor);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    echo json_encode(["sucesso" => true]);

} catch (mysqli_sql_exception $e) {

    error_log("salva_preferencia_aluno: " . $e->getMessage());
    echo json_encode(["sucesso" => false, "mensagem" => "Não foi possível salvar a preferência."]);

}
