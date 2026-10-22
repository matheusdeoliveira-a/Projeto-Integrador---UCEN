<?php
// logout_professor.php (na RAIZ, ao lado do home.php)
require_once __DIR__ . '/iniciar_sessao.php';
encerrarSessao('professor');
header("Location: home.php");
exit;
