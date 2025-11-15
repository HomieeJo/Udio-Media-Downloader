// Request list of media URLs for current tab
document.addEventListener('DOMContentLoaded', async () => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const tabId = tabs[0].id;
  const resp = await browser.runtime.sendMessage({ type: 'GET_MEDIA_LIST', tabId });
  const list = resp && resp.urls ? resp.urls : [];

  const container = document.getElementById('list');
  container.innerHTML = '';

  list.forEach(url => {
    const div = document.createElement('div');
    div.className = 'item';

    const filename = (new URL(url)).pathname.split('/').pop() || url;

    const a = document.createElement('a');
    a.href = url;
    a.textContent = filename;
    a.target = '_blank';

    const btn = document.createElement('button');
    btn.textContent = 'Download';
    btn.onclick = () => {
      browser.runtime.sendMessage({ type: 'DOWNLOAD_URL', url, filename });
    };

    div.appendChild(a);
    div.appendChild(document.createElement('br'));
    div.appendChild(btn);
    container.appendChild(div);
  });

});
