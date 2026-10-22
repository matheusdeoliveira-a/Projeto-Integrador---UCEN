<?php
// ==========================================================
// GET aluno_eu.php
// Devolve os dados do ALUNO LOGADO (só dele): nome, e-mail e, se já
// tiver matrícula ligada à conta, os dados da matrícula, curso, sala e turno.
// Usado pelo usuario_portal.js para preencher "Olá, <nome>" e o perfil.
// ==========================================================
require_once __DIR__ . '/iniciar_sessao.php';
iniciarSessao('aluno');

header("Content-Type: application/json; charset=utf-8");
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

include_once(__DIR__ . "/connect_nebula.php");
mysqli_set_charset($link, "utf8mb4");

if (empty($_SESSION['logado']) || ($_SESSION['tipo'] ?? '') !== 'aluno' || empty($_SESSION['id_usuarios'])) {
    http_response_code(401);
    echo json_encode(["sucesso" => false, "mensagem" => "Sessão expirada. Faça login novamente."]);
    exit;
}

$idUsuario = (int) $_SESSION['id_usuarios'];

function formatarCpf($v) {
    $d = preg_replace('/\D/', '', (string) $v);
    return strlen($d) === 11
        ? substr($d, 0, 3) . '.' . substr($d, 3, 3) . '.' . substr($d, 6, 3) . '-' . substr($d, 9, 2)
        : null;
}

function formatarData($v) {
    $dt = DateTime::createFromFormat('Y-m-d', (string) $v);
    return $dt ? $dt->format('d/m/Y') : null;
}

try {

    $stmt = mysqli_prepare($link, "SELECT nome, email FROM usuarios WHERE id_usuarios = ?");
    mysqli_stmt_bind_param($stmt, "i", $idUsuario);
    mysqli_stmt_execute($stmt);
    $usuario = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

    if (!$usuario) {
        http_response_code(401);
        echo json_encode(["sucesso" => false, "mensagem" => "Conta não encontrada."]);
        exit;
    }

    // Matrícula ligada a esta conta (o vínculo é gravado no cadastro pelo link do e-mail)
    $stmt = mysqli_prepare($link,
        "SELECT m.id_matricula, m.nome_completo, m.cpf, m.rg, m.orgao_expedidor, m.uf_rg,
                m.data_nascimento, m.nome_mae, m.estado_civil, m.status_matricula,
                m.curso AS curso_matricula, m.turno AS turno_matricula,
                s.nome AS sala, s.curso AS curso_sala, t.turno AS turno_turma
           FROM matriculas m
           LEFT JOIN turmas t ON t.id_turma = m.id_turma
           LEFT JOIN salas  s ON s.id_sala  = t.id_sala
          WHERE m.id_usuarios = ?
          ORDER BY m.id_matricula DESC
          LIMIT 1");
    mysqli_stmt_bind_param($stmt, "i", $idUsuario);
    mysqli_stmt_execute($stmt);
    $m = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

} catch (mysqli_sql_exception $e) {

    error_log("aluno_eu: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["sucesso" => false, "mensagem" => "Não foi possível carregar seus dados."]);
    exit;

}

$estadosCivis = [
    'solteiro' => 'Solteiro(a)', 'casado' => 'Casado(a)', 'divorciado' => 'Divorciado(a)',
    'viuvo' => 'Viúvo(a)', 'uniao-estavel' => 'União estável'
];
$statusMatricula = [
    'confirmada' => 'Matriculado', 'aguardando_pagamento' => 'Aguardando pagamento'
];

$nome     = $usuario['nome'];
$primeiro = preg_split('/\s+/', trim($nome))[0] ?? $nome;

$eu = [
    "nome"            => $nome,
    "primeiro_nome"   => $primeiro,
    "inicial"         => mb_strtoupper(mb_substr($nome, 0, 1)),
    "email"           => $usuario['email'],
    // dados abaixo só existem depois da matrícula
    "nome_completo"   => $m ? mb_strtoupper($m['nome_completo']) : mb_strtoupper($nome),
    "cpf"             => $m ? formatarCpf($m['cpf']) : null,
    "nascimento"      => $m ? formatarData($m['data_nascimento']) : null,
    "rg"              => $m ? $m['rg'] : null,
    "orgao_uf"        => $m ? trim($m['orgao_expedidor'] . ' / ' . $m['uf_rg']) : null,
    "estado_civil"    => $m ? ($estadosCivis[$m['estado_civil']] ?? null) : null,
    "nome_mae"        => $m ? mb_strtoupper($m['nome_mae']) : null,
    "curso"           => $m ? ($m['curso_sala'] ?? $m['curso_matricula']) : null,
    "turno"           => $m ? ($m['turno_turma'] ?? $m['turno_matricula']) : null,
    "sala"            => $m ? $m['sala'] : null,
    "ra"              => $m ? str_pad((string) $m['id_matricula'], 6, '0', STR_PAD_LEFT) : null,
    "status_matricula" => $m ? ($statusMatricula[$m['status_matricula']] ?? null) : null,
];

echo json_encode(["sucesso" => true, "eu" => $eu]);
