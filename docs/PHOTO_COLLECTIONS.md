# Photo collections

The 48 original photographs were reviewed visually and organized on October 2, 2026. Source folders are the Gallery's categories; filenames remain unchanged.

| Folder              | Photos | Visible subjects                                                                     |
| ------------------- | -----: | ------------------------------------------------------------------------------------ |
| Animals             |     22 | Animal portraits, birds, a butterfly, and a tortoise.                                |
| City & Architecture |     11 | Cityscapes, streets, traditional and modern buildings, and a monument.               |
| Desert              |      4 | Dunes, a camel caravan, and arid rock formations.                                    |
| Landscapes          |      7 | Mountains, lakes, open plains, waterside scenes, and wind turbines in the landscape. |
| Sky & Stars         |      3 | The moon framed by branches and two star-field photographs.                          |
| Details             |      1 | A close view of a car interior.                                                      |

Where subjects overlap, the dominant composition determines the folder. The distant camel caravan belongs with Desert; the butterfly and close bird photographs belong with Animals. The architecture beside a dune belongs with City & Architecture, while the statue is treated as a built-environment subject. No location, animal provenance, or capture date is inferred.

All 48 moved originals were verified against their pre-move SHA-256 hashes. They retain their names, formats, and contents. Local WebP derivatives and the recursive folder manifest are regenerated with `npm run prepare:gallery`; Home still consumes the same flat collection of all 48 photos. The recursive `photos/**` Git LFS rule keeps originals tracked through LFS after relocation.
