# Conversion Regression Fixture

This Markdown file exists to exercise the `convertMarkdownToPDF` path end to end.
It is intentionally long enough to span several A4 pages so the page-slicing
(`pageOffsets`) logic is genuinely exercised — a single-page document would not
prove that multi-page tiling still works after the rasterise-and-slice rewrite.

## Section 1 — Introduction

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
culpa qui officia deserunt mollit anim id est laborum.

Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius,
turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis
sollicitudin mauris. Integer in mauris eu nibh euismod gravida.

## Section 2 — Body

Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit. Etiam
tempor. Ut ullamcorper, ligula eu tempor congue, eros est euismod turpis, id
tincidunt sapien risus a quam. Maecenas fermentum consequat mi. Donec fermentum.

- First list item with a reasonable amount of text to occupy vertical space.
- Second list item, again padded out so the content flows across page bounds.
- Third list item to push the layout further down the page.
- Fourth list item continuing the trend toward a page break.
- Fifth list item rounding out the unordered list.

Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac
turpis egestas. Proin pharetra nonummy pede. Mauris et orci. Aenean nec lorem.
In porttitor. Donec laoreet nonummy augue. Suspendisse dui purus, scelerisque at,
vulputate vitae, pretium mattis, nunc.

## Section 3 — Details

Mauris eget neque at sem venenatis eleifend. Ut nonummy. Fusce aliquet pede non
pede. Suspendisse dapibus lorem pellentesque magna. Integer nulla. Donec blandit
feugiat ligula. Donec hendrerit, felis et imperdiet euismod, purus ipsum
pretium metus, in lacinia nulla nisl eget sapien.

Nam at tortor in tellus interdum sagittis. Aliquam purus turpis, dignissim quis,
gravida ut, fermentum eu, leo. Quisque sit amet velit. Etiam mollis. Nullam
elementum, urna vel imperdiet sodales, elit ipsum pharetra ligula, ac pretium
ante justo a nulla.

## Section 4 — More Body

Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor.
Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas
porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa.

1. Ordered item one, with enough text to take a meaningful slice of the page.
2. Ordered item two, continuing to fill vertical space toward another break.
3. Ordered item three, ensuring the document comfortably exceeds two pages.
4. Ordered item four, padding the layout further still.

Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus,
ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum
velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra.

## Section 5 — Conclusion

Per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim
lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque
sem at dolor. Maecenas mattis. Sed convallis tristique sem.

This final paragraph closes out the fixture, by which point the rendered output
should comfortably occupy multiple A4 pages.
