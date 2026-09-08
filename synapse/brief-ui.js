// Preserve previously shared root URLs that selected a vault note.
if (/^#(?:\/|%2f)/i.test(location.hash)) location.replace('/graph.html' + location.hash);
const status = document.querySelector('#copy-status');
for (const button of document.querySelectorAll('[data-copy], [data-copy-prompt]')) {
  button.addEventListener('click', async () => {
    const value = button.dataset.copy ?? document.querySelector('#ai-prompt').value;
    try { await navigator.clipboard.writeText(value); status.textContent = 'Copied'; }
    catch { status.textContent = 'Copy unavailable. Select the visible text to copy it.'; }
    setTimeout(() => { status.textContent = ''; }, 4000);
  });
}
