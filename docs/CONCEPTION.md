# Document de conception — App de musculation

Statut : **validé**, en cours de construction (étapes 1 à 4 faites). Les changements importants sont discutés avant d'être codés.

## 1. Objectif

Une app perso pour iPhone, gratuite, pour planifier et suivre mes séances de musculation au quotidien.
Principes : **épurée**, **saisie ultra-rapide** (je prépare une fois, je valide d'un tap), **aide à construire un programme équilibré**.

## 2. Choix validés

| Sujet | Décision |
|---|---|
| Type d'app | App web installée sur l'écran d'accueil (PWA), aucun frais |
| Hébergement | GitHub Pages (gratuit) |
| Données | Stockées sur l'iPhone (IndexedDB), fonctionne hors ligne |
| Sauvegarde | Export / import d'un fichier JSON (à ranger dans iCloud Drive) |
| Unités | kg uniquement |
| Saisie | Objectifs pré-remplis, un tap = série validée, pas de RPE |
| Minuteur de repos | **Aucun** (pas fiable sur Safari) |
| Bibliothèque | Fournie (~80 exercices), extensible |
| IA | V1 : bouton « Copier pour Claude ». Plus tard : IA gratuite branchée (voir §11), **pas un chatbot** |
| Apparence | Thème sombre uniquement |
| Planning | Au choix dans les réglages : **jour fixe** (par défaut) ou **ordre** du programme |
| Poids de corps | Plus tard (hors V1) |

## 3. Stack technique

- **Vite + React + TypeScript** : base de l'app
- **Tailwind CSS** : style sombre et épuré
- **Dexie** : base de données locale (IndexedDB)
- **vite-plugin-pwa** : installation sur l'écran d'accueil + fonctionnement hors ligne
- **Recharts** : graphiques des stats
- **Vitest** : tests des algorithmes (équilibre, progression)
- **GitHub Actions** : chaque mise à jour du code est publiée automatiquement sur GitHub Pages

## 4. Écrans (5 onglets : Aujourd'hui, Programme, Stats, Profil, Réglages)

### 4.1 Aujourd'hui
- Carte « Séance du jour » (ex. *Push A* — 5 exercices, ~60 min) + bouton **Commencer**.
  - Mode **jour fixe** (par défaut) : la séance attribuée au jour de la semaine ; jour sans séance → « Repos » (on peut quand même en lancer une).
  - Mode **ordre** : la prochaine séance du programme pas encore faite cette semaine.
- Lien « Choisir une autre séance » (liste des séances du programme).
- Résumé de la semaine : `● ● ○ ○` séances faites / prévues.

**Écran séance en cours :**
- Un bloc par exercice ; chaque série est une pastille pré-remplie `8 × 80 kg`.
- **Tap** → ✓ validée (verte), avec les reps et le poids prévus.
- **Appui long** (ou tap sur une série déjà validée) → panneau **reps faites – / +** et **poids – / +** (orange si moins que prévu = échec).
  Changer le poids propose de l'appliquer aux séries suivantes. Ces échecs alimentent le bilan de fin de semaine (§7).
- « Dernière fois » affiché sous chaque exercice. Chaque tap est enregistré tout de suite (reprise possible si iOS ferme l'app).
- Possibilité d'ajouter / retirer / remplacer un exercice pour cette séance seulement.
- Bouton **Terminer** → bilan (séries validées, charge totale, séries à surveiller) puis historique.

### 4.2 Programme
- Programme actif : liste des séances (Push A, Pull A, Legs A…), chacune modifiable.
- Vue semaine `L M M J V S D` : chaque séance est attribuée à un jour (sélecteur de jours, sans clavier).
- Édition d'une séance : ajouter un exercice depuis la bibliothèque (recherche + filtre par muscle), régler séries × reps × poids, réordonner.
- **Jauge d'équilibre** (voir §6) toujours visible en bas.
- « Nouveau programme » : choisir un modèle selon le nombre de jours, ou partir de zéro.

| Jours / semaine | Modèles proposés |
|---|---|
| 3 | Full Body, PPL |
| 4 | Upper / Lower |
| 5 | PPL + Upper / Lower |
| 6 | PPL × 2 |

### 4.3 Stats
- Par exercice : courbe du poids et du **1RM estimé** (formule d'Epley : `poids × (1 + reps / 30)`).
- **Records personnels** récents.
- **Volume par muscle** sur les 4 à 8 dernières semaines.
- **Régularité** : séances par semaine, semaines consécutives.
- **Historique** : calendrier, tap sur un jour → détail de la séance.

### 4.4 Réglages
- Mode de planning : jour fixe / ordre du programme.
- Exporter / importer les données (+ rappel si pas d'export depuis 14 jours).
- Bibliothèque : ajouter / modifier mes exercices.
- **Copier pour Claude** (voir §8).

## 5. Modèle de données

```
Exercice        id, nom, musclesPrincipaux[], musclesSecondaires[],
                type (polyarticulaire | isolation), incrementKg, perso (bool)

Programme       id, nom, joursParSemaine, actif (bool), seances[]
  Seance        id, nom, ordre, jourSemaine (1 = lundi … 7 = dimanche, optionnel), exercices[]
    ExoPrevu    exerciceId, series, reps, poidsKg

SeanceRealisee  id, date, seanceId, exercices[], note
  ExoRealise    exerciceId, series[]
    Serie       repsPrevues, poidsKg, repsFaites, validee (bool)

BilanSemaine    semaine (ex. 2026-W47), decisions[] (exerciceId, ancienPoids, nouveauPoids)
```

**Muscles suivis (14)** : pectoraux, dos (largeur), haut du dos / trapèzes, épaules avant, épaules latérales, épaules arrière, biceps, triceps, avant-bras, abdominaux, quadriceps, ischio-jambiers, fessiers, mollets.

## 6. Algorithme d'équilibre (sans IA)

1. **Comptage** : pour chaque séance du programme et chaque exercice, compter les séries par muscle
   (1 série pour un muscle principal, 0,5 pour un muscle secondaire).
2. **Fourchette repère par muscle et par semaine** (prise de muscle) :
   🔴 < 6 séries · 🟠 6 à 9 · 🟢 10 à 20 · 🟡 > 20 (beaucoup).
   Les petits muscles (avant-bras, mollets, abdos) ont une cible plus basse.
3. **Alertes** (3 maximum à la fois, les plus importantes d'abord) :
   - Muscle manquant ou trop bas → *« Quadriceps : 4 séries (cible 10+). Ajouter Squat ou Presse à cuisses ? »* avec un bouton **Ajouter**.
   - Déséquilibre poussée / tirage (rapport > 1,5).
   - Déséquilibre quadriceps / ischio-jambiers.
   - Même muscle travaillé en principal deux jours d'affilée (selon les jours attribués ; en mode ordre, deux séances qui se suivent).
4. Les suggestions d'exercices viennent de la bibliothèque (exercices dont le muscle visé est principal).

## 7. Progression en fin de semaine (sans IA)

Écran « Bilan de la semaine » proposé à la fin de la semaine (lundi = début de semaine), une ligne par exercice :
- **Toutes les séries validées** → proposer `+incrementKg` (2,5 kg en polyarticulaire, 1 à 2 kg en isolation). **[Oui] [Non]**
- **Quelques séries ratées** → garder le même poids. **[OK]**
- **Ratée deux semaines de suite** → proposer −10 %. **[Oui] [Non]**

Les décisions mettent à jour les objectifs du programme.

## 8. « Copier pour Claude »

Le bouton génère un texte prêt à coller dans l'app Claude :
- le programme actuel (séances, exercices, objectifs) ;
- un résumé des 4 dernières semaines (séances faites, séries ratées, progression des charges, volume par muscle) ;
- une question au choix : *bilan de la semaine*, *analyse de mon programme*, *ou question libre*.

Plus tard, on pourra le remplacer par une API gratuite (ex. Gemini) pour un coach intégré.

## 9. Étapes de construction

Chaque étape se termine par une version utilisable sur l'iPhone.

1. **Socle** : projet créé, page vide publiée sur GitHub Pages, installée sur l'iPhone (on valide toute la chaîne dès le début).
2. **Bibliothèque + données** : les ~80 exercices, la base locale, export / import.
3. **Programme** : modèles, éditeur de séances, jauge d'équilibre + alertes.
4. **Séance du jour** : écran Aujourd'hui, validation des séries, historique.
5. **Bilan de la semaine** : progression des charges.
6. **Stats** : courbes, records, volume, régularité.
7. **Copier pour Claude**.

## 10. Profil

Onglet dédié, rempli une fois puis mis à jour. Sert à l'IA (§11) : création du premier programme et ajustements.
Enregistrement automatique, pourcentage de complétion, aperçu du texte envoyé à l'IA.

- **Toi** : sexe, année de naissance, taille, poids.
- **Expérience** : niveau, années de pratique.
- **Objectif** principal + muscles à prioriser.
- **Disponibilité** : séances / semaine, durée par séance, jours possibles.
- **Matériel** : lieu, équipement disponible.
- **Blessures et douleurs** : zone, côté, gravité, actuelle / ancienne, précision.
- **Exercices** à éviter / préférés.
- **Récupération** : sommeil, stress, activité quotidienne.
- **Records** actuels (squat, développé couché, soulevé de terre, militaire, tractions).
- **Notes** libres.

## 11. IA (plus tard) — pas un chatbot

L'IA ne discute pas : elle reçoit le profil + le programme + l'historique, et renvoie des **propositions structurées**
que l'app affiche avec des boutons **[Accepter] [Refuser]**.

1. **Créer mon premier programme** selon le profil (exercices pris dans la bibliothèque, poids de départ selon les records).
2. **Bilan hebdo** : « tu peux monter sur X », « remplace Y à cause de ton épaule », « ajoute du volume sur Z ».
3. **Adapter à une blessure** déclarée dans le profil.

Piste : API gratuite (ex. Gemini, offre gratuite avec quotas ; les données peuvent servir à l'entraînement de leurs modèles).
L'app vérifie toujours la réponse (exercices existants, règles d'équilibre §6) avant de proposer quoi que ce soit.

## 12. Plus tard (hors V1)

- Suivi du poids de corps.
