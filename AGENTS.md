# AGENTS.md

## Objectif du projet
Créer un outil web local de génération de photos d’identité 35×45 mm pour usages non officiels : collège, sport, badge, association.

## Contraintes fortes
- Aucune photo ne doit être envoyée à un serveur.
- Aucun tracking.
- Aucun appel réseau après chargement initial de l’application.
- Les modèles IA doivent être servis localement depuis /public/models.
- L’outil doit fonctionner dans un navigateur moderne sur PC.
- Le résultat doit rester utilisable hors ligne après build.

## Stack
- TypeScript
- Vite
- React
- Canvas 2D
- MediaPipe Tasks Vision pour visage et segmentation
- Vitest pour les tests unitaires
- Playwright pour les tests end-to-end et visuels

## Règles de code
- Séparer UI, géométrie, rendu canvas, export, IA.
- Ne pas mettre de logique métier directement dans les composants React.
- Tous les calculs de dimensions doivent passer par src/core/photo-format.ts et src/core/print-layout.ts.
- Toute nouvelle fonction de calcul doit avoir un test unitaire.
- Ne jamais supprimer les tests existants pour faire passer une modification.
- Ne pas introduire de dépendance externe sans justification dans la PR.

## Formats
- Photo individuelle : 35×45 mm, 300 dpi, JPEG.
- Planche A4 : 210×297 mm, 300 dpi, marge standard 10 mm.
- Mode standard : 5 colonnes × 6 lignes = 30 photos.
- Mode confort : 5 colonnes × 5 lignes = 25 photos avec espacement.

## Détection visage
- Utiliser MediaPipe Face Landmarker comme méthode principale.
- Prévoir un fallback manuel : clic sommet du crâne, menton, ligne des yeux.
- Ne pas utiliser FaceDetector comme dépendance principale.

## Fond
- Utiliser une segmentation personne/fond.
- Prévoir un mode assisté par points utilisateur.
- Prévoir un pinceau/gomme pour corriger le masque.
- Ne jamais modifier l’image originale ; stocker les corrections dans un état d’édition.

## Impression
- Fournir un bouton d’impression qui ouvre une page A4 dédiée.
- CSS print : @page size A4 portrait; margin: 0.
- Afficher une règle 10 cm imprimable pour contrôle.
- Documenter que l’utilisateur doit imprimer à 100 %, sans mise à l’échelle.

## Validation
Avant de considérer une tâche terminée :
- npm run typecheck
- npm run test
- npm run build
- si UI modifiée : npm run test:e2e