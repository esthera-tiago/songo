
// ajax :( I literaly hate this part

var URL_PARTIE = "data/partie.json";
var CLE_STORAGE = "songo_etat";        
var intervalleSync = null;            

// reads steps from localStorage 

function lireEtatLocal() {
    var data = localStorage.getItem(CLE_STORAGE);
    if (data) {
        return JSON.parse(data);
    }
    return null;
}


// writes down eveverything that has been changed

function ecrireEtatLocal(etat) {
    etat.timestamp = Date.now();
    localStorage.setItem(CLE_STORAGE, JSON.stringify(etat));
}

// reads partie.json using AJAX (GET) and actualises locolStorage

function lirePartieFichier(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", URL_PARTIE + "?t=" + Date.now(), true); 
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

//starts polling :)
function demarrerPolling(onMiseAJour) {
    var dernierTimestamp = 0;

    
    window.addEventListener("storage", function (e) {
        if (e.key === CLE_STORAGE) {
            var etat = lireEtatLocal();
            if (etat && etat.timestamp > dernierTimestamp) {
                dernierTimestamp = etat.timestamp;
                onMiseAJour(etat);
            }
        }
    });

    intervalleSync = setInterval(function () {
        var etat = lireEtatLocal();
        if (etat && etat.timestamp > dernierTimestamp) {
            dernierTimestamp = etat.timestamp;
            onMiseAJour(etat);
        }
    }, 2000);
}

// polling end ...
function arreterPolling() {
    if (intervalleSync) {
        clearInterval(intervalleSync);
        intervalleSync = null;
    }
}


function initialiserEtat(callback) {
   
    var etatLocal = lireEtatLocal();
    if (etatLocal) {
        callback(etatLocal);
        return;
    }

    
    lirePartieFichier(function (etat, erreur) {
        if (erreur) {
            console.warn("Impossible de lire partie.json :", erreur);
        
            etat = etatDefaut();
        }
        ecrireEtatLocal(etat);
        callback(etat);
    });
}


// default when nothing is going on

function etatDefaut() {
    return {
        
        cases: [0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
        scoreJ1: 0,
        scoreJ2: 0,
        joueurActif: 1,
        partieTerminee: false,
        dernierCoup: null,
        message: "",
        timestamp: Date.now()
    };
}


// nouvelle partie

function reinitialiserEtat() {
    var etat = etatDefaut();
    ecrireEtatLocal(etat);
    return etat;
}
