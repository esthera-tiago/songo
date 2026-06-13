var cases = [];
var scoreJ1 = 0;
var scoreJ2 = 0;
var joueurActif = 1;
var partieTerminee = false;
var distributionEnCours = false;

var boucle = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

var audioCtx = null;


//new game
function nouvellePartie() {
    cases = [];
    cases[0] = 0;
    for (var i = 1; i <= 14; i++) {
        cases[i] = 5;
    }
    obtenirAudioCtx();
    scoreJ1 = 0;
    scoreJ2 = 0;
    joueurActif = 1;
    partieTerminee = false;
    afficherMessage("", "");
    afficherPlateau();
    mettreAJourScores();
    mettreAJourTour();
}



function campDuJoueur(j) {
    if (j === 1) return [1, 2, 3, 4, 5, 6, 7];
    return [8, 9, 10, 11, 12, 13, 14];
}

function appartientAuJoueur(caseIdx, j) {
    return campDuJoueur(j).indexOf(caseIdx) !== -1;
}



function positionDansBoucle(caseIdx) {
    return boucle.indexOf(caseIdx);
}

function casesSuivantes(depart, nb) {
    var pos = positionDansBoucle(depart);
    var seq = [];
    for (var i = 1; i <= nb; i++) {
        seq.push(boucle[(pos + i) % 14]);
    }
    return seq;
}

async function jouerCase(idx) {
    if (partieTerminee || distributionEnCours) {
        return;
    }

    // joue dans le bon camp
    if (!appartientAuJoueur(idx, joueurActif)) {
        afficherMessage("Joue bien mafffff :(", "erreur");
        return;
    }

    // case vide
    if (cases[idx] === 0) {
        afficherMessage("Cette case est vide", "erreur");
        return;
    }

    // ègle de solidarité avant de jouer
    if (!coupRespecteSolidarite(idx)) {
        afficherMessage("Solidarité : tu ne peux pas jouer ce coup car il viderait le camp adverse qui n'a plus de graines !", "erreur");
        return;
    }

    // Effectuer la semaille
    var graines = cases[idx];
    cases[idx] = 0;

    var caseDepart = idx;
    distributionEnCours = true;
    var derniereCase = await distribuerGraines(caseDepart, graines);
    distributionEnCours = false;

    // Vérifier les captures
    effectuerCaptures(derniereCase);

    // Passer au joueur suivant
    joueurActif = (joueurActif === 1) ? 2 : 1;

    // Vérifier si le nouveau joueur peut jouer (solidarité / fin de partie)
    verifierFinDePartie();

    afficherPlateau();
    mettreAJourScores();
    mettreAJourTour();
}

// SEMAILLE :(

