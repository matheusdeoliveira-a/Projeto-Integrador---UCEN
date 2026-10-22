<?php
// ==========================================================
// GET relatorios_crud/chamados_resumo.php
// Números dos cards do topo, calculados na tabela "chamados":
//   no_mes     = chamados abertos neste mês
//   resolvidos = desses, os que já estão "Respondido"
//   abertos    = TODOS os chamados ainda "Pendente" ou "Em andamento" (fila atual)
// ==========================================================
require_once __DIR__ . '/relatorios_comum.php';

$res = mysqli_query($link,
    "SELECT COUNT(*) AS total, COALESCE(SUM(status = 'Respondido'), 0) AS resolvidos
       FROM chamados
      WHERE criado_em >= DATE_FORMAT(CURDATE(), '%Y-%m-01')");
$mes = mysqli_fetch_assoc($res);

$res = mysqli_query($link,
    "SELECT COUNT(*) AS abertos FROM chamados WHERE status IN ('Pendente', 'Em andamento')");
$ab = mysqli_fetch_assoc($res);

saida([
    "sucesso"    => true,
    "no_mes"     => (int) $mes['total'],
    "resolvidos" => (int) $mes['resolvidos'],
    "abertos"    => (int) $ab['abertos']
]);
