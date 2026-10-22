<?php
// ==========================================================
// PRÓXIMAS AVALIAÇÕES DO ALUNO
// Devolve (em JSON) os próximos 3 eventos do calendário, de hoje em diante.
// Usado pelo painel "Próximas Avaliações" do aluno_inicio.html
// ==========================================================

header("Content-type: application/json;charset=utf-8");

// Importante na EC2: o servidor costuma rodar em UTC. Sem isso, "hoje" fica errado.
date_default_timezone_set('America/Sao_Paulo');

// Mesmos parâmetros do cookie de sessão usados no login (login-acao-nebula.php)
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'httponly' => true,
    'samesite' => 'Lax'
]);
require_once __DIR__ . '/../iniciar_sessao.php';
iniciarSessao('aluno');

// O login deixa na sessão 'logado' = true e 'tipo' = 'aluno'
if (empty($_SESSION['logado']) || ($_SESSION['tipo'] ?? '') !== 'aluno') {
    http_response_code(401);
    echo json_encode(["erro" => "Sem sessão"]);
    exit;
}

// AJUSTE: nome da tabela onde os professores cadastram os eventos do calendário.
// Confirme no phpMyAdmin (ou copie o FROM de calendario_listar_aluno.php).
// As colunas usadas são as mesmas que o aluno_calendario.js já lê: data, titulo, horario.
$tabela = 'eventos_calendario';

try {

    include_once __DIR__ . '/../connect_nebula.php';

    $hoje = date('Y-m-d');

    // Eventos de hoje em diante (o de hoje ainda conta), os mais próximos primeiro.
    // Se calendario_listar_aluno.php aplica algum filtro (turma, por exemplo), copie o mesmo para cá.
    $sql = "SELECT `data`, `titulo`, `horario`
            FROM {$tabela}
            WHERE `data` >= ?
            ORDER BY `data` ASC
            LIMIT 3";

    $stmt = mysqli_prepare($link, $sql);
    mysqli_stmt_bind_param($stmt, "s", $hoje);
    mysqli_stmt_execute($stmt);
    $resultado = mysqli_stmt_get_result($stmt);

    $avaliacoes = [];
    while ($linha = mysqli_fetch_assoc($resultado)) {
        $avaliacoes[] = $linha;
    }

    mysqli_stmt_close($stmt);

} catch (Throwable $erro) {

    // Qualquer erro de banco (tabela/coluna com outro nome etc.) vira JSON em vez de página de erro em HTML.
    // O detalhe vai pro log do PHP (C:\xampp\apache\logs\error.log), não pra tela.
    error_log("calendario_proximas_aluno: " . $erro->getMessage());
    http_response_code(500);
    echo json_encode(["erro" => "Não foi possível consultar o calendário"]);
    exit;

}

echo json_encode($avaliacoes);