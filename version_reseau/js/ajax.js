// ajax.js — Synchronisation via Vercel KV

var URL_LIRE   = "/api/lire";
var URL_ECRIRE = "/api/ecrire";

var intervalleSync   = null;
var dernierTimestamp = 0;

// ─── LIRE L'ÉTAT ─────────────────────────────────────────────────────────────

function lireEtat(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", URL_LIRE + "?t=" + Date.now(), true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        if (xhr.status === 200) {
            try {
                var etat = JSON.parse(xhr.responseText);
                callback(etat, null);
            } catch (e) {
                callback(null, "Erreur JSON : " + e.message);
            }
        } else {
            callback(null, "Erreur HTTP " + xhr.status);
        }
    };
    xhr.send();
}

// ─── ÉCRIRE L'ÉTAT ───────────────────────────────────────────────────────────

function ecrireEtatLocal(etat) {
    etat.timestamp = Date.now();

    var xhr = new XMLHttpRequest();
    xhr.open("POST", URL_ECRIRE, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        if (xhr.status !== 200) {
            console.warn("Erreur écriture état :", xhr.status, xhr.responseText);
        }
    };
    xhr.send(JSON.stringify(etat));
}

// ─── INITIALISATION ───────────────────────────────────────────────────────────

function initialiserEtat(callback) {
    lireEtat(function (etat, erreur) {
        if (erreur || !etat) {
            console.warn("Impossible de lire l'état initial :", erreur);
            etat = etatDefaut();
        }
        dernierTimestamp = etat.timestamp || 0;
        callback(etat);
    });
}

// ─── POLLING ──────────────────────────────────────────────────────────────────

function demarrerPolling(onMiseAJour) {
    intervalleSync = setInterval(function () {
        lireEtat(function (etat, erreur) {
            if (erreur || !etat) return;
            if (etat.timestamp > dernierTimestamp) {
                dernierTimestamp = etat.timestamp;
                onMiseAJour(etat);
            }
        });
    }, 2000);
}

function arreterPolling() {
    if (intervalleSync) {
        clearInterval(intervalleSync);
        intervalleSync = null;
    }
}

// ─── ÉTAT PAR DÉFAUT ──────────────────────────────────────────────────────────

function etatDefaut() {
    return {
        cases:          [0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
        scoreJ1:        0,
        scoreJ2:        0,
        joueurActif:    1,
        partieTerminee: false,
        dernierCoup:    null,
        message:        "",
        timestamp:      Date.now()
    };
}

// ─── NOUVELLE PARTIE ──────────────────────────────────────────────────────────

function reinitialiserEtat() {
    var etat = etatDefaut();
    ecrireEtatLocal(etat);
    return etat;
}
