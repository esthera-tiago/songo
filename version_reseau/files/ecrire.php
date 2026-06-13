<?php
// api/ecrire.php — Sauvegarde l'état de la partie envoyé par le navigateur

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Répondre aux preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["erreur" => "Méthode non autorisée"]);
    exit;
}

// Lire le corps de la requête JSON
$corps = file_get_contents("php://input");
$etat  = json_decode($corps, true);

if (!$etat || !isset($etat["cases"])) {
    http_response_code(400);
    echo json_encode(["erreur" => "Données invalides"]);
    exit;
}

// Sécurité basique : vérifier que les champs attendus sont présents
$champsRequis = ["cases", "scoreJ1", "scoreJ2", "joueurActif", "partieTerminee", "timestamp"];
foreach ($champsRequis as $champ) {
    if (!array_key_exists($champ, $etat)) {
        http_response_code(400);
        echo json_encode(["erreur" => "Champ manquant : $champ"]);
        exit;
    }
}

// Dossier data — le créer s'il n'existe pas
$dossier = __DIR__ . "/../data";
if (!is_dir($dossier)) {
    mkdir($dossier, 0755, true);
}

$fichier = $dossier . "/partie.json";

// Vérifier que le timestamp entrant est plus récent (évite les écritures désordonnées)
if (file_exists($fichier)) {
    $actuel = json_decode(file_get_contents($fichier), true);
    if ($actuel && isset($actuel["timestamp"]) && $etat["timestamp"] < $actuel["timestamp"]) {
        // L'état reçu est plus vieux que ce qu'on a déjà → on ignore
        http_response_code(409);
        echo json_encode(["erreur" => "Timestamp obsolète", "timestamp" => $actuel["timestamp"]]);
        exit;
    }
}

// Écriture atomique via fichier temporaire
$tmp = $fichier . ".tmp";
$ok  = file_put_contents($tmp, json_encode($etat, JSON_PRETTY_PRINT));

if ($ok === false) {
    http_response_code(500);
    echo json_encode(["erreur" => "Impossible d'écrire le fichier"]);
    exit;
}

rename($tmp, $fichier);

echo json_encode(["ok" => true, "timestamp" => $etat["timestamp"]]);
