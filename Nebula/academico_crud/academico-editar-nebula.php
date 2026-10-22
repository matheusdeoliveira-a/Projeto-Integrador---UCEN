<?php
include_once(__DIR__ . "/academico-base-nebula.php");
exigirMetodo('POST');

// Os alunos ficam na tabela `matriculas` (id = id_matricula).
// Pré-requisito no banco: colunas `semestre` e `status_aluno` (ver ALTER TABLE).
// A matrícula (RA) é calculada a partir do id, então NÃO é editável: o campo enviado é ignorado.

$id       = filter_var($_POST['id'] ?? '', FILTER_VALIDATE_INT);
$nome     = campoPost('nome');
$curso    = campoPost('curso');
$semestre = campoPost('semestre');
$contato  = campoPost('contato');
$status   = campoPost('status');

// ---------- Validação ----------

if (!$id) {
    responderErro("Aluno inválido.");
}
if ($nome === '' || mb_strlen($nome) > 120) {
    responderErro("Informe o nome do aluno (até 120 caracteres).", "nome");
}
if ($curso === '' || mb_strlen($curso) > 100) {
    responderErro("Informe o curso.", "curso");
}
if ($semestre === '' || mb_strlen($semestre) > 10) {
    responderErro("Informe o semestre (ex.: 3º).", "semestre");
}
if (!filter_var($contato, FILTER_VALIDATE_EMAIL) || mb_strlen($contato) > 120) {
    responderErro("Informe um e-mail de contato válido.", "contato");
}
if (!in_array($status, ['ativo', 'trancado', 'cancelado'], true)) {
    responderErro("Status inválido.", "status");
}

try {

    $stmt = mysqli_prepare($link, "SELECT id_matricula FROM matriculas WHERE id_matricula = ?");
    mysqli_stmt_bind_param($stmt, "i", $id);
    mysqli_stmt_execute($stmt);
    $existe = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);

    if (!$existe) {
        responderErro("Aluno não encontrado.");
    }

    $stmt = mysqli_prepare(
        $link,
        "UPDATE matriculas
            SET nome_completo = ?, curso = ?, semestre = ?, email = ?, status_aluno = ?
          WHERE id_matricula = ?"
    );
    mysqli_stmt_bind_param($stmt, "sssssi", $nome, $curso, $semestre, $contato, $status, $id);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    echo json_encode([
        "sucesso" => true,
        "aluno"   => [
            "id"        => $id,
            "nome"      => $nome,
            "matricula" => str_pad((string) $id, 6, '0', STR_PAD_LEFT),
            "curso"     => $curso,
            "semestre"  => $semestre,
            "contato"   => $contato,
            "status"    => $status
        ]
    ]);

} catch (mysqli_sql_exception $e) {

    error_log("editar aluno: " . $e->getMessage());
    http_response_code(500);
    responderErro("Não foi possível salvar as alterações.");

}