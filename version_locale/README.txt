PROJET SONGO - VERSION LOCALE
=============================

Auteur : Étudiant INF222
Date : Juin 2026

DESCRIPTION
-----------
Cette version permet à deux joueurs de s'affronter sur le même ordinateur.
Le Songo est un jeu de stratégie complexe. Cette implémentation respecte les règles
traditionnelles avec une interface sobre et efficace.

RÈGLES IMPLÉMENTÉES
-------------------
1. Plateau de 14 cases (7 cases par camp).
2. Semaille counter-clockwise (sens inverse des aiguilles d'une montre).
3. Capture de 2, 3 ou 4 graines chez l'adversaire.
4. Prises en chaîne : si la case précédant une capture est aussi capturable, elle est prise.
5. Protection de la Case 7 (Case Étoile★) : aucune capture possible sur cette case.
6. Règle de Solidarité : interdiction de vider le camp adverse si l'on peut le nourrir.
7. Règle du Grand Chelem : interdiction de capturer toutes les graines d'un camp adverse.

COMMENT JOUER
-------------
1. Ouvrir le fichier 'index.html' dans un navigateur web (Chrome, Firefox, Edge).
2. Cliquer sur une case de sa propre rangée (la rangée du bas pour J1, le haut pour J2)
   qui contient des graines.
3. Le jeu gère automatiquement les distributions, captures et changements de tour.
4. Utiliser le bouton "Nouvelle partie" pour réinitialiser le jeu.

POINTS TECHNIQUES
-----------------
- HTML5 / CSS3 (sans framework)
- JavaScript Vanilla
- Gestion dynamique du DOM pour l'affichage visuel des graines.
