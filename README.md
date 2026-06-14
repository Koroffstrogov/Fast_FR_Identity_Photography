# Fast_FR_Identity_Photography

Outil web local pour cadrer et imprimer des photos d'identite 35 x 45 mm.

## Detection visage locale

La detection visage utilise MediaPipe Tasks Vision dans le navigateur, en mode
image, uniquement sur la photo active. Aucune photo n'est envoyee a un serveur.

Assets attendus en local :

- modele : `public/models/mediapipe/face_landmarker.task`
- WASM : `public/models/mediapipe/wasm/`

Les fichiers WASM sont copies depuis `@mediapipe/tasks-vision`. Le fichier
`.task` n'est pas fourni automatiquement : ajoutez-le dans le chemin ci-dessus
avant d'utiliser le bouton `Placer les points automatiquement`.

Modele officiel MediaPipe : la documentation Google AI Edge liste un bundle
Face Landmarker telechargeable pour cette tache. Pour l'installer localement :

```powershell
Invoke-WebRequest `
  -Uri "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task" `
  -OutFile "public/models/mediapipe/face_landmarker.task"
```

Le fichier `.task` est ignore par Git pour eviter de committer un asset modele.

Le cadrage automatique est une aide initiale. Verifiez toujours le menton, le
sommet du crane et la ligne des yeux avec le guide avant export ou impression.

## Diagnostic qualite local

Le mode `Qualite` analyse localement le rendu final 35 x 45 mm : exposition,
contraste, clipping des ombres/hautes lumieres, dominante couleur approximative
et nettete indicative. Le diagnostic est une aide visuelle et ne garantit pas
l'acceptation officielle d'une photo.

Le bouton `Amelioration auto legere` applique uniquement des corrections
prudentes : exposition, contraste, temperature, saturation et nettete legere.
Il ne fait pas de retouche beaute, ne lisse pas la peau et ne modifie pas la
forme du visage, les yeux, la bouche ou les dents. Les corrections sont stockees
par photo et appliquees localement aux apercus finaux, exports JPEG, ZIP,
planche A4 et impression.

Limites connues du diagnostic qualite :

- photo tres floue ;
- ombres fortes ;
- eclairage tres jaune ;
- arriere-plan irregulier ;
- image tres compressee.

## Suppression locale du fond

La suppression du fond utilise MediaPipe Image Segmenter dans le navigateur,
avec un modele personne/fond charge depuis `public/models`. Aucune photo n'est
envoyee a un serveur et l'image originale reste intacte : le masque, la couleur
de remplacement et les points de correction sont stockes dans l'etat d'edition
de chaque photo.

Modele attendu :

- `public/models/mediapipe/selfie_segmenter.tflite`

Installation locale du modele personne/fond :

```powershell
Invoke-WebRequest `
  -Uri "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite" `
  -OutFile "public/models/mediapipe/selfie_segmenter.tflite"
```

Les fichiers `.tflite` sont ignores par Git pour eviter de committer les assets
modele. Les WASM MediaPipe restent attendus dans `public/models/mediapipe/wasm/`.

Le lot actuel utilise Image Segmenter pour produire un premier masque, puis un
raffinement local par seuil, lissage, contour progressif et points
personne/fond. L'Interactive Segmenter n'est pas encore branche : les points
appliquent une correction locale douce autour du clic.

Limites connues a verifier visuellement :

- cheveux fins et halos ;
- lunettes et accessoires ;
- fond proche de la couleur des vetements ;
- ombres fortes ou mur tres degrade ;
- photo floue ;
- plusieurs personnes ;
- eclairage irregulier.
