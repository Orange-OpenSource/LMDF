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

## Licence 

MIT License

## TODO

* inversion titre saison titre épisode.

* Homonymie : pousser à la recherche manuelle ; permettre de faire un lien manuel ? (fonctionnalité "C'était pas ça !")

* Inciter à la saisie manuelle, à la recherche manuelle des programmes visionnées

* commande / visualisation : comment ça fonctionne ? , qu'est-ce qu'on affiche, qu'est-ce qu'on explique ?

* gestion état du connecteur --> vérif l'existence / l'état.
* utiliser d'autres métadonnées (en plus du titre) pour retrouver précisément le programme visionné via livebox sur wikidata.


### Changelog

#### 3.0.13
* Fix bugs avec les vignettes.

#### 3.0.12
* Cacher la page "test de l'algo"
* Du ménage dans les messages, fix : message "film non trouvé apparaît subrepticement.
* Mise à jour automatique des détails des films, tous les mois.
* Fix upgrade sur mise à jour.

#### 3.0.11
* Migrations de données au changement de version : ré-examiner l'historique Orange pour les versions antérieures à 3.0.10 .

#### 3.0.10
* mettre un (i) devant et remonter + mettre en valeur le "comment ça marche"
* filtrer les - HD pour les commande aussi.
* fix algorithme deezer
* une mini page de comparatifs de différents algorithmes pour rechercher les infos sur deezer (une liste de titre de films --> qu'est-ce qui a été trouvé.)


#### 3.0.9
* trace d'usage
* logo en noir --> orange.
* affichage vignettes film si erreur chargement image
* récupération de plus de 100 éléments
* relecture de "comment ça marche"
