

var cases = [];
var scoreJ1 = 0;
var scoreJ2 = 0;
var joueurActif = 1;
var partieTerminee = false;

var monRole = 0;
var jaJoue = false;
var distributionEnCours = false;

var boucle = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

var audioCtx = null;

//connection btw the two devices (:)
function seConnecter(role) {
    obtenirAudioCtx();

    monRole = role;
    document.getElementById("ecran-connexion").style.display = "none";
    document.getElementById("jeu").style.display = "block";
    document.getElementById("label-role").textContent = "Vous êtes : Joueur " + monRole;


    initialiserEtat(function (etat) {
        appliquerEtat(etat);
        mettreAJourSync(true);
    });

    demarrerPolling(function (etat) {
        appliquerEtat(etat);
        mettreAJourSync(true);
    });
}



function appliquerEtat(etat) {
    cases = etat.cases.slice();
    scoreJ1 = etat.scoreJ1;
    scoreJ2 = etat.scoreJ2;
    joueurActif = etat.joueurActif;
    partieTerminee = etat.partieTerminee;

    afficherPlateau();
    mettreAJourScores();
    mettreAJourTour();

    if (etat.message) {
        afficherMessage(etat.message, etat.partieTerminee ? "fin" : "info");
    }
}


// JOUER UN COUP

async function jouerCase(idx) {
    if (partieTerminee || distributionEnCours) {
        return;
    }

    // Vérifier que c'est le bon joueur
    if (monRole !== joueurActif) {
        afficherMessage("Ce n'est pas votre tour !", "erreur");
        return;
    }

    if (!appartientAuJoueur(idx, joueurActif)) {
        afficherMessage("Vous devez jouer une case de votre camp.", "erreur");
        return;
    }

    if (cases[idx] === 0) {
        afficherMessage("Cette case est vide.", "erreur");
        return;
    }

    if (!coupRespecteSolidarite(idx)) {
        afficherMessage("Solidarité : ce coup viderait le camp adverse !", "erreur");
        return;
    }

    // Effectuer le coup
    var graines = cases[idx];
    cases[idx] = 0;

    distributionEnCours = true;
    var derniereCase = await distribuerGraines(idx, graines);
    distributionEnCours = false;

    effectuerCaptures(derniereCase);

    joueurActif = (joueurActif === 1) ? 2 : 1;
    verifierFinDePartie();

    // Construire le message de statut
    var msg = "";
    if (partieTerminee) {
        if (scoreJ1 > scoreJ2) {
            msg = " Joueur 1 gagne ! (" + scoreJ1 + " vs " + scoreJ2 + ")";
        } else if (scoreJ2 > scoreJ1) {
            msg = " Joueur 2 gagne ! (" + scoreJ2 + " vs " + scoreJ1 + ")";
        } else {
            msg = " Égalité ! (" + scoreJ1 + " graines chacun)";
        }
    }

    // keeps track of the stage using ajax.js
    var nouvelEtat = {
        cases: cases.slice(),
        scoreJ1: scoreJ1,
        scoreJ2: scoreJ2,
        joueurActif: joueurActif,
        partieTerminee: partieTerminee,
        dernierCoup: idx,
        message: msg,
        timestamp: Date.now()
    };
    ecrireEtatLocal(nouvelEtat);

    afficherPlateau();
    mettreAJourScores();
    mettreAJourTour();
    if (msg) afficherMessage(msg, partieTerminee ? "fin" : "");
}

// new game

function demanderNouvellePartie() {
    if (monRole === 0) return;
    var etat = reinitialiserEtat();
    appliquerEtat(etat);
    afficherMessage("Nouvelle partie ! C'est au Joueur 1 de commencer.", "succes");
}

// player / camp

function campDuJoueur(j) {
    if (j === 1) return [1, 2, 3, 4, 5, 6, 7];
    return [8, 9, 10, 11, 12, 13, 14];
}

function appartientAuJoueur(caseIdx, j) {
    return campDuJoueur(j).indexOf(caseIdx) !== -1;
}


// sharing of grains

function positionDansBoucle(caseIdx) {
    return boucle.indexOf(caseIdx);
}

