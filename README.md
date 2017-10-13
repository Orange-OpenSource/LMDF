# La musique de mes films

Re-découvrez la musique des films que vous avez regardés sur votre LiveBox Orange grâce à cette application Cozy réalisée par Orange.

Cette application gérera votre bibliothèque de films. que ce soit les films que vous avez vu depuis votre Livebox Orange (VOD ou Replay) récupérés dans votre Cozy grâce au connecteur Orange_VOD, ou des film que vous avez ajouté manuellement ; l'application y ajoutera automatiquement les métadonnées associées, ainsi que les bande original. Vous pourrez alors les écouter sur Deezer.

## Developper / contribuer

### Build

L'application utilise brunch préparer le code à la publication. Les outils suivants sont à disposition :

```
npm install # installer les outils de build

npm run watch # compilation en continue (pour le développement)
npm run lint # vérifie le respect des normes d'écritues du code.
npm run build # compile pour le déploiement.
```

### Bibliothèque

L'application est écrite en es6, et s'appuie sur les bibliothèque suivante (cf /vendors )

* Marionette (ie backbonejs, underscode, jquery)
* cozy-browser-sdk
* [wikidata-sdk](https://github.com/maxlath/wikidata-sdk)
* momentjs
* jade (moteur de templates)

### Architecture

Le point d'entrée de l'application est `index.html` > `app/application.js`

## Licence TODO.

## TODO


* gestion état du connecteur --> vérif l'existence / l'état.


### Changelog

#### 3.0.10
* fix algorithme deezer
* filtrer les - HD pour les commande aussi.

#### 3.0.9
* trace d'usage
* logo en noir --> orange.
* affichage vignettes film si erreur chargement image
* récupération de plus de 100 éléments
* relecture de "comment ça marche"
