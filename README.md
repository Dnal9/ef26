# EF26 · Final Chapter — Site du tournoi

Site web professionnel de suivi du tournoi eFootball **EF26 Final Chapter** :
20 équipes, 5 journées de championnat (format suisse par pots de PE),
barrages, tableau final et sacre du champion.

## Pages

| Page | Rôle |
|---|---|
| `index.html` | Accueil — hero, prochain match, dernier résultat, podium, chiffres clés |
| `classement.html` | Classement complet — tri par colonne, recherche, zones, animation FLIP |
| `matchs.html` | Les 5 journées façon Flashscore — filtres, progression |
| `eliminatoires.html` | Grand bracket — connecteurs SVG, chemin doré, champion, confettis |
| `statistiques.html` | Dashboard — 8 cartes + 2 graphiques canvas maison |
| `equipes.html` | Une fiche par équipe — stats, forme, historique, prochains matchs |
| `admin.html` | Espace organisateur (non listé dans la navbar) |

## Structure

```
css/  tokens.css (variables) · base.css · components.css · pages/*.css
js/   store.js (données) · logic.js (calculs purs) · components.js · utils.js · pages/*.js
assets/  logo, favicon
```

**Principe :** `store.js` est le seul fichier qui sait où vivent les données
(localStorage) ; `logic.js` ne contient que des fonctions pures ; les pages ne
font que de l'affichage. Toutes les pages écoutent `Store.onChange` — une
saisie dans l'admin met à jour tout le site en direct, y compris dans les
autres onglets ouverts.

## Utilisation

1. Garde tous les dossiers ensemble, ouvre `index.html`.
2. `admin.html` → mot de passe par défaut **`ef26`**
   (à changer en haut de `js/pages/admin.js`, variable `ADMIN_PW`).
3. Dans l'admin :
   - **Équipes** — noms + PE.
   - **Outils → Régénérer le calendrier** — refait les pots selon les PE et
     tire les 50 matchs (efface les scores !). À faire une fois les 20
     vraies équipes saisies.
   - **Scores** — saisis les deux scores d'un match pour le valider ;
     vide une case pour le repasser « à venir ».
   - **Éliminatoires** — clique un vainqueur, ✕ pour annuler.

## Sécurité — à lire

Le mot de passe admin est **côté navigateur** : il est visible dans le code
source et n'empêche pas quelqu'un de motivé de modifier ses données locales.
Chaque visiteur a d'ailleurs **sa propre copie** des données (localStorage) :
pour que tout le monde voie TES résultats en direct, il faut la Phase Firebase.

## Firebase — ACTIF (temps réel)

Le site est branché sur Firebase Realtime Database : toute saisie dans
l'admin est visible par tous les visiteurs en direct. Règles à coller
dans la console : voir FIREBASE-REGLES.txt.

## Durcir la sécurité plus tard

Le code est prêt : seul `js/store.js` change.

1. Crée un projet sur console.firebase.google.com → **Realtime Database**.
2. Remplace `_read`/`_write` dans `store.js` par les appels Firebase, et
   branche `ref.on("value", …)` dans `init()` (même contrat que `onChange`).
3. Règles : lecture publique, écriture réservée à ton compte (Firebase Auth).
   C'est ça qui rend « visiteurs = lecture / toi = écriture » réel.
4. Héberge sur **Firebase Hosting** (gratuit, HTTPS) :
   `npm i -g firebase-tools` → `firebase init hosting` → `firebase deploy`.

Sans Firebase, tu peux déjà héberger tel quel sur **GitHub Pages** ou
**Netlify** (glisser-déposer) — chacun verra alors sa propre copie locale.

## Notes techniques

- Calendrier : construction « méthode du cercle » sur les 5 pots — chaque
  équipe joue exactement 1 fois par journée et rencontre exactement
  1 adversaire de chaque pot. Testé sur 2 200 générations.
- Départage : points → différence de buts → buts marqués.
- Bracket : 1–4 en quarts ; barrages 5v12, 6v11, 7v10, 8v9 ; croisement
  1ᵉ vs barragiste le moins bien classé.
- `demo.html` est une page de test du socle — supprimable.
