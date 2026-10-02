# Gallery rectangle tree sample

This demo began as an isolated copy of `src/components/galleryGeometry.ts` and now
contains experimental attachment rules. The main site does not import anything
from this sample. Rectangle geometry is independent of the gallery manifest.

Random attachment dimensions come from the listed aspect ratios and a continuous
square-equivalent scale. Width is `scale * sqrt(ratio)` and height is
`scale / sqrt(ratio)`. Each ratio starts at the scale where its shorter side is
70 px; there is no separate minimum-area rule. The maximum scale is 400 on
desktop and 320 below 700 px viewport width.

Run `npm run sample:gallery` and open `http://127.0.0.1:5174/`.
The first view tries up to 32 layouts to complete the root and its children.
Use **Next parent** or **Next generation** to watch BFS continue when it succeeds.
The inspector shows covered length on each of the selected rectangle's four sides.
A parent leaves the BFS queue only when all four sides have zero exposed length.
For each parent, concave corners are queued first. After every corner attachment,
the queue drops corners that were filled and gains any newly formed corners involving
that parent. Once the queue is empty, the generator checks all four sides; if one
still has exposed space, it chooses an exposed side for a random attachment and
updates the corner queue again.
For a queued corner, two outward rays start 1 px inside its empty quadrant and
look as far as the maximum possible dimension. Hit distances cap the dimensions
available for that corner. Creation-time hits set corner priority; fresh rays
set attachment bounds. The generator tries 25 random ratio/scale choices
inside those bounds. If all fail, it sets the dimension along the parent's side
to the nearer ray or adjoining edge-segment bound and tries every ratio. If those
fail, the final fallback uses the fresh ray distance in each direction and checks
only for collision with an existing rectangle. This last fallback can use a
dimension below 70 px and can bypass the new-corner ray and margin rules.
When a parent cannot place another rectangle, the generator removes the most
recent attachment and tries another choice. A fixed-dimension attachment is
removed without retrying it. Each random attachment gets up to 10 replacement
attempts before the search moves to an earlier attachment. Removing an attachment
also removes any later rectangles and rewinds BFS to its parent. Generation stops
only when no earlier choice remains. A single `processNext` call performs at most
25 backtracks before yielding to the next call.
Each candidate is checked at every new concave corner it creates. Two rays start
1 px into that corner's empty quadrant and travel outward along its edges; a hit
closer than the layout minimum rejects the candidate. After the rays pass, each
corner's signed margin against the adjoining rectangle must be zero or at least
the layout minimum in magnitude. Rectangles
keep their selected dimensions after attachment.
If backtracking exhausts the available choices, the demo displays the remaining
incomplete coverage.