function time(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// Sound helper jesus (:)
function obtenirAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Always try to resume — some browsers suspend it between interactions
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function jouerSonGraine() {
    try {
        const ctx = obtenirAudioCtx();
        const now = ctx.currentTime;

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.2);

        // Maximum volume (1.0)
        gainNode.gain.setValueAtTime(1.0, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(now);
        oscillator.stop(now + 0.2);

        oscillator.onended = () => {
            oscillator.disconnect();
            gainNode.disconnect();
        };
    } catch (e) {
        console.warn("Audio error:", e);
    }
}

//uddate of grain sharing
async function distribuerGraines(caseDepart, nbGraines) {
    var pos = positionDansBoucle(caseDepart);
    var sautCaseDepart = (nbGraines > 13);
    var casesDistrib = [];

    for (var i = 1; i <= nbGraines; i++) {
        var prochaine = boucle[(pos + i) % 14];
        if (sautCaseDepart && prochaine === caseDepart) {
            nbGraines++;
            continue;
        }
        casesDistrib.push(prochaine);
    }

    for (var j = 0; j < casesDistrib.length; j++) {
        cases[casesDistrib[j]]++;
        jouerSonGraine();
        afficherPlateau();
        await time(400);
    }

    return casesDistrib[casesDistrib.length - 1];
}


// CAPTURES

function effectuerCaptures(derniereCase) {
    var adversaire = (joueurActif === 1 ? 2 : 1);
    var campAdverse = campDuJoueur(adversaire);

    if (campAdverse.indexOf(derniereCase) === -1) return;
    if (derniereCase === 7) return; // Case 7 protégée
    if (!estCapturableGraines(cases[derniereCase])) return;

    // --- LOGIQUE DE CHAÎNE ---
    var posActuelle = positionDansBoucle(derniereCase);
    var grainesACapturer = 0;
    var casesACapturer = [];

    var p = posActuelle;
    while (true) {
        var cIdx = boucle[p];
        if (campAdverse.indexOf(cIdx) === -1) break;
        if (cIdx === 7) break;
        if (!estCapturableGraines(cases[cIdx])) break;

        casesACapturer.push(cIdx);
        grainesACapturer += cases[cIdx];
        p = (p - 1 + 14) % 14;
    }

    // --- RÈGLE SOLIDARITÉ (GRAND CHELEM) ---
    var grainesRestantesCamp = somme(campAdverse);
    if (grainesACapturer === grainesRestantesCamp) {
        // On ne capture rien pour ne pas vider le camp
        return;
    }

    // Appliquer capture
    for (var i = 0; i < casesACapturer.length; i++) {
        var idx = casesACapturer[i];
        if (joueurActif === 1) {
            scoreJ1 += cases[idx];
        } else {
            scoreJ2 += cases[idx];
        }
        cases[idx] = 0;
    }
}

function estCapturableGraines(nb) {
    return nb === 2 || nb === 3 || nb === 4;
}

// SOLIDARITÉ


function coupRespecteSolidarite(idx) {
    var adversaire = (joueurActif === 1) ? 2 : 1;
    var campAdv = campDuJoueur(adversaire);

    var grainesAdversaire = 0;
    for (var i = 0; i < campAdv.length; i++) {
        grainesAdversaire += cases[campAdv[i]];
    }

    if (grainesAdversaire > 0) return true;

    var graines = cases[idx];
    var pos = positionDansBoucle(idx);
    var saut = (graines > 13);
    var count = 0;
    var grainesEnvoyees = 0;

    for (var i = 1; i <= graines + (saut ? 1 : 0); i++) {
        var prochaine = boucle[(pos + i) % 14];
        if (saut && prochaine === idx) {
            graines++;
            continue;
        }
        count++;
        if (campAdv.indexOf(prochaine) !== -1) grainesEnvoyees++;
        if (count >= graines) break;
    }

    if (grainesEnvoyees === 0) {
        var monCamp = campDuJoueur(joueurActif);
        for (var k = 0; k < monCamp.length; k++) {
            if (monCamp[k] === idx || cases[monCamp[k]] === 0) continue;
            if (coupNourritAdversaire(monCamp[k], adversaire)) {
                return false;
            }
        }
    }

    return true;
}

function coupNourritAdversaire(idx, adversaire) {
    var campAdv = campDuJoueur(adversaire);
    var graines = cases[idx];
    var pos = positionDansBoucle(idx);
    var saut = (graines > 13);
    var count = 0;

    for (var i = 1; i <= graines + (saut ? 1 : 0); i++) {
        var prochaine = boucle[(pos + i) % 14];
        if (saut && prochaine === idx) { graines++; continue; }
        count++;
        if (campAdv.indexOf(prochaine) !== -1) return true;
        if (count >= graines) break;
    }
    return false;
}

function coupRespecteSolidariteSimule(idx, j) {
    var adversaire = (j === 1) ? 2 : 1;
    var campAdv = campDuJoueur(adversaire);
    var grainesAdversaire = 0;
    for (var i = 0; i < campAdv.length; i++) grainesAdversaire += cases[campAdv[i]];
    if (grainesAdversaire > 0) return true;
    return coupNourritAdversaire(idx, adversaire);
}


// FIN DE PARTIE

function somme(camp) {
    var total = 0;
    for (var i = 0; i < camp.length; i++) total += cases[camp[i]];
    return total;
}

function aUnCoupValide(j) {
    var monCamp = campDuJoueur(j);
    for (var i = 0; i < monCamp.length; i++) {
        if (cases[monCamp[i]] > 0 && coupRespecteSolidariteSimule(monCamp[i], j)) {
            return true;
        }
    }
    return false;
}

function peutNourrir(j, campCible) {
    var monCamp = campDuJoueur(j);
    for (var i = 0; i < monCamp.length; i++) {
        if (cases[monCamp[i]] > 0 && coupNourritAdversaire(monCamp[i], j === 1 ? 2 : 1)) {
            return true;
        }
    }
    return false;
}

function verifierFinDePartie() {
    var campJ1 = campDuJoueur(1);
    var campJ2 = campDuJoueur(2);
    var grainesJ1 = somme(campJ1);
    var grainesJ2 = somme(campJ2);

    if (joueurActif === 1 && grainesJ1 === 0) {
        if (grainesJ2 === 0 || !peutNourrir(2, campJ1)) { terminerPartie(); return; }
    }
    if (joueurActif === 2 && grainesJ2 === 0) {
        if (grainesJ1 === 0 || !peutNourrir(1, campJ2)) { terminerPartie(); return; }
    }
    if (!aUnCoupValide(joueurActif)) {
        terminerPartie();
    }
}

function terminerPartie() {
    partieTerminee = true;
    scoreJ1 += somme(campDuJoueur(1));
    scoreJ2 += somme(campDuJoueur(2));
    for (var i = 1; i <= 14; i++) cases[i] = 0;
}


// AFFICHAGE


function afficherPlateau() {
    for (var i = 1; i <= 14; i++) {
        document.getElementById("cpt-" + i).textContent = cases[i];

        var divGraines = document.getElementById("graines-" + i);
        divGraines.innerHTML = "";

        var nb = cases[i];
        var taille = nb > 10 ? "petite" : "";
        var afficher = Math.min(nb, 12);
        for (var g = 0; g < afficher; g++) {
            var span = document.createElement("span");
            span.className = "graine " + taille;
            divGraines.appendChild(span);
        }

        var caseDiv = document.getElementById("case-" + i);
        caseDiv.classList.remove("jouable", "bloquee");

        if (!partieTerminee && appartientAuJoueur(i, monRole)) {
            if (monRole === joueurActif && cases[i] > 0 && coupRespecteSolidariteSimule(i, monRole)) {
                caseDiv.classList.add("jouable");
            } else {
                caseDiv.classList.add("bloquee");
            }
        }
    }
}

function mettreAJourScores() {
    document.getElementById("pts-j1").textContent = scoreJ1;
    document.getElementById("pts-j2").textContent = scoreJ2;
    document.getElementById("score-j1").classList.toggle("actif", joueurActif === 1 && !partieTerminee);
    document.getElementById("score-j2").classList.toggle("actif", joueurActif === 2 && !partieTerminee);
}

function mettreAJourTour() {
    if (!partieTerminee) {
        var estMonTour = (joueurActif === monRole);
        var texte = "Tour de : <strong>Joueur " + joueurActif + "</strong>";
        if (estMonTour) texte += " ← <em>Votre tour !</em>";
        document.getElementById("texte-tour").innerHTML = texte;
    } else {
        document.getElementById("texte-tour").innerHTML = "⏹ Partie terminée";
    }
}

function afficherMessage(texte, type) {
    var el = document.getElementById("message");
    el.textContent = texte;
    el.className = type || "";
}

function mettreAJourSync(ok) {
    var indicateur = document.getElementById("indicateur-sync");
    var texte = document.getElementById("texte-sync");
    if (ok) {
        indicateur.textContent = "🟢";
        texte.textContent = "Synchronisé";
    } else {
        indicateur.textContent = "🔴";
        texte.textContent = "En attente...";
    }
}
