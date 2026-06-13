// api/ecrire.js — Sauvegarde l'état de la partie dans Vercel KV

import { kv } from "@vercel/kv";

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Répondre aux preflight CORS
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ erreur: "Méthode non autorisée" });
    }

    const etat = req.body;

    // Vérification basique
    const champsRequis = ["cases", "scoreJ1", "scoreJ2", "joueurActif", "partieTerminee", "timestamp"];
    for (const champ of champsRequis) {
        if (!(champ in etat)) {
            return res.status(400).json({ erreur: `Champ manquant : ${champ}` });
        }
    }

    try {
        // Vérifier que le timestamp est plus récent (évite les écritures désordonnées)
        const actuel = await kv.get("songo_partie");
        if (actuel && actuel.timestamp && etat.timestamp < actuel.timestamp) {
            return res.status(409).json({ erreur: "Timestamp obsolète", timestamp: actuel.timestamp });
        }

        // Sauvegarder dans KV (expire après 24h automatiquement)
        await kv.set("songo_partie", etat, { ex: 86400 });

        return res.status(200).json({ ok: true, timestamp: etat.timestamp });
    } catch (e) {
        console.error("Erreur écriture KV :", e);
        return res.status(500).json({ erreur: "Erreur serveur" });
    }
}
