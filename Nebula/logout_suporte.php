<?php
// logout_suporte.php (na RAIZ, ao lado do home.php)
require_once __DIR__ . '/iniciar_sessao.php';
encerrarSessao('suporte');
header("Location: home.php");
exit;
