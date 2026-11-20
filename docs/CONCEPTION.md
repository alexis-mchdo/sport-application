# Document de conception — App de musculation

Statut : **validé**, en cours de construction (étapes 1 à 7 faites + IA branchée). Les changements importants sont discutés avant d'être codés.

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
| IA | **Claude par copier-coller** (aucune API, aucune clé) : l'app prépare les textes, importe le programme renvoyé (§8, §11) |
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

## 8. Échanges avec Claude (copier-coller)

Accès : Réglages → Claude, Programme → « Avec Claude », bilan de la semaine, et « ✨ Créer avec Claude » à la création.
L'app prépare un texte ; « Copier », puis « Ouvrir Claude » et coller. Rien n'est envoyé par l'app elle-même.

1. **Bilan** : profil, programme, équilibre, 4 dernières semaines (séries, échecs, ressentis, douleurs, notes),
   propositions de l'app. Claude répond par une analyse ; pour appliquer ses changements → point 2 après validation de la semaine.
2. **Programme (créer ou adapter)** : nombre de séances, consignes libres, contraintes (jours, séries par séance,
   fourchettes par muscle, muscles à ménager, blessures), catalogue des exercices autorisés avec leur identifiant,
   et le **format de réponse imposé** : un bloc ```json `{ nom, explication, seances: [{ nom, jour, exercices: [{ exercice, series, reps, poidsKg }] }] }`.
   « Adapter » inclut le programme actuel et l'historique, et demande de garder les noms des séances conservées.
3. **Import** (« 3. Importer la réponse de Claude », ou Programme → « Importer la réponse de Claude ») : coller tout le
   message ou le bloc json → l'app extrait et **vérifie** (exercices connus, ni à éviter ni hors matériel, séries 1–6,
   reps 1–30, poids arrondi au palier, jours complétés) → aperçu avec la jauge d'équilibre → « Remplacer » le programme
   actuel (les séances de même nom gardent leur historique) ou « L'ajouter comme nouveau programme ».
4. **Question libre**.

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

## 11. IA

Gemini a été branché puis **retiré** (modèles gratuits saturés, quotas quotidiens trop faibles).
L'IA passe désormais par Claude en copier-coller (§8) : gratuit avec le compte Claude, aucune clé dans l'app.
Les règles de l'app (équilibre §6, progression §7) restent déterministes ; tout programme reçu est vérifié avant usage.

## 12. Plus tard (hors V1)

- Suivi du poids de corps.
