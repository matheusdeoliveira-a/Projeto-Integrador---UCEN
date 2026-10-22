<?php
// ==========================================================
// GET busca_perfil_aluno.php
// Dados de contato, endereço, foto e preferências do ALUNO LOGADO.
// Se ele ainda não salvou o perfil, começa com o telefone e o endereço
// que ele mesmo informou na matrícula.
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

function formatarTelefone($v) {
    $d = preg_replace('/\D/', '', (string) $v);
    if (strlen($d) === 11) return '(' . substr($d, 0, 2) . ') ' . substr($d, 2, 5) . '-' . substr($d, 7);
    if (strlen($d) === 10) return '(' . substr($d, 0, 2) . ') ' . substr($d, 2, 4) . '-' . substr($d, 6);
    return '';
}

try {

    $stmt = mysqli_prepare($link,
        "SELECT foto, celular, tel_recado, email_secundario, cep, logradouro, numero, complemento,
                bairro, cidade, uf, notificacoes_email, lembrete_aulas, alerta_frequencia
           FROM aluno_perfil WHERE id_usuarios = ?");
    mysqli_stmt_bind_param($stmt, "i", $idUsuario);
    mysqli_stmt_execute($stmt);
    $perfil = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

    if (!$perfil) {

        // Primeira visita: sugere o que ele informou na matrícula (ainda não grava nada)
        $stmt = mysqli_prepare($link,
            "SELECT telefone, telefone_reserva, cep, logradouro, numero, complemento, bairro, cidade, uf_endereco
               FROM matriculas WHERE id_usuarios = ? ORDER BY id_matricula DESC LIMIT 1");
        mysqli_stmt_bind_param($stmt, "i", $idUsuario);
        mysqli_stmt_execute($stmt);
        $m = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
        mysqli_stmt_close($stmt);

        $cep = $m ? preg_replace('/\D/', '', (string) $m['cep']) : '';

        $perfil = [
            "foto"               => null,
            "celular"            => $m ? formatarTelefone($m['telefone']) : '',
            "tel_recado"         => $m ? formatarTelefone($m['telefone_reserva']) : '',
            "email_secundario"   => '',
            "cep"                => strlen($cep) === 8 ? substr($cep, 0, 5) . '-' . substr($cep, 5) : '',
            "logradouro"         => $m ? (string) $m['logradouro'] : '',
            "numero"             => $m ? (string) $m['numero'] : '',
            "complemento"        => $m ? (string) $m['complemento'] : '',
            "bairro"             => $m ? (string) $m['bairro'] : '',
            "cidade"             => $m ? (string) $m['cidade'] : '',
            "uf"                 => $m ? (string) $m['uf_endereco'] : '',
            "notificacoes_email" => 1,
            "lembrete_aulas"     => 1,
            "alerta_frequencia"  => 1,
        ];
    }

} catch (mysqli_sql_exception $e) {

    error_log("busca_perfil_aluno: " . $e->getMessage());
    echo json_encode(["sucesso" => false, "mensagem" => "Não foi possível carregar o perfil."]);
    exit;

}

echo json_encode(["sucesso" => true, "perfil" => $perfil]);
