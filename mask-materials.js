// Paint the gallery's mask motifs onto the geometry's planar texture coordinates.
function paintStudioMask(mask) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.scale(canvas.width / 1000, canvas.height / 1000);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  function metal(...colors) {
    const gradient = ctx.createLinearGradient(220, 30, 720, 850);
    colors.forEach((color, index) => gradient.addColorStop(index / (colors.length - 1), color));
    return gradient;
  }

  function fabric(center, edge) {
    const gradient = ctx.createRadialGradient(420, 335, 40, 525, 470, 620);
    gradient.addColorStop(0, center);
    gradient.addColorStop(1, edge);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1000, 1000);
  }

  function panel(shape, fill, stroke, width = 6) {
    const path = new Path2D(shape);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill(path);
    }
    if (stroke) {
      ctx.lineWidth = width;
      ctx.strokeStyle = stroke;
      ctx.stroke(path);
    }
  }

  function bothSides(draw) {
    draw();
    ctx.save();
    ctx.translate(1000, 0);
    ctx.scale(-1, 1);
    draw();
    ctx.restore();
  }

  const silver = metal("#69717d", "#fffaf0", "#9aa9ba", "#5c6570", "#d4d2d5");
  const pearl = metal("#b0a7a9", "#fbefe2", "#d4d1d1", "#f7eee8", "#89909b");
  const gold = metal("#8b4904", "#ffe27d", "#d6871f", "#f2cf61", "#6a331b");
  const red = metal("#7f0a18", "#fa4248", "#a10920", "#e73539", "#630e17");
  const eyeHole = "M 253 398 Q 271 372 326 374 Q 381 373 411 401 Q 395 428 332 432 Q 281 430 253 411 Z";
  const lipHole = "M 360 699 Q 388 668 449 653 Q 477 644 500 651 Q 527 644 553 654 Q 614 671 640 699 Q 621 738 555 752 Q 500 765 445 752 Q 379 739 360 699 Z";
  const noseHole = "M 500 493 C 528 492 543 525 563 552 Q 582 583 556 603 Q 500 625 445 603 Q 421 587 439 556 C 456 529 472 494 500 493 Z";
  let mouth = lipHole;

  switch (mask) {
    case "rey":
      fabric("#262936", "#07080d");
      bothSides(() => {
        panel("M 404 88 Q 346 147 465 160 L 456 190 Q 330 166 344 104 Z", gold, "#473815", 5);
        panel("M 325 150 Q 320 215 449 213 L 446 252 Q 305 239 272 188 Z", gold, "#473815", 6);
        panel("M 268 224 Q 328 295 429 278 L 411 323 Q 292 334 210 256 Z", gold, "#44300c", 7);
        panel("M 187 263 Q 268 350 416 327 L 489 408 L 477 577 L 428 528 Q 388 488 294 493 Q 210 500 201 417 Z", silver, "#292a34", 15);
        panel("M 206 304 Q 272 371 407 345 L 468 414 L 462 549 L 431 515 Q 383 472 293 479 Q 229 480 220 414 Z", null, "#ebe6e2", 4);
        panel("M 218 525 Q 298 549 389 509 Q 382 603 294 635 Q 268 695 301 752 Q 256 720 226 652 Z", silver, "#252932", 13);
        panel("M 299 568 Q 340 551 366 549 Q 342 593 301 607 L 286 594 Z", gold, "#413016", 5);
        panel("M 296 711 Q 343 731 378 816 Q 399 863 453 890 L 437 925 Q 357 890 330 828 Q 303 781 270 767 Z", silver, "#282c36", 11);
        panel("M 309 754 Q 350 771 366 822 Q 328 806 305 778 Z", gold);
      });
      panel("M 486 105 Q 450 167 477 252 L 469 341 Q 478 399 500 452 Q 532 422 532 364 L 527 280 Q 571 232 570 162 Q 550 92 486 105 Z", silver, "#312e30", 10);
      panel("M 470 166 C 470 135 539 130 549 162 C 563 204 490 203 498 257 L 512 325", null, "#65522a", 24);
      panel("M 470 166 C 470 135 539 130 549 162 C 563 204 490 203 498 257 L 512 325", null, gold, 17);
      panel("M 513 357 L 514 369", null, gold, 17);
      panel("M 500 454 L 500 547", null, "#888c9d", 7);
      mouth = "M 500 611 Q 577 608 630 667 Q 630 717 604 748 Q 537 803 500 836 Q 459 804 395 748 Q 368 714 370 667 Q 422 610 500 611 Z";
      break;

    case "blue-demon":
      fabric("#163c9d", "#070e32");
      bothSides(() => {
        panel("M 224 227 Q 250 337 343 344 Q 437 346 483 388 L 500 475 L 449 553 Q 404 509 324 500 Q 234 509 211 427 Q 195 355 224 227 Z", silver, "#34385a", 10);
        panel("M 229 257 Q 256 348 350 357 Q 433 358 479 397", null, "#e2e9fa", 5);
        panel("M 443 477 Q 413 524 401 575 Q 410 623 491 621 L 500 674 L 369 679 Q 338 646 351 593 Q 372 526 403 492 Z", silver, "#313b63", 7);
        panel("M 184 252 Q 157 481 233 608 Q 246 771 403 902", null, "#4262ad", 4);
      });
      panel(noseHole, null, silver, 18);
      panel("M 343 667 Q 360 627 500 630 Q 641 628 659 671 Q 686 777 611 808 Q 500 855 393 811 Q 326 782 343 667 Z", silver, "#202956", 14);
      panel("M 364 679 Q 367 651 500 647 Q 631 650 637 682 Q 667 772 600 791 Q 500 829 402 794 Q 341 771 364 679 Z", null, "#e6ecf6", 4);
      break;

    case "mil-mascaras":
      fabric("#e1dfdb", "#777d8c");
      bothSides(() => {
        panel("M 477 34 Q 326 39 207 253 Q 249 221 289 205 Q 338 127 477 62 Z", "#111319");
        panel("M 463 82 Q 354 99 264 250 Q 312 230 345 224 Q 394 146 463 115 Z", "#242833");
        panel("M 224 264 Q 268 305 391 345 Q 435 377 452 441 L 406 522 Q 451 522 463 579 Q 485 643 410 659 Q 394 703 319 779 Q 328 697 323 669 L 281 713 L 292 625 L 248 663 Q 253 554 221 507 Q 162 423 224 264 Z", "#121417", "#6e7781", 6);
        panel("M 233 328 Q 248 421 217 462 L 253 521 L 234 465 Q 269 411 233 328 Z", silver);
        panel("M 332 555 Q 314 624 281 649 Q 324 641 348 598 Z", silver);
        panel("M 380 576 Q 359 669 326 711 Q 384 688 396 622 Z", silver);
      });
      panel("M 414 174 L 460 190 L 500 253 L 539 190 L 586 174 L 576 310 L 546 333 L 552 241 L 500 304 L 447 241 L 455 332 L 422 311 Z", red, "#3d252c", 7);
      panel("M 356 665 Q 388 628 500 632 Q 612 628 645 666 L 655 750 L 591 820 L 529 831 L 500 868 L 470 831 L 407 820 L 346 750 Z", "#15171c", silver, 9);
      break;

    case "mistico":
      fabric("#e5e1db", "#818792");
      bothSides(() => {
        panel("M 182 251 L 216 221 L 328 351 L 295 367 Z M 250 179 L 292 159 L 375 323 L 342 335 Z M 338 129 L 381 115 L 428 306 L 394 315 Z", gold, "#6c512d", 6);
        panel("M 201 297 Q 267 339 337 347 L 443 322 Q 457 310 477 335 L 500 419 L 500 608 Q 439 615 396 555 Q 335 518 279 495 Q 208 475 198 410 Z", gold, "#584025", 12);
        panel("M 214 324 Q 331 394 424 351 Q 459 337 470 383 L 484 432 L 484 584 Q 422 579 404 530 Q 350 505 282 479 Q 221 459 218 410 Z", null, "#fff2a3", 5);
        panel("M 251 531 L 326 554 L 319 581 L 232 562 Z M 233 607 L 341 590 L 360 618 L 252 644 Z M 271 684 L 372 636 L 393 658 L 299 720 Z M 323 758 L 409 684 L 434 702 L 359 799 Z M 402 830 L 452 719 L 480 727 L 442 855 Z", gold, "#725836", 6);
      });
      panel("M 476 115 L 525 115 L 523 314 L 501 339 L 478 314 Z", gold, "#735728", 6);
      panel("M 502 372 Q 524 447 548 518 Q 538 574 500 589 Q 454 579 453 521 Z", pearl, "#6f552b", 10);
      panel("M 488 737 L 512 737 L 523 868 L 477 868 Z", gold, "#705530", 5);
      mouth = null;
      break;

    case "penta":
      fabric("#29242c", "#09070d");
      panel("M 155 166 Q 377 123 500 137 Q 651 121 846 167 L 836 325 Q 710 311 619 344 Q 549 355 500 323 Q 433 357 363 344 Q 279 315 165 322 Z", pearl, "#231820", 10);
      bothSides(() => {
        panel("M 181 282 L 234 306 L 207 540 L 250 692 L 219 687 Q 174 601 177 511 Z M 242 466 L 283 498 L 293 575 L 257 664 L 250 584 L 265 521 Z M 305 487 L 346 510 L 320 552 L 329 616 L 304 653 L 298 574 Z M 379 500 L 420 468 L 450 508 L 392 559 L 373 634 L 354 613 Z", silver, "#3c2733", 5);
        panel("M 196 287 Q 259 332 402 335 L 479 391 Q 438 482 391 514 Q 318 510 251 484 Q 216 457 196 287 Z", "#101117", red, 14);
        panel(eyeHole, null, pearl, 24);
        panel("M 218 314 L 251 361 L 240 484 L 218 529 L 227 442 Z M 340 523 L 366 507 L 343 556 L 354 614 L 330 649 L 339 593 L 326 553 Z", red);
        panel("M 275 737 L 303 684 L 309 752 L 350 812 L 350 856 Q 293 823 275 737 Z", silver, "#2b1725", 6);
      });
      panel("M 500 120 L 520 179 L 580 157 L 548 213 L 601 247 L 540 255 L 554 316 L 506 272 L 446 313 L 467 254 L 404 233 L 470 216 L 455 153 L 495 181 Z", red, "#ede2d3", 7);
      panel("M 484 474 L 509 473 L 553 561 L 527 589 L 501 574 L 471 590 L 442 568 Z", pearl, "#1a141f", 9);
      mouth = "M 500 608 Q 593 622 637 672 Q 638 729 584 772 Q 535 817 500 835 Q 463 816 415 773 Q 360 729 360 673 Q 416 622 500 608 Z";
      panel(mouth, null, pearl, 38);
      break;

    case "templario":
      fabric("#e5edf1", "#728497");
      bothSides(() => {
        panel("M 207 290 Q 331 278 482 328 L 489 371 Q 326 332 194 351 Z", red, "#832624", 8);
        panel("M 191 447 Q 330 460 483 421 L 487 471 Q 339 522 186 496 Z", red, "#84292b", 9);
        panel("M 227 298 Q 365 299 462 334 M 209 483 Q 337 497 457 465", null, "#ffa49a", 3);
        panel(eyeHole, null, pearl, 22);
      });
      panel("M 500 147 L 566 211 L 552 321 L 545 699 L 521 857 L 499 896 L 476 862 L 449 699 L 445 321 L 432 214 Z", red, "#851d27", 10);
      panel("M 500 197 L 520 237 L 514 808 L 501 845 L 484 806 L 481 238 Z", gold, "#8c3222", 6);
      panel("M 500 231 L 500 806", null, "#fff4b2", 4);
      mouth = null;
      break;
  }

  bothSides(() => {
    panel("M 486 47 Q 302 58 190 273 Q 123 395 169 520 Q 176 660 277 766 Q 325 856 476 923", null, "#aca4af50", 4);
    ctx.setLineDash([2, 9]);
    panel("M 486 61 Q 318 67 200 281 Q 145 405 181 519 Q 192 655 289 757 Q 344 855 478 914", null, "#f6d8d35c", 3);
    ctx.setLineDash([]);
  });

  if (mask !== "penta" && mask !== "templario") {
    bothSides(() => panel(eyeHole, null, "#16121ac2", 15));
  }
  if (mouth && mask !== "penta") panel(mouth, null, "#16121ab2", 14);

  // Fine crosshatch gives the colored panels the look of woven fabric.
  const weave = document.createElement("canvas");
  weave.width = weave.height = 6;
  const thread = weave.getContext("2d");
  thread.fillStyle = "#fff2";
  thread.fillRect(0, 0, 3, 1);
  thread.fillRect(3, 3, 3, 1);
  thread.fillStyle = "#0002";
  thread.fillRect(1, 1, 3, 1);
  thread.fillRect(0, 4, 3, 1);
  ctx.fillStyle = ctx.createPattern(weave, "repeat");
  ctx.fillRect(0, 0, 1000, 1000);

  ctx.globalCompositeOperation = "destination-out";
  bothSides(() => panel(eyeHole, "#000"));
  if (mask === "blue-demon") panel(noseHole, "#000");
  if (mouth) panel(mouth, "#000");
  return canvas;
}
