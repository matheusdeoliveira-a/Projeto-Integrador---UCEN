<?php
// ==========================================================
// GET relatorios_crud/desempenho_listar.php
// Lista as linhas da aba "Desempenho da equipe".
// ==========================================================
require_once __DIR__ . '/relatorios_comum.php';

$res = mysqli_query($link,
    "SELECT id_desempenho, nome, atendidos, no_prazo, tempo_medio_min, satisfacao, situacao
       FROM equipe_desempenho
      ORDER BY nome");

$tecnicos = [];
while ($t = mysqli_fetch_assoc($res)) {
    $tecnicos[] = [
        "id"         => (int) $t['id_desempenho'],
        "nome"       => $t['nome'],
        "atendidos"  => (int) $t['atendidos'],
        "noPrazo"    => (int) $t['no_prazo'],
        "tempoMin"   => (int) $t['tempo_medio_min'],
        "satisfacao" => (int) $t['satisfacao'],
        "situacao"   => $t['situacao']
    ];
}

saida(["sucesso" => true, "tecnicos" => $tecnicos]);
