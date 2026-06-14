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

Le moteur principal cible est BRIA RMBG-2.0 via `onnxruntime-web/webgpu`.
L'inference se fait dans le navigateur, depuis un modele ONNX local. Aucune
photo n'est envoyee a un serveur et l'image originale reste intacte : le masque
brut, les reglages de post-traitement et la couleur de fond sont stockes dans
l'etat d'edition de chaque photo.

Assets attendus :

- modele : `public/models/rmbg2/model.onnx`
- runtime ONNX : `public/ort/`

Les fichiers ONNX Runtime `.wasm` et `.mjs` sont copies depuis
`node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded*` vers `public/ort/`.
Si le navigateur affiche une erreur de chargement `.wasm`, verifiez que ces
fichiers existent apres `npm install` et que l'app est servie par Vite ou par le
build, pas ouverte directement depuis le fichier `index.html`.

Le modele `model.onnx` n'est pas telecharge automatiquement et n'est pas
committe. Placez-le manuellement :

```powershell
New-Item -ItemType Directory -Force public/models/rmbg2
# Copier ensuite votre fichier RMBG-2.0 ONNX ici :
# public/models/rmbg2/model.onnx
```

BRIA RMBG-2.0 est soumis à licence. Vérifier les conditions d’usage, notamment commercial, avant utilisation réelle.

Validation manuelle :

- lancer l'app : `npm run dev`
- ouvrir le mode `Fond`
- cliquer `Charger / verifier le modele`
- verifier WebGPU : lire `Backend actif` et `Provider ONNX`
- forcer CPU : choisir `CPU WASM` dans `Backend fond`
- comparer `Original`, `Masque` et `Fond remplace`
- verifier l'export : activer `Remplacer le fond dans les exports`, exporter le
  JPEG et comparer visuellement le fond remplace

Le mode `Auto` tente WebGPU puis CPU/WASM. Le mode `GPU WebGPU` ne bascule pas
silencieusement vers CPU : en cas d'echec, selectionnez explicitement `CPU WASM`.
Les noms d'entree/sortie ONNX detectes et la taille du masque sont affiches dans
les details techniques du panneau Fond.

Un moteur legacy/fallback peut rester disponible dans le code s'il existe deja,
mais RMBG-2.0 est le moteur cible de ce lot. Les exports JPEG, ZIP, planche A4
et impression utilisent le fond remplace quand il est active, sans inclure les
overlays de guide, masque diagnostic ou points de correction.

Limites connues a verifier visuellement :

- cheveux fins et halos ;
- lunettes et accessoires ;
- fond proche de la couleur des vetements ;
- ombres fortes ou mur tres degrade ;
- photo floue ;
- plusieurs personnes ;
- eclairage irregulier.
