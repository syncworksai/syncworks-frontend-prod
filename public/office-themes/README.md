# SyncWorks V18 — Four dedicated office environments

Upload the four full-size `.webp` files (not the `-preview` thumbnails) into the frontend GitHub repository:

`public/office-themes/`

Files and theme mapping:

| Appearance choice | Required asset |
| --- | --- |
| Classic Office | `public/office-themes/classic-office.webp` |
| SyncWorks Future | `public/office-themes/syncworks-future.webp` |
| Modern Dark | `public/office-themes/modern-dark.webp` |
| Clean Light | `public/office-themes/clean-light.webp` |

Source images are the exact user-uploaded photographs, resized only where useful and re-encoded for the web. The `*-preview.webp` images are optional thumbnails for the Appearance drawer.

The application code is prepared on GitHub branch `feat/customer-four-dedicated-office-scenes-v18` in a draft pull request. **Do not merge it until all four asset URLs load successfully.** Once assets are pushed to the branch, check the preview site and run CI before merging.

Test every theme: background visibly changes on selection, original interface remains intact, no giant SyncWorks logo appearing in the backdrop, no text unreadable, desktop at 100% and mobile layouts unaffected. Preserve current Games styling.

These four supplied images include different perspectives and working furniture, so background-position / brightness may need tuning against the actual responsive scene after the assets are live. 
