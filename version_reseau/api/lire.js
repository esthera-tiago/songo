// api/lire.js — Lit l'état de la partie depuis Vercel KV

import { kv } from "@vercel/kv";

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    if (req.method !== "GET") {
        return res.status(405).json({ erreur: "Méthode non autorisée" });
    }

    try {
        const etat = await kv.get("songo_partie");

        if (!etat) {
            // Aucune partie en cours → retourner l'état par défaut
            return res.status(200).json(etatDefaut());
        }

        return res.status(200).json(etat);
    } catch (e) {
        console.error("Erreur lecture KV :", e);
        return res.status(500).json({ erreur: "Erreur serveur" });
    }
}

function etatDefaut() {
    return {
        cases:          [0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
        scoreJ1:        0,
        scoreJ2:        0,
        joueurActif:    1,
        partieTerminee: false,
        dernierCoup:    null,
        message:        "",
        timestamp:      0
    };
}
