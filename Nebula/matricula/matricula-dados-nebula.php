<?php
// Confere o link do e-mail (token) e devolve os dados que a matrícula pré-preenche:
// dados do candidato, curso/turno/modalidade do vestibular e se ele tem isenção da taxa.
header("Content-type: application/json;charset=utf-8");

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

include_once(__DIR__ . "/../connect_nebula.php");
require_once __DIR__ . '/../vagas_nebula.php';
mysqli_set_charset($link, "utf8mb4");

function responderErro($mensagem) {
    echo json_encode(["sucesso" => false, "erro" => $mensagem]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    responderErro("Método inválido");
}

$token = $_GET['t'] ?? '';

if (!is_string($token) || !preg_match('/^[a-f0-9]{32}$/', $token)) {
    responderErro("Link de matrícula inválido. Use o botão do e-mail de aprovação.");
}

try {

    $stmt = mysqli_prepare($link,
        "SELECT i.nome_completo, i.cpf, i.data_nascimento, i.email, i.telefone, i.telefone_reserva,
                i.id_turma, s.curso AS curso_turma, s.nome AS sala_turma, t.turno AS turno_turma,
                i.modalidade, i.status_isencao, i.status_vestibular,
                (SELECT COUNT(*) FROM matriculas m WHERE m.id_inscricoes = i.id_inscricoes) AS ja_matriculado
           FROM inscricoes i
           LEFT JOIN turmas t ON t.id_turma = i.id_turma
           LEFT JOIN salas  s ON s.id_sala  = t.id_sala
          WHERE i.token_matricula = ?");
    mysqli_stmt_bind_param($stmt, "s", $token);
    mysqli_stmt_execute($stmt);
    $i = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

} catch (mysqli_sql_exception $e) {

    error_log("matricula dados: " . $e->getMessage());
    http_response_code(500);
    responderErro("Não foi possível abrir a matrícula. Tente novamente.");

}

if (!$i) {
    responderErro("Link de matrícula inválido. Use o botão do e-mail de aprovação.");
}
if ($i['status_vestibular'] !== 'aprovado') {
    responderErro("A matrícula ainda não está liberada para esta inscrição.");
}
if ((int) $i['ja_matriculado'] > 0) {
    responderErro("A matrícula desta inscrição já foi realizada.");
}

if ($i['id_turma'] === null) {
    responderErro("Sua vaga ainda não foi definida. Procure o suporte da universidade.");
}
if (prazoReservaEncerrado()) {
    responderErro("O prazo para a matrícula terminou em " . VAGAS_PRAZO_TEXTO . " e a vaga foi liberada.");
}

echo json_encode([
    "sucesso" => true,
    "dados"   => [
        "nome"       => $i['nome_completo'],
        "cpf"        => $i['cpf'],
        "nascimento" => $i['data_nascimento'],
        "email"      => $i['email'],
        "telefone"   => $i['telefone'],
        "reserva"    => $i['telefone_reserva'],
        // Curso e turno da TURMA reservada (podem ser os da 2ª opção, se a 1ª estava cheia)
        "curso"      => $i['curso_turma'],
        "turno"      => $i['turno_turma'],
        "sala"       => $i['sala_turma'],
        "modalidade" => $i['modalidade'],
        // Isenção concedida no vestibular: a taxa de matrícula já nasce isenta
        "isento"     => $i['status_isencao'] === 'aprovada'
    ]
]);