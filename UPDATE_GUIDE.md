# Update and rollback guide

The prepared update is version **0.8.0**. The starting repository commit is `4778f5a`. The backup ZIP and full-history Git bundle are supplied separately from this repository.

The owner requested that the original **0.7.0 README and all webpage wording remain unchanged**. The supplied README is the original file, and the page deliberately retains its **0.7.0** heading while loading the updated runtime. The README's descriptions, including its former clone-backend explanation, therefore reflect 0.7.0; use the changelog and technical documentation for current behavior.

The owner is signed into GitHub, and staging on `update-0.8.0` is in progress. These instructions also support a manual upload; they do not establish that the live site has been updated.

## Upload through GitHub

1. Download and extract `penpa_spoiler-0.8.0.zip`.
2. Sign into GitHub and open https://github.com/cyddrdrd/penpa_spoiler.
3. Use the branch selector above the file list to select `update-0.8.0`. If it does not exist, create it from `main`.
4. Choose **Add file → Upload files**. Upload the **contents** of the extracted folder, not an enclosing `penpa_spoiler-0.8.0` folder. The files `index.html`, `page.js`, and `converter.js` must remain at the repository root. Include the documentation, `package.json`, and `tests` folder so the fixes and regression tests stay together.
5. Commit the upload to `update-0.8.0`. Review the changed files and confirm that `README.md` exactly matches commit `4778f5a` and all original webpage wording remains intact. If an earlier upload replaced the README, include the supplied original README to restore it. The live main branch is still available while you review.
6. Open a pull request from `update-0.8.0` into `main`. Merge it when ready to publish. GitHub Pages will rebuild using the repository's existing configuration.
7. Open https://cyddrdrd.github.io/penpa_spoiler/ and reload. The heading should still read **Penpa+ Spoiler 0.7.0**. Check that the page source loads `converter.js?v=0.8.0` and `page.js?v=0.8.0`; the preserved heading alone cannot identify the runtime version. Try one ordinary answer-check link and one saved-progress link, then open both generated results.

No Cloudflare Worker update is required. The existing TinyURL and logging Workers remain configured; the clone Worker is no longer needed for conversion.

If you only want the runtime update, upload the three root files `index.html`, `page.js`, and `converter.js` together. Uploading the documentation and tests as well is recommended.

The preserved webpage converts the first OR answer alternative. Alternative selection and recovery warnings are available through `convertPenpaUrlDetailed(input, { alternativeIndex })`; the page contains no added selector, conversion notes, or new explanatory wording.

## Optional local check

With Node.js 18 or later installed, open a terminal in the extracted folder and run:

```sh
npm test
```

No package installation is required. To view the web page locally, serve the folder with a static web server; for example, if Python 3 is available:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Then open http://127.0.0.1:8080. Stop that server with Ctrl+C when finished.

## Roll back

The original files remain in `penpa_spoiler-before-2026-09-06.zip`, and the complete original Git history is in `penpa_spoiler-before-2026-09-06.bundle`.

The simplest GitHub rollback is the **Revert** button on the merged pull request: create and merge its revert pull request. Alternatively, extract the backup ZIP and upload the original `index.html`, `page.js`, and `converter.js` together onto a rollback branch, then merge it. Do not mix runtime files from different versions.

For a full independent recovery with Git:

```sh
git clone penpa_spoiler-before-2026-09-06.bundle restored-penpa-spoiler
```

## Release status

The update is not 1.0.0. The converter can reconstruct the checked information it understands, but information absent from Penpa's answer-check payload cannot be recovered. See `PROGRESS.md` and `docs/FORMAT_AUDIT.md` for the verified scope and limits.
