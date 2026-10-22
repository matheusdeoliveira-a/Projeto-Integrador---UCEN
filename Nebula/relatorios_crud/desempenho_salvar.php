<?php
// ==========================================================
// POST relatorios_crud/desempenho_salvar.php
// Campos: id (vazio/0 = novo), nome, atendidos, no_prazo, tempo_min, satisfacao, situacao
// ==========================================================
require_once __DIR__ . '/relatorios_comum.php';
exigirPost();

$id        = inteiro('id') ?? 0;
$nome      = campo('nome');
$atendidos = inteiro('atendidos');
$noPrazo   = inteiro('no_prazo');
$tempoMin  = inteiro('tempo_min');
$satisf    = inteiro('satisfacao');
$situacao  = campo('situacao');

if ($nome === '' || mb_strlen($nome) > 120)  falha("Informe o nome do técnico (até 120 caracteres).");
if ($atendidos === null)                     falha("Informe os chamados atendidos (número inteiro).");
if ($noPrazo === null)                       falha("Informe os resolvidos no prazo (número inteiro).");
if ($noPrazo > $atendidos)                   falha("Resolvidos no prazo não pode ser maior que os chamados atendidos.");
if ($tempoMin === null)                      falha("Informe o tempo médio.");
if ($satisf === null || $satisf > 100)       falha("A satisfação deve estar entre 0 e 100.");
if (!in_array($situacao, SITUACOES_EQUIPE, true)) falha("Situação inválida.");

if ($id > 0) {
    $stmt = mysqli_prepare($link,
        "UPDATE equipe_desempenho
            SET nome = ?, atendidos = ?, no_prazo = ?, tempo_medio_min = ?, satisfacao = ?, situacao = ?
          WHERE id_desempenho = ?");
    mysqli_stmt_bind_param($stmt, "siiiisi", $nome, $atendidos, $noPrazo, $tempoMin, $satisf, $situacao, $id);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);
    saida(["sucesso" => true, "id" => $id, "mensagem" => "Técnico atualizado."]);
}

$stmt = mysqli_prepare($link,
    "INSERT INTO equipe_desempenho (nome, atendidos, no_prazo, tempo_medio_min, satisfacao, situacao)
     VALUES (?, ?, ?, ?, ?, ?)");
mysqli_stmt_bind_param($stmt, "siiiis", $nome, $atendidos, $noPrazo, $tempoMin, $satisf, $situacao);
mysqli_stmt_execute($stmt);
$novoId = mysqli_insert_id($link);
mysqli_stmt_close($stmt);

saida(["sucesso" => true, "id" => $novoId, "mensagem" => "Técnico adicionado."]);
