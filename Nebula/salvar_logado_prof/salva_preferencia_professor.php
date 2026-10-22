<?php
// ==========================================================
// SALVA PREFERÊNCIA (TOGGLE) DO PROFESSOR
// Chamado automaticamente quando o professor liga/desliga um dos
// toggles do bloco "Configurações". Atualiza uma coluna por vez.
// ==========================================================

require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('professor');
header("Content-Type: application/json; charset=utf-8");
include_once(__DIR__ . "/../connect_nebula.php");

// O professor loga pela tabela prof_login e a sessão guarda o id em 'id_prof'.
// ATENÇÃO: o nome da variável continua $id_usuarios só para não mexer nas consultas; confirme que a coluna
// professores.id_usuarios guarda o id_prof (veja o aviso no relatório de correções).
$id_usuarios = (($_SESSION['tipo'] ?? '') === 'professor' && isset($_SESSION['id_prof'])) ? (int) $_SESSION['id_prof'] : 0;

if ($id_usuarios <= 0) {
    echo json_encode(["sucesso" => false, "mensagem" => "Sessão expirada. Faça login novamente."]);
    exit;
}

$campo = isset($_POST['campo']) ? trim($_POST['campo']) : '';
$valor = isset($_POST['valor']) ? (int) $_POST['valor'] : 0;
$valor = $valor === 1 ? 1 : 0;

// Whitelist das colunas que podem ser alteradas por aqui
// (nunca monte a coluna do SQL direto com o que vem do POST)
$colunasPermitidas = ['notificacoes_email', 'lembrete_aulas', 'alerta_frequencia'];

if (!in_array($campo, $colunasPermitidas, true)) {
    echo json_encode(["sucesso" => false, "mensagem" => "Campo inválido."]);
    exit;
}

// Garante que existe um registro em `professores` para este usuário
$sql = "SELECT `id_professor` FROM `professores` WHERE `id_usuarios` = ?";
$stmt = mysqli_prepare($link, $sql);
mysqli_stmt_bind_param($stmt, "i", $id_usuarios);
mysqli_stmt_execute($stmt);
$existe = mysqli_stmt_get_result($stmt)->fetch_assoc();
mysqli_stmt_close($stmt);

if ($existe) {
    $sql = "UPDATE `professores` SET `$campo` = ? WHERE `id_usuarios` = ?";
    $stmt = mysqli_prepare($link, $sql);
    mysqli_stmt_bind_param($stmt, "ii", $valor, $id_usuarios);
} else {
    $sql = "INSERT INTO `professores` (`id_usuarios`, `$campo`) VALUES (?, ?)";
    $stmt = mysqli_prepare($link, $sql);
    mysqli_stmt_bind_param($stmt, "ii", $id_usuarios, $valor);
}

$resultado = mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

if ($resultado) {
    echo json_encode(["sucesso" => true]);
} else {
    echo json_encode(["sucesso" => false, "mensagem" => "Falha ao salvar. Erro: " . mysqli_error($link)]);
}

mysqli_close($link);
?>
