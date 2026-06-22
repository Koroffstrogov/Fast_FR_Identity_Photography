# Fast_FR_Identity_Photography

Outil web local pour cadrer, corriger, imprimer et exporter des photos
d'identite 35 x 45 mm pour usages non officiels : college, sport, badge,
association.

L'application tourne dans le navigateur sur PC. Les photos restent locales :
aucune photo n'est envoyee a un serveur, aucun tracking n'est ajoute, les assets
IA sont servis localement et les modeles RMBG restent hors du build.

## Fonctionnalites

- import local d'une ou plusieurs images ;
- liste de photos avec nom affichable, prenom, nom, usage et nombre de copies ;
- cadrage manuel independant par photo : deplacement, zoom, rotation ;
- zoom a la molette autour du pointeur ;
- guide visage France officiel affichable/masquable ;
- points visage automatiques ou manuels : yeux, menton, sommet du crane ;
- export JPEG individuel 35 x 45 mm en 300 dpi, soit 413 x 531 px ;
- export batch separe et ZIP avec modele de nommage ;
- planche A4 portrait 210 x 297 mm en 300 dpi ;
- mode planche standard 5 x 6, 30 photos maximum ;
- mode planche confort 5 x 5, 25 photos maximum avec espacement de coupe ;
- planche multi-personnes avec nombre de copies par photo ;
- traits de coupe et regle 10 cm imprimable ;
- page d'impression A4 avec CSS print ;
- diagnostic qualite local et amelioration automatique legere ;
- suppression/remplacement local du fond via RMBG-1.4 ONNX, WebGPU/CPU ;
- apercus `Original`, `Masque`, `Fond remplace` ;
- exports photo, ZIP, planche A4 et impression avec fond remplace quand active.

Le guide visage, les points de controle, le masque diagnostic et les overlays
UI ne sont jamais inclus dans les exports propres.

## Prerequis

- Node.js recent compatible Vite ;
- npm ;
- navigateur moderne sur PC ;
- WebGPU recommande pour la suppression de fond, CPU/WASM disponible en fallback ;
- modele visage MediaPipe local si vous utilisez la detection visage ;
- modele RMBG-1.4 ONNX local si vous utilisez la suppression du fond.

## Installation

### 1. Se placer dans le dossier du projet

Toutes les commandes doivent etre executees depuis la racine du depot, le dossier
qui contient `package.json`, `vite.config.ts`, `src/` et `public/`.

```powershell
cd z:\KDrive\GitHub\Fast_FR_Identity_Photography
```

Pour verifier que vous etes au bon endroit :

```powershell
Get-ChildItem package.json, vite.config.ts, public, src
```

### 2. Installer les dependances JavaScript

```powershell
npm install
```

Cette commande installe React, Vite, Vitest, Playwright, MediaPipe Tasks Vision,
ONNX Runtime Web et les dependances d'export ZIP dans `node_modules/`.

Si `npm install` echoue, verifier d'abord que Node.js et npm sont disponibles :

```powershell
node --version
npm --version
```

### 3. Verifier les assets ONNX Runtime Web

Les moteurs de suppression de fond RMBG utilisent ONNX Runtime Web. Les fichiers
runtime doivent etre servis localement depuis `public/ort/`, sans CDN.

Verifier leur presence :

```powershell
Get-ChildItem public/ort
```

Vous devez voir des fichiers du type :

```text
ort-wasm-simd-threaded.wasm
ort-wasm-simd-threaded.mjs
ort-wasm-simd-threaded.jsep.wasm
ort-wasm-simd-threaded.jsep.mjs
```

Si le dossier est absent ou incomplet, recopier les assets depuis le package npm :

```powershell
New-Item -ItemType Directory -Force public/ort
Copy-Item `
  -Path node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded* `
  -Destination public/ort `
  -Force