function time(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function obtenirAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
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

async function distribuerGraines(caseDepart, nbGraines) {
    var pos = positionDansBoucle(caseDepart);
    var casesDistrib = [];
    var sautCaseDepart = (nbGraines > 13);

    // Construire la liste des cases où on distribue
    for (var i = 1; i <= nbGraines; i++) {
        var prochaine = boucle[(pos + i) % 14];
        if (sautCaseDepart && prochaine === caseDepart) {
            nbGraines++;
            continue;
        }
        casesDistrib.push(prochaine);
    }

    // Distribuer une graine dans chaque case avec animation
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
    // La capture n'a lieu que si la dernière graine tombe dans le camp adverse
    var adversaire = (joueurActif === 1 ? 2 : 1);
    var campAdverse = campDuJoueur(adversaire);

    if (campAdverse.indexOf(derniereCase) === -1) {
        return; // pas de capture si on finit chez soi
    }

    // La case 7 est protégée : jamais de capture sur la case 7
    if (derniereCase === 7) {
        return;
    }

    // Vérifier si la case contient 2, 3 ou 4 graines
    if (!estCapturableGraines(cases[derniereCase])) {
        return;
    }

    // --- LOGIQUE DE CAPTURE EN CHAÎNE ---
    var posActuelle = positionDansBoucle(derniereCase);
    var grainesACapturer = 0;
    var casesACapturer = [];

    // On remonte la chaîne tant qu'on est chez l'adversaire et que les cases sont capturables
    var p = posActuelle;
    while (true) {
        var cIdx = boucle[p];
        if (campAdverse.indexOf(cIdx) === -1) break;
        if (cIdx === 7) break; // protégée
        if (!estCapturableGraines(cases[cIdx])) break;

        casesACapturer.push(cIdx);
        grainesACapturer += cases[cIdx];

        // Reculer dans la boucle
        p = (p - 1 + 14) % 14;
    }

    // --- RÈGLE DE SOLIDARITÉ (GRAND CHELEM) ---
    // Vérifier si la capture viderait TOTALEMENT le camp adverse
    var grainesRestantesDansCamp = somme(campAdverse);
    if (grainesACapturer === grainesRestantesDansCamp) {
        afficherMessage("Interdiction de vider le camp adverse ! Capture annulée.", "info");
        return;
    }

    // Appliquer la capture
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

// solidarite :(


function coupRespecteSolidarite(idx) {
    var adversaire = (joueurActif === 1) ? 2 : 1;
    var campAdv = campDuJoueur(adversaire);

    // Si l'adversaire a des graines dans son camp, pas de problème
    var grainesAdversaire = 0;
    for (var i = 0; i < campAdv.length; i++) {
        grainesAdversaire += cases[campAdv[i]];
    }

    if (grainesAdversaire > 0) {
        return true; // l'adversaire a des graines, le coup est toujours valide
    }

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
        if (campAdv.indexOf(prochaine) !== -1) {
            grainesEnvoyees++;
        }
        if (count >= graines) break;
    }

    // Si on ne peut pas envoyer de graines chez l'adversaire = coup interdit
    // ...sauf si c'est le seul coup disponible
    if (grainesEnvoyees === 0) {
        // Vérifier si un autre coup pourrait nourrir l'adversaire
        var monCamp = campDuJoueur(joueurActif);
        for (var k = 0; k < monCamp.length; k++) {
            if (monCamp[k] === idx) continue; // on ignore la case en cours
            if (cases[monCamp[k]] === 0) continue;
            if (coupNourritAdversaire(monCamp[k], adversaire)) {
                return false; // il existe un autre coup qui nourrit : celui-ci est interdit
            }
        }
        // Aucun autre coup ne peut nourrir → ce coup est autorisé quand même
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
        if (saut && prochaine === idx) {
            graines++;
            continue;
        }
        count++;
        if (campAdv.indexOf(prochaine) !== -1) return true;
        if (count >= graines) break;
    }
    return false;
}

// =============================================
// FIN DE PARTIE
// =============================================

function verifierFinDePartie() {
    var campJ1 = campDuJoueur(1);
    var campJ2 = campDuJoueur(2);

    var grainesJ1 = somme(campJ1);
    var grainesJ2 = somme(campJ2);

    // Si le joueur actif n'a aucune graine dans son camp
    if (joueurActif === 1 && grainesJ1 === 0) {
        // L'adversaire (J2) doit nourrir si possible
        if (grainesJ2 === 0 || !peutNourrir(2, campJ1)) {
            terminerPartie();
            return;
        }
        // Sinon J2 doit jouer un coup de solidarité (géré au moment du coup)
    }

    if (joueurActif === 2 && grainesJ2 === 0) {
        if (grainesJ1 === 0 || !peutNourrir(1, campJ2)) {
            terminerPartie();
            return;
        }
    }

    // Cas général : si le joueur actif n'a aucun coup valide
    if (!aUnCoupValide(joueurActif)) {
        terminerPartie();
    }
}

function somme(camp) {
    var total = 0;
    for (var i = 0; i < camp.length; i++) {
        total += cases[camp[i]];
    }
    return total;
}

// Vérifie si le joueur j peut envoyer des graines dans campCible
function peutNourrir(j, campCible) {
    var monCamp = campDuJoueur(j);
    for (var i = 0; i < monCamp.length; i++) {
        if (cases[monCamp[i]] > 0 && coupNourritAdversaire(monCamp[i], j === 1 ? 2 : 1)) {
            return true;
        }
    }
    return false;
}

function aUnCoupValide(j) {
    var monCamp = campDuJoueur(j);
    for (var i = 0; i < monCamp.length; i++) {
        if (cases[monCamp[i]] > 0) {
            if (coupRespecteSolidariteSimule(monCamp[i], j)) {
                return true;
            }
        }
    }
    return false;
}

// Version de coupRespecteSolidarite pour un joueur donné (simulation sans modifier l'état)
function coupRespecteSolidariteSimule(idx, j) {
    var adversaire = (j === 1) ? 2 : 1;
    var campAdv = campDuJoueur(adversaire);

    var grainesAdversaire = 0;
    for (var i = 0; i < campAdv.length; i++) {
        grainesAdversaire += cases[campAdv[i]];
    }

    if (grainesAdversaire > 0) return true;

    // Le camp adverse est vide, vérifier si ce coup peut nourrir
    return coupNourritAdversaire(idx, adversaire);
}

function terminerPartie() {
    partieTerminee = true;

    // Les graines restantes dans chaque camp sont attribuées à leur joueur
    var campJ1 = campDuJoueur(1);
    var campJ2 = campDuJoueur(2);
    scoreJ1 += somme(campJ1);
    scoreJ2 += somme(campJ2);

    // Vider le plateau
    for (var i = 1; i <= 14; i++) {
        cases[i] = 0;
    }

    mettreAJourScores();
    afficherPlateau();

    var msg = "";
    if (scoreJ1 > scoreJ2) {
        msg = " Joueur 1 gagne avec " + scoreJ1 + " graines contre " + scoreJ2 + " !";
    } else if (scoreJ2 > scoreJ1) {
        msg = "Joueur 2 gagne avec " + scoreJ2 + " graines contre " + scoreJ1 + " !";
    } else {
        msg = "Égalité ! Les deux joueurs ont " + scoreJ1 + " graines.";
    }
    afficherMessage(msg, "fin");
}

// =============================================
// AFFICHAGE
// =============================================

function afficherPlateau() {
    for (var i = 1; i <= 14; i++) {
        // Mettre à jour le compteur numérique
        var cptEl = document.getElementById("cpt-" + i);
        if (cptEl) cptEl.textContent = cases[i];

        // Mettre à jour la représentation visuelle des graines
        var divGraines = document.getElementById("graines-" + i);
        if (divGraines) {
            divGraines.innerHTML = "";
            var nb = cases[i];
            var taille = nb > 10 ? "petite" : "";

            // On affiche au maximum 12 cercles visuels pour ne pas éclater la case
            var afficher = Math.min(nb, 12);
            for (var g = 0; g < afficher; g++) {
                var span = document.createElement("span");
                span.className = "graine " + taille;
                divGraines.appendChild(span);
            }
        }

        // Mise en surbrillance des cases jouables
        var caseDiv = document.getElementById("case-" + i);
        if (caseDiv) {
            caseDiv.classList.remove("jouable");
            if (!partieTerminee && appartientAuJoueur(i, joueurActif) && cases[i] > 0) {
                if (coupRespecteSolidariteSimule(i, joueurActif)) {
                    caseDiv.classList.add("jouable");
                }
            }
        }
    }
}

function mettreAJourScores() {
    document.getElementById("pts-j1").textContent = scoreJ1;
    document.getElementById("pts-j2").textContent = scoreJ2;

    // Mettre en évidence le score du joueur actif
    document.getElementById("score-j1").classList.toggle("actif", joueurActif === 1 && !partieTerminee);
    document.getElementById("score-j2").classList.toggle("actif", joueurActif === 2 && !partieTerminee);
}

function mettreAJourTour() {
    if (!partieTerminee) {
        document.getElementById("nom-joueur-actif").textContent = "Joueur " + joueurActif;
    } else {
        document.getElementById("texte-tour").innerHTML = "⏹ Partie terminée";
    }
}

function afficherMessage(texte, type) {
    var el = document.getElementById("message");
    el.textContent = texte;
    el.className = type; // "erreur", "succes", "info", "fin", ou ""
}

// =============================================
// DÉMARRAGE
// =============================================

nouvellePartie();
