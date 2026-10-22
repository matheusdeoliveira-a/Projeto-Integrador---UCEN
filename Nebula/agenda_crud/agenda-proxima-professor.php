<?php
// ==========================================================
// PRÓXIMA AULA DO PROFESSOR
// Devolve (em JSON) o próximo compromisso da agenda DESTE professor, de qualquer cor,
// que ainda vai começar. Usado pelo card "Próxima aula" do professor_inicio.html
// ==========================================================

header("Content-type: application/json;charset=utf-8");

// Importante na EC2: o servidor costuma rodar em UTC.
// Sem isso, "hoje" e "hora atual" ficam errados.
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

try {

    include_once __DIR__ . '/../connect_nebula.php';

    $hoje      = date('Y-m-d');
    $horaAtual = intval(date('G')); // 0 a 23, sem zero à esquerda

    // Só os compromissos deste professor (professor_id), de qualquer cor/tipo, que ainda vão começar:
    //  - dias futuros (qualquer hora), ou
    //  - hoje, só os que começam numa hora MAIOR que a atual.
    // Se hoje não sobrou nada, o ORDER BY já traz o primeiro dia seguinte que tiver aula.
    $sql = "SELECT `data`, `hora`, `titulo`, `horario`, `local`
            FROM agenda_professor
            WHERE `professor_id` = ?
              AND (`data` > ? OR (`data` = ? AND `hora` > ?))
            ORDER BY `data` ASC, `hora` ASC
            LIMIT 1";

    $stmt = mysqli_prepare($link, $sql);
    mysqli_stmt_bind_param($stmt, "issi", $idProf, $hoje, $hoje, $horaAtual);
    mysqli_stmt_execute($stmt);
    $resultado = mysqli_stmt_get_result($stmt);
    $aula = mysqli_fetch_assoc($resultado);
    mysqli_stmt_close($stmt);

} catch (Throwable $erro) {

    // Erro de banco vira JSON em vez de página de erro em HTML.
    // O detalhe vai pro log do PHP (C:\xampp\apache\logs\error.log), não pra tela.
    error_log("agenda-proxima-professor: " . $erro->getMessage());
    http_response_code(500);
    echo json_encode(["erro" => "Não foi possível consultar a agenda"]);
    exit;

}

if (!$aula) {
    echo json_encode(["existe" => false]);
    exit;
}

echo json_encode([
    "existe"  => true,
    "data"    => $aula['data'],
    "hora"    => intval($aula['hora']),
    "titulo"  => $aula['titulo'],
    "horario" => $aula['horario'],
    "local"   => $aula['local']
]);