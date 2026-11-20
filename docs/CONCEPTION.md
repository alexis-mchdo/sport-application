# Document de conception — App de musculation

Statut : **validé**, en cours de construction (étapes 1 à 6 faites + IA branchée). Les changements importants sont discutés avant d'être codés.

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
| IA | Gemini (clé gratuite Google, saisie dans Réglages), appelé depuis l'iPhone ; **pas un chatbot** (§11) |
| Apparence | Thème sombre uniquement |
| Planning | Au choix dans les réglages : **jour fixe** (par défaut) ou **ordre** du programme |
| Poids de corps | Plus tard (hors V1) |

## 3. Stack technique

- **Vite + React + TypeScript** : base de l'app
- **Tailwind CSS** : style sombre et épuré
- **Dexie** : base de données locale (IndexedDB)
- **vite-plugin-pwa** : installation sur l'écran d'accueil + fonctionnement hors ligne
- **Graphiques faits main** (SVG) : légers, sans bibliothèque
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
Deux vues : **Progression** et **Historique**.
- Tuiles : séances au total, semaines d'affilée, charge de la semaine (vs la précédente).
- Par exercice : courbe du **1RM estimé** (formule d'Epley : `poids × (1 + reps / 30)`), meilleure série de chaque séance ;
  au poids du corps : répétitions max. Le doigt fait glisser un réticule avec le détail.
- **Records** : meilleure performance par exercice, la plus récente d'abord (« Nouveau » si cette semaine).
- **Séries par muscle et par semaine** : carte de chaleur sur les 8 dernières semaines, valeur dans chaque case.
- **Séances par semaine** : colonnes avec la ligne d'objectif du programme.
- **Historique** : séances regroupées par semaine d'entraînement, tap → détail de la séance.

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

## 7. Semaine d'entraînement et bilan (sans IA)

La semaine est un **cycle numéroté (Semaine 1, 2, 3…) clôturé à la main**, pas la semaine du calendrier.
- Pendant la semaine, **toutes les séances faites restent modifiables** (séries, reps, poids, ressenti, suppression).
- Fin de séance : **ressenti** (😫 → 💪) et **douleurs** éventuelles (zones), en un tap.
- L'écran Aujourd'hui propose le bilan quand toutes les séances sont faites, ou si une semaine du calendrier est passée ;
  sinon un lien « Clôturer la semaine maintenant ».

Écran « Bilan de la semaine » : séances / séries / charge, ressenti moyen, douleurs signalées, puis une ligne par exercice :
- **Toutes les séries réussies** → `+incrementKg` (ou le poids plus lourd déjà réussi en séance) ; au poids du corps : +1 rep. **[Oui] [Non]**
- **Séries ratées** (moins de reps ou poids baissé) **ou pas toutes faites** → on garde.
- **Ratée deux semaines de suite** → −10 % arrondi au palier (au poids du corps : −1 rep). **[Oui] [Non]**
- Emplacement « Conseils de l'IA » (§11).

**Valider et passer à la semaine N+1** : les changements acceptés sont appliqués au programme, le bilan est enregistré,
la nouvelle semaine repart à 0. Les semaines clôturées restent dans Stats, en lecture seule.

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

## 11. IA — pas un chatbot

L'IA ne discute pas et **on ne lui écrit jamais** : elle reçoit le profil (§10), le programme, l'historique et les
**ressentis / douleurs** saisis en fin de séance, et renvoie des **propositions structurées** et de **courts conseils**
que l'app affiche dans le bilan de la semaine, avec des boutons **[Accepter] [Refuser]**.

1. **Créer mon premier programme** selon le profil (exercices pris dans la bibliothèque, poids de départ selon les records).
2. **Bilan hebdo** : « tu peux monter sur X », « remplace Y à cause de ton épaule », « ajoute du volume sur Z ».
3. **Adapter à une blessure** déclarée dans le profil.

**Branchement** : API Gemini (`gemini-flash-latest` par défaut, modifiable dans Réglages → IA), clé gratuite créée sur
aistudio.google.com et collée dans Réglages. Appel direct depuis l'iPhone, déclenché par un bouton (jamais automatique).
La clé reste sur l'appareil : exclue des exports, conservée lors d'un import.
Réponse en 1 à 2 min (offre gratuite) ; relance automatique (2 fois) si Google est surchargé.
Réflexion réduite testée (scénarios du 20/11/2026) : pas plus rapide et moins bonne → non retenue.

**Où** : Programme → Nouveau → « ✨ Créer avec l'IA » (aperçu + jauge d'équilibre avant de l'utiliser) ;
Bilan de la semaine → « ✨ Analyser ma semaine » (conseils + propositions Oui / Non, appliquées à la clôture).

**Alignement** :
1. Instructions fixes (coach prudent, français, règles impératives) — `src/logique/ia.ts`.
2. Réponse au format JSON imposé (schéma) : propositions `charge` / `remplacer` / `ajouter` / `retirer` + 3 conseils max.
3. Contexte complet : profil, programme (séances codées S1, S2…), équilibre, 4 dernières semaines (séries, échecs,
   ressentis, douleurs, notes), propositions des règles §7 (à ne pas répéter), refus récents, catalogue autorisé
   (sans les exercices à éviter ni ceux hors matériel).
4. Vérification par l'app de chaque proposition : exercice connu et autorisé, séance existante, +10 % de charge max,
   ±3 reps / ±1 série, aucune hausse ni ajout sur une zone douloureuse, remplacement sur le même muscle,
   aucun muscle qui deviendrait « manquant ». Les propositions écartées sont affichées avec leur raison.
5. Rien n'est appliqué sans « Oui » (par défaut « Non ») ; les refus sont renvoyés à l'IA les semaines suivantes.
6. Scénarios de test avec la vraie API : `GEMINI_API_KEY=… npm run eval:ia` → `scripts/eval-ia-rapport.md`.

## 12. Plus tard (hors V1)

- Suivi du poids de corps.
