// ajax.js — Couche AJAX pour la version réseau du Songo
// INF222 — Projet universitaire
//
// Principe : l'état du jeu est stocké dans localStorage (sous la clé "songo_etat")
// Les deux onglets/navigateurs sur la même machine se synchronisent via
// un polling toutes les 2 secondes + l'événement "storage" du navigateur.
//
// Pour une vraie simulation réseau sur deux postes : lancer server.py
// qui permet d'écrire dans data/partie.json via fetch().

var URL_PARTIE = "data/partie.json";
var CLE_STORAGE = "songo_etat";        // clé dans localStorage
var intervalleSync = null;             // référence au setInterval de polling

// -----------------------------------------------
// Lire l'état depuis localStorage (synchronisation locale rapide)
// -----------------------------------------------
function lireEtatLocal() {
    var data = localStorage.getItem(CLE_STORAGE);
    if (data) {
        return JSON.parse(data);
    }
    return null;
}

// -----------------------------------------------
// Écrire l'état dans localStorage + déclencher un événement
// -----------------------------------------------
function ecrireEtatLocal(etat) {
    etat.timestamp = Date.now();
    localStorage.setItem(CLE_STORAGE, JSON.stringify(etat));
}

// -----------------------------------------------
// Lire le fichier partie.json via AJAX (GET)
// Utilisé pour charger l'état initial si pas de localStorage
// -----------------------------------------------
function lirePartieFichier(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", URL_PARTIE + "?t=" + Date.now(), true); // cache-bust
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    callback(data, null);
                } catch (e) {
                    callback(null, "Erreur JSON : " + e.message);
                }
            } else {
                callback(null, "Erreur HTTP " + xhr.status);
            }
        }
    };
    xhr.send();
}

// -----------------------------------------------
// Démarrer le polling toutes les 2 secondes
// Appelle onMiseAJour(etat) si l'état a changé
// -----------------------------------------------
function demarrerPolling(onMiseAJour) {
    var dernierTimestamp = 0;

    // Écouter les changements de localStorage (fonctionne entre onglets)
    window.addEventListener("storage", function (e) {
        if (e.key === CLE_STORAGE) {
            var etat = lireEtatLocal();
            if (etat && etat.timestamp > dernierTimestamp) {
                dernierTimestamp = etat.timestamp;
                onMiseAJour(etat);
            }
        }
    });

    // Polling régulier (pour la même fenêtre et comme filet de sécurité)
    intervalleSync = setInterval(function () {
        var etat = lireEtatLocal();
        if (etat && etat.timestamp > dernierTimestamp) {
            dernierTimestamp = etat.timestamp;
            onMiseAJour(etat);
        }
    }, 2000);
}

// -----------------------------------------------
// Arrêter le polling
// -----------------------------------------------
function arreterPolling() {
    if (intervalleSync) {
        clearInterval(intervalleSync);
        intervalleSync = null;
    }
}

// -----------------------------------------------
// Initialiser : charger l'état depuis le JSON ou localStorage
// -----------------------------------------------
function initialiserEtat(callback) {
    // D'abord regarder si un état existe déjà dans localStorage
    var etatLocal = lireEtatLocal();
    if (etatLocal) {
        callback(etatLocal);
        return;
    }

    // Sinon charger le fichier partie.json initial via AJAX
    lirePartieFichier(function (etat, erreur) {
        if (erreur) {
            console.warn("Impossible de lire partie.json :", erreur);
            // Utiliser un état par défaut
            etat = etatDefaut();
        }
        ecrireEtatLocal(etat);
        callback(etat);
    });
}

// -----------------------------------------------
// État par défaut (si aucun fichier serveur disponible)
// -----------------------------------------------
function etatDefaut() {
    return {
        cases: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
        scoreJ1: 0,
        scoreJ2: 0,
        joueurActif: 1,
        partieTerminee: false,
        dernierCoup: null,
        message: "",
        timestamp: Date.now()
    };
}

// -----------------------------------------------
// Réinitialiser (nouvelle partie)
// -----------------------------------------------
function reinitialiserEtat() {
    var etat = etatDefaut();
    ecrireEtatLocal(etat);
    return etat;
}
