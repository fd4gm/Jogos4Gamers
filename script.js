document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('[data-game-card]');
  const counter = document.querySelector('#game-count');
  if (counter) counter.textContent = `${cards.length} jogos`;
});
