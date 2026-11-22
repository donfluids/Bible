# Work in progress: two more Malayalam Bibles

`malayalam-bibles.patch` holds the unfinished change that adds the Malayalam Indian Revised
Version (IRV) and the Open Malayalam Contemporary Version (OMCV) to the Malayalam app: the
database build (both Bibles, joined verses, the gzipped database), the app (names, licences,
read aloud and search by script, joined verses shown), and the install step that unpacks the
database (package.json postinstall, metro.config.js, .gitignore).

It is kept as a patch, not applied, because it needs the finished word alignment
(data/align/omcv, data/align/irv) and a rebuilt database. To continue:

    git apply docs/wip/malayalam-bibles.patch
    node scripts/align.mjs --lang omcv --compound --effort high --all --concurrency 6 --commit-every 0
    node scripts/align.mjs --lang irv --compound --effort high --verses data/align/irv-to-align.json --concurrency 6 --commit-every 0
    node --no-warnings scripts/build-db.mjs ml
    git rm --cached assets/db/bible-ml.db && git add assets/db/bible-ml.db.gz

then the checks (tsc, npm test, check-data --update, smoke ml), and delete this folder.
