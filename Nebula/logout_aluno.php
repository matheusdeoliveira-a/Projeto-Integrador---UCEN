<?php
// logout_aluno.php (na RAIZ, ao lado do home.php)
require_once __DIR__ . '/iniciar_sessao.php';
encerrarSessao('aluno');
header("Location: home.php");
exit;