```

Ne melangez pas des fichiers `public/ort/` provenant d'une autre version
`onnxruntime-web`. Les fichiers doivent etre recopies depuis le
`node_modules/onnxruntime-web/dist/` installe par ce projet. Ils sont servis
comme fichiers statiques au runtime ; ils ne doivent jamais etre importes depuis
`src/` avec `import "/ort/..."` ou `new URL("/ort/...", import.meta.url)`.

### 4. Ajouter les modeles locaux optionnels

L'application demarre sans modele IA, mais les fonctions de detection visage et
de suppression de fond exigent des fichiers locaux.

Pour la suppression du fond en developpement, placer en priorite le modele
RMBG-1.4 FP16 ici :

```text
local-models/rmbg1.4/model_fp16.onnx
```

Creer le dossier si besoin :

```powershell
New-Item -ItemType Directory -Force local-models/rmbg1.4
```

RMBG-1.4 est le moteur recommande pour compatibilite navigateur. Les variantes
RMBG-1.4 reconnues par l'interface sont :

```text
local-models/rmbg1.4/model.onnx
local-models/rmbg1.4/model_fp16.onnx
local-models/rmbg1.4/model_quantized.onnx
```

Ces fichiers ne sont pas fournis, ne sont pas telecharges automatiquement et
sont ignores par Git. Ils ne doivent pas etre places dans `public/`, sinon Vite
les copiera dans `dist/` pendant `npm run build`. En developpement, un
middleware Vite sert automatiquement ces fichiers locaux sous les URLs attendues
par l'application :

```text
/models/rmbg1.4/model.onnx
/models/rmbg1.4/model_fp16.onnx
/models/rmbg1.4/model_quantized.onnx
```

Apres copie, verifier qu'il existe et qu'il ne s'agit pas d'un fichier HTML ou
vide :

```powershell
Get-Item local-models/rmbg1.4/model_fp16.onnx
Format-Hex local-models/rmbg1.4/model_fp16.onnx -Count 32
```

Pour un deploiement statique, `local-models/` n'est pas inclus dans le build.
Il faut donc fournir vous-meme les modeles aux URLs `/models/rmbg1.4/*.onnx`
sur le serveur statique final, ou adapter la configuration `modelPath` si vous
hebergez un modele a une autre URL.

Pour la detection visage, le modele MediaPipe est documente plus bas dans
`Configuration des modeles locaux`.

### 5. Lancer l'application en developpement

```powershell
npm run dev
```

Vite affiche une URL locale, par exemple :

```text
http://127.0.0.1:5173
```

Ouvrir exactement l'URL affichee. Si Vite utilise un autre port, par exemple
`5175`, utiliser ce port dans le navigateur.

### 6. Verifier que le bon projet est servi

Depuis l'application, mode `Fond`, ouvrir `Details ONNX`. Les champs suivants
aident a diagnostiquer un probleme de modele :

- `Origin courant` : port reel ouvert dans le navigateur ;
- `URL testee` : URL exacte du modele RMBG selectionne ;
- `Content-Type modele` : ne doit pas etre `text/html` pour un vrai modele ;
- `Octets modele` : doit etre largement superieur a 1024.

Si le modele renvoie `text/html`, le navigateur recoit l'application Vite au
lieu du fichier ONNX. Verifier alors le port ouvert, le middleware Vite et la
presence du modele selectionne dans `local-models/rmbg1.4/`.

### 7. Construire et previsualiser le build

Construire la version de production :

```powershell
npm run build
```

Previsualiser le build :

```powershell
npm run preview
```

Le build doit rester utilisable hors ligne apres chargement initial, a condition
que les assets runtime soient presents et que le serveur statique fournisse les
modeles attendus. Le dossier `local-models/` n'est pas copie dans `dist/`.

## Packaging NAS portable Windows

Le packaging NAS cree une distribution Windows pour utilisateurs novices. Ils
lancent uniquement `PhotoID-Launcher.exe` depuis le NAS ; le launcher copie la
release dans `%LOCALAPPDATA%\PhotoID\<version>\`, puis lance l'application depuis
le disque local. Cela evite d'executer Electron, les assets ORT et les modeles IA
directement depuis le NAS.

Commandes disponibles :

```powershell
npm run electron:dev
npm run package:portable
npm run package:nas
```

`npm run electron:dev` demarre Vite sur `http://127.0.0.1:5173` puis ouvre
Electron. Le mode web existant `npm run dev` reste inchange.

Avant `package:portable` ou `package:nas`, les fichiers suivants doivent etre
presents localement :

```text
public/models/mediapipe/face_landmarker.task
public/models/mediapipe/wasm/vision_wasm_internal.js
public/models/mediapipe/wasm/vision_wasm_internal.wasm
local-models/rmbg1.4/model_fp16.onnx
local-models/rmbg1.4/model_quantized.onnx
public/ort/ort-wasm-simd-threaded.asyncify.mjs
public/ort/ort-wasm-simd-threaded.asyncify.wasm
```

Les modeles ne sont pas commites et ne sont pas copies dans `dist/` par le build
Vite standard. Ils sont uniquement copies dans la release Electron/NAS au moment
du packaging.

Structure NAS produite par `npm run package:nas` :

```text
release/nas/PhotoID/
  PhotoID-Launcher.exe
  manifest.json
  releases/
    <version>/
      PhotoID.exe
      app/
      models/
        mediapipe/
          face_landmarker.task
          wasm/
        rmbg1.4/
          model_fp16.onnx
          model_quantized.onnx
      ort/
      resources/
      locales/
```

Structure locale creee au lancement :

```text
%LOCALAPPDATA%/PhotoID/
  <version>/
    PhotoID.exe
    app/
    models/
    ort/
    resources/
```

Pour creer une nouvelle version :

1. modifier `version` dans `package.json` ;
2. verifier que `local-models/rmbg1.4/` contient les modeles requis ;
3. lancer `npm run package:nas` ;
4. copier le contenu de `release/nas/PhotoID/` sur le NAS ;
5. demander aux utilisateurs de lancer `PhotoID-Launcher.exe`.

## Configuration des modeles locaux

### Detection visage MediaPipe

La detection visage utilise MediaPipe Tasks Vision dans le navigateur, en mode
image, uniquement sur la photo active. Elle sert a placer les points visage
initiaux ; l'utilisateur doit toujours verifier le cadrage final.

Assets attendus :

- modele : `public/models/mediapipe/face_landmarker.task`
- WASM : `public/models/mediapipe/wasm/`

Installation du modele Face Landmarker :

```powershell
New-Item -ItemType Directory -Force public/models/mediapipe
Invoke-WebRequest `
  -Uri "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task" `
  -OutFile "public/models/mediapipe/face_landmarker.task"
```

Le fichier `.task` est ignore par Git.

### Suppression du fond RMBG-1.4

Le moteur de suppression de fond est RMBG-1.4 via ONNX Runtime Web. Il est
utilise localement dans le navigateur, avec WebGPU recommande et CPU/WASM en
fallback.

Assets attendus :

- modele recommande : `local-models/rmbg1.4/model_fp16.onnx`
- variantes RMBG-1.4 : `model.onnx`, `model_fp16.onnx`, `model_quantized.onnx`
- URLs servies par Vite en developpement :
  `/models/rmbg1.4/<nom-du-modele>.onnx`
- runtime ONNX : `public/ort/`

Les modeles ne sont pas telecharges automatiquement et ne sont pas committes.
Placez-les manuellement :

```powershell
New-Item -ItemType Directory -Force local-models/rmbg1.4

# Copier ensuite le modele recommande ici :
# local-models/rmbg1.4/model_fp16.onnx
#
# Variantes RMBG-1.4 optionnelles :
# local-models/rmbg1.4/model.onnx
# local-models/rmbg1.4/model_quantized.onnx
```

`local-models/` est ignore par Git et n'est pas copie dans `dist/`. Cela evite
de committer ou de recopier les modeles pendant le build Vite. En
developpement, le middleware Vite expose ces fichiers sous
`/models/rmbg1.4/*.onnx`.

Pour un deploiement statique, vous devez fournir le modele vous-meme a l'URL
`/models/rmbg1.4/<nom-du-modele>.onnx`, ou configurer une autre URL de modele
dans `src/background/rmbg-config.ts` avant build. Le depot ne telecharge pas le
modele et n'utilise pas Git LFS.

BRIA RMBG-1.4 est soumis a licence. Verifier les conditions d'usage, notamment
commercial, avant utilisation reelle.

### Backends fond

Dans le mode `Fond`, le selecteur `Backend fond` propose :

- `Auto GPU puis CPU` : tente WebGPU, puis CPU/WASM si WebGPU echoue ;
- `GPU WebGPU` : force WebGPU et affiche une erreur si la session echoue ;
- `CPU WASM` : force le backend WASM.

Les diagnostics techniques affichent WebGPU disponible, backend actif, provider
ONNX, temps de creation session, temps d'inference, taille d'entree modele,
taille du masque et noms input/output detectes.

## Guide d'utilisation

1. Importer des photos avec `Importer` ou `Importer des photos`.
2. Selectionner une photo dans le panneau gauche.
3. Mode `Cadrer` : ajuster zoom, position et rotation.
4. Activer le guide visage si necessaire.
5. Utiliser `Placer les points automatiquement` ou placer les points visage
   manuellement.
6. Cliquer `Cadrer a partir de points` si les points yeux, menton et sommet sont
   corrects.
7. Mode `Fond` : charger le modele, supprimer le fond, comparer les apercus,
   choisir la couleur et ajuster seuil/contour/lissage.
8. Mode `Qualite` : consulter le diagnostic et appliquer l'amelioration legere
   si utile.
9. Mode `Planche` : choisir standard ou confort, regler les copies par personne
   et verifier le total/capacite.
10. Mode `Export` : exporter la photo active, les fichiers separes, le ZIP, la
    planche A4 ou lancer l'impression.

Pour l'impression, choisir 100 %, sans ajustement a la page. La regle 10 cm en
bas de page sert a verifier l'absence de mise a l'echelle.

## Formats

- Photo individuelle : 35 x 45 mm, 300 dpi, JPEG, 413 x 531 px.
- Planche A4 : 210 x 297 mm, 300 dpi, 2480 x 3508 px.
- Marge A4 standard : 10 mm.
- Mode standard : 5 colonnes x 6 lignes = 30 photos.
- Mode confort : 5 colonnes x 5 lignes = 25 photos.

## Scripts

```powershell
npm run dev
npm run typecheck
npm run test
npm run build
npm run preview
npm run test:e2e
```

Validation recommandee avant livraison :

```powershell
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Les tests unitaires ne dependent pas de la presence d'un modele RMBG lourd.
Le test avec modele reel est optionnel et se skippe automatiquement si
`local-models/rmbg1.4/model_fp16.onnx` est absent.

## Architecture

- `src/core/` : formats, geometrie, projet photo, planche A4, nommage ;
- `src/canvas/` : rendus canvas photo, guide, planche, fond ;
- `src/ai/` : detection runtime, configuration session ONNX ;
- `src/background/` : configuration RMBG, preprocessing, runner, cache ;
- `src/vision/` : detection visage MediaPipe et analyse landmarks ;
- `src/quality/` : diagnostics et corrections qualite ;
- `src/export/` : exports batch et ZIP ;
- `src/print/` : page d'impression A4 ;
- `src/ui/` : shell desktop, panneaux et modes applicatifs.

La logique metier doit rester hors des composants React. Les calculs de format
passent par `src/core/photo-format.ts` et `src/core/print-layout.ts`.

## Depannage

### Le modele visage ne charge pas

Verifier :

- `public/models/mediapipe/face_landmarker.task` existe ;
- `public/models/mediapipe/wasm/` contient les fichiers WASM MediaPipe ;
- l'application est servie par Vite ou par le build, pas ouverte directement en
  fichier local.

### Le modele RMBG est introuvable

Verifier :

- `local-models/rmbg1.4/model_fp16.onnx` existe en developpement pour le moteur
  recommande, ou que le modele selectionne dans l'UI existe dans
  `local-models/rmbg1.4/` ;
- l'URL `/models/rmbg1.4/model_fp16.onnx` ou celle du modele selectionne ne
  renvoie pas `text/html` ;
- le fichier n'est pas une page HTML ou un placeholder ;
- le modele respecte un export ONNX compatible avec ONNX Runtime Web.

Si un modele est charge mais que la session ONNX echoue, utiliser le bouton
`Diagnostiquer session ONNX` dans le mode `Fond`. Il teste WebGPU, WASM,
`graphOptimizationLevel: disabled`, la creation depuis URL et depuis buffer, et
affiche l'erreur exacte pour chaque variante.

### Erreur de chargement `.wasm` ONNX

Verifier :

- `public/ort/ort-wasm-simd-threaded.wasm` existe ;
- `public/ort/ort-wasm-simd-threaded.mjs` existe ;
- pour WebGPU, les variantes `.jsep` peuvent aussi etre necessaires ;
- relancer `npm install`, puis recopier les assets `public/ort/` si besoin.

### WebGPU indisponible

Choisir `CPU WASM` dans `Backend fond`. Le traitement sera plus lent mais doit
rester local.

## Limites connues

- L'application vise les usages non officiels et ne garantit pas l'acceptation
  administrative d'une photo.
- La detection visage et la suppression de fond sont des aides ; verifier
  manuellement le menton, les yeux, le sommet du crane, les cheveux et contours.
- RMBG-1.4 est le seul moteur RMBG conserve dans l'application.
- Les modeles RMBG peuvent etre lents en CPU.
- Les cheveux fins, lunettes, accessoires, fonds proches des vetements, ombres
  fortes et photos floues doivent etre controles visuellement.
