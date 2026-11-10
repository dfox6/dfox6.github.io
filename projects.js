// Builds the project cards and the photo viewer from window.PROJECTS
// (defined in projects.html). You shouldn't need to edit this file.
(function () {
  const projects = window.PROJECTS || [];
  const grid = document.getElementById('grid');
  const viewer = document.getElementById('viewer');
  const img = document.getElementById('viewer-img');
  const dots = document.getElementById('dots');
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  let current = null, index = 0;

  const stackIcon =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="4.5" y="1.5" width="10" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '<path d="M1.5 4.5v8.5a1.5 1.5 0 0 0 1.5 1.5h8.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

  projects.forEach((p, i) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card';
    card.innerHTML =
      '<div class="head"><h2></h2><p class="desc"></p></div>' +
      '<div class="photo"><img loading="lazy" alt=""></div>';
    card.querySelector('h2').textContent = p.title;
    card.querySelector('.desc').textContent = p.desc || '';
    const cover = card.querySelector('img');
    cover.src = p.photos[0];
    cover.alt = p.title;
    if (p.photos.length > 1) {
      const count = document.createElement('span');
      count.className = 'count';
      count.innerHTML = stackIcon + p.photos.length;
      card.querySelector('.photo').appendChild(count);
    }
    card.addEventListener('click', () => open(i));
    grid.appendChild(card);
  });

  function show(i) {
    const photos = current.photos;
    index = (i + photos.length) % photos.length;
    img.src = photos[index];
    img.alt = current.title + ', photo ' + (index + 1) + ' of ' + photos.length;
    const many = photos.length > 1;
    prev.hidden = !many;
    next.hidden = !many;
    dots.innerHTML = many ? photos.map((_, k) => '<span' + (k === index ? ' class="on"' : '') + '></span>').join('') : '';
  }

  function open(i) {
    current = projects[i];
    document.getElementById('viewer-title').textContent = current.title;
    document.getElementById('viewer-desc').textContent = current.desc || '';
    document.getElementById('viewer-more').textContent = current.more || '';
    show(0);
    document.documentElement.classList.add('locked');
    viewer.showModal();
  }

  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  document.getElementById('close').addEventListener('click', () => viewer.close());
  viewer.addEventListener('close', () => document.documentElement.classList.remove('locked'));

  // Click outside the box to close.
  viewer.addEventListener('click', (e) => { if (e.target === viewer) viewer.close(); });

  // Arrow keys flip through photos.
  viewer.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });

  // Swipe on phones.
  let touchX = null;
  img.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  img.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });
})();
