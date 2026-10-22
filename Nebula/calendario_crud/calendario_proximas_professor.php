<?php
// ==========================================================
// PRÓXIMAS AVALIAÇÕES DO PROFESSOR
// Devolve (em JSON) os próximos 3 eventos do calendário DESTE professor, de hoje em diante.
// Usado pelo painel "Próximas Avaliações" do professor_inicio.html
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
iniciarSessao('professor');

// O login do professor deixa na sessão: logado = true, tipo = 'professor' e id_prof
if (empty($_SESSION['logado']) || ($_SESSION['tipo'] ?? '') !== 'professor' || empty($_SESSION['id_prof'])) {
    http_response_code(401);
    echo json_encode(["erro" => "Sem sessão"]);
    exit;
}

$idProf = intval($_SESSION['id_prof']);

// AJUSTE: se a coluna que guarda o dono do evento em eventos_calendario tiver outro nome
// (aqui supus `professor_id`, igual à agenda_professor), troque no WHERE abaixo.
$tabela = 'eventos_calendario';

try {

    include_once __DIR__ . '/../connect_nebula.php';

    $hoje = date('Y-m-d');

    // Eventos deste professor de hoje em diante (o de hoje ainda conta), os mais próximos primeiro.
    $sql = "SELECT `data`, `titulo`, `horario`
            FROM {$tabela}
            WHERE `professor_id` = ? AND `data` >= ?
            ORDER BY `data` ASC
            LIMIT 3";

    $stmt = mysqli_prepare($link, $sql);
    mysqli_stmt_bind_param($stmt, "is", $idProf, $hoje);
    mysqli_stmt_execute($stmt);
    $resultado = mysqli_stmt_get_result($stmt);

    $avaliacoes = [];
    while ($linha = mysqli_fetch_assoc($resultado)) {
        $avaliacoes[] = $linha;
    }

    mysqli_stmt_close($stmt);

} catch (Throwable $erro) {

    // Erro de banco vira JSON em vez de página de erro em HTML.
    // O detalhe vai pro log do PHP (C:\xampp\apache\logs\error.log), não pra tela.
    error_log("calendario_proximas_professor: " . $erro->getMessage());
    http_response_code(500);
    echo json_encode(["erro" => "Não foi possível consultar o calendário"]);
    exit;

}

echo json_encode($avaliacoes);