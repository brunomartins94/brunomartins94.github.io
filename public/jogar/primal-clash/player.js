const player = document.querySelector('#player');
const button = document.querySelector('#fullscreen');
const status = document.querySelector('#player-status');
if (!document.fullscreenEnabled) button.hidden = true;
button.addEventListener('click', async () => {
  try {
    await player.requestFullscreen();
    document.querySelector('#game-frame').focus();
    status.textContent = '';
  } catch {
    status.textContent = 'Tela cheia indisponível. Você pode usar “Abrir jogo diretamente”.';
  }
});
