<?php
// ==========================================================
// PRÓXIMA AULA DO ALUNO
// Devolve (em JSON) a próxima aula da agenda, de qualquer cor/tipo, a partir de agora.
// Usado pelo card "Próxima aula" do aluno_inicio.html
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
iniciarSessao('aluno');

// Mesma checagem que o login deixa pronta na sessão:
// 'logado' = true e 'tipo' = 'aluno' (o id do aluno fica em 'id_usuarios').
// Antes eu conferia 'id_aluno', que não existe: isso dava 401 e jogava o aluno de volta pro login.
if (empty($_SESSION['logado']) || ($_SESSION['tipo'] ?? '') !== 'aluno') {
    http_response_code(401);
    echo json_encode(["erro" => "Sem sessão"]);
    exit;
}

try {

    include_once __DIR__ . '/../connect_nebula.php';

    $hoje      = date('Y-m-d');
    $horaAtual = intval(date('G')); // 0 a 23, sem zero à esquerda

    // Turma do aluno = turma da matrícula mais recente (mesmo vínculo usado em aluno_eu.php).
    $idUsuario = intval($_SESSION['id_usuarios']);
    $stmtM = mysqli_prepare($link,
        "SELECT id_turma FROM matriculas WHERE id_usuarios = ? ORDER BY id_matricula DESC LIMIT 1");
    mysqli_stmt_bind_param($stmtM, "i", $idUsuario);
    mysqli_stmt_execute($stmtM);
    $matricula = mysqli_fetch_assoc(mysqli_stmt_get_result($stmtM));
    mysqli_stmt_close($stmtM);

    // Aluno sem turma: não há agenda para mostrar.
    if (!$matricula || $matricula['id_turma'] === null) {
        echo json_encode(["existe" => false]);
        exit;
    }
    $idTurma = intval($matricula['id_turma']);

    // Próximo compromisso DA TURMA do aluno a COMEÇAR depois de agora, de qualquer cor/tipo:
    //  - dias futuros (qualquer hora), ou
    //  - hoje, só os que começam numa hora MAIOR que a atual.
    // Tabela agenda_professor: (id_agenda, professor_id, id_turma, data, hora, titulo, horario, local, cor, criado_em).
    $sql = "SELECT `data`, `hora`, `titulo`, `horario`, `local`
            FROM agenda_professor
            WHERE `id_turma` = ?
              AND (`data` > ? OR (`data` = ? AND `hora` > ?))
            ORDER BY `data` ASC, `hora` ASC
            LIMIT 1";

    $stmt = mysqli_prepare($link, $sql);
    mysqli_stmt_bind_param($stmt, "issi", $idTurma, $hoje, $hoje, $horaAtual);
    mysqli_stmt_execute($stmt);
    $resultado = mysqli_stmt_get_result($stmt);
    $aula = mysqli_fetch_assoc($resultado);
    mysqli_stmt_close($stmt);

} catch (Throwable $erro) {

    // Qualquer erro de banco (tabela/coluna com outro nome etc.) vira JSON em vez de uma página de erro em HTML.
    // O detalhe vai pro log do PHP (C:\xampp\apache\logs\error.log), não pra tela.
    error_log("agenda-proxima-aluno: " . $erro->getMessage());
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