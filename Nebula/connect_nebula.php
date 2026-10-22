<?php

    $host = "localhost";
    $user = "usuario_mysql";
    $pass = "COLE_AQUI_A_SENHA_DO_MYSQL";
    $db   = "faculdade_nebula";

    $link = mysqli_connect($host,$user,$pass,$db);
    $banco = mysqli_connect_errno();

    if($banco == true) {
        die("Erro na conexão: " . mysqli_connect_error());
    }

    mysqli_set_charset($link, "utf8mb4");

    // O $link já é um objeto mysqli, então dá pra usar
    // esse mesmo objeto tanto no estilo procedural (mysqli_query($link, ...))
    // quanto no estilo orientado a objeto ($mysqli->query(...), usado no home.php).
    $mysqli = $link;

    // IMPORTANTE: não chamamos header() aqui de propósito.
    // Cada arquivo que faz include_once("connect_nebula.php") decide
    // o próprio Content-Type (home.php quer text/html, os endpoints de
    // histórico querem application/json). Se o header fosse fixado aqui,
    // ele sobrescreveria o header que o arquivo já tinha setado antes
    // do include — foi exatamente isso que quebrou o histórico.

?>
