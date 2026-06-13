<?php
// api/lire.php — Retourne l'état actuel de la partie

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Cache-Control: no-cache, no-store, must-revalidate");

$fichier = __DIR__ . "/../data/partie.json";

if (!file_exists($fichier)) {
    // État par défaut si le fichier n'existe pas encore
    $etat = [
        "cases"         => [0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
        "scoreJ1"       => 0,
        "scoreJ2"       => 0,
        "joueurActif"   => 1,
        "partieTerminee"=> false,
        "dernierCoup"   => null,
        "message"       => "",
        "timestamp"     => 0
    ];
    echo json_encode($etat);
    exit;
}

$contenu = file_get_contents($fichier);
echo $contenu;
