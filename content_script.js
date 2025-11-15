(function() {
  const BUTTON_CLASS = 'mqdownloader-btn';

  function createButton() {
    const btn = document.createElement('button');
    btn.className = BUTTON_CLASS;
    btn.textContent = '⬇︎';
    Object.assign(btn.style, {
      position: 'absolute',
      zIndex: 2147483647,
      padding: '6px 8px',
      borderRadius: '6px',
      border: 'none',
      background: 'rgba(0,0,0,0.6)',
      color: 'white',
      fontSize: '14px',
      cursor: 'pointer'
    });
    return btn;
  }

  function addButtonToMedia(mediaEl) {
    if (mediaEl.__mq_hasButton) return;
    mediaEl.__mq_hasButton = true;

    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    // wrap the video only if its parent isn't positioned; try to avoid layout break but keep it simple
    const parent = mediaEl.parentNode;
    parent.replaceChild(wrapper, mediaEl);
    wrapper.appendChild(mediaEl);
    wrapper.style.width = mediaEl.style.width || (mediaEl.width ? mediaEl.width + 'px' : 'auto');

    const btn = createButton();
    wrapper.appendChild(btn);

    // place top-right
    function position() {
      btn.style.top = (mediaEl.offsetTop + 8) + 'px';
      btn.style.right = (8) + 'px';
      btn.style.position = 'absolute';
    }

    position();
    window.addEventListener('resize', position);

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();

      const src = mediaEl.currentSrc || mediaEl.src;
      if (src && !src.startsWith('blob:')) {
        // quick download via anchor (some sites restrict cross-origin downloads; background download is fallback)
        try {
          // try direct download in page
          const a = document.createElement('a');
          a.href = src;
          a.download = (new URL(src)).pathname.split('/').pop() || 'media';
          document.body.appendChild(a);
          a.click();
          a.remove();
          return;
        } catch (err) {
          console.warn('direct download failed, falling back to background download', err);
        }
      }

      if (src && src.startsWith('blob:')) {
        // try to fetch blob URL from page context by injecting a small script because content scripts can't always fetch blob: URLs created in page origin.
        try {
          const fetched = await fetch(src).then(r => r.blob());
          const url = URL.createObjectURL(fetched);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'video.mp4';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
          return;
        } catch (err) {
          console.warn('fetch(blob) failed, will try background-captured URL', err);
        }
      }

      // last resort: ask background for last-seen media URL for this tab
      const resp = await browser.runtime.sendMessage({ type: 'GET_LAST_MEDIA' });
      if (resp && resp.url) {
        // ask background to initiate the download to avoid CORS issues
        const filename = (new URL(resp.url)).pathname.split('/').pop() || undefined;
        const result = await browser.runtime.sendMessage({ type: 'DOWNLOAD_URL', url: resp.url, filename });
        if (result && result.error) {
          alert('Download failed: ' + result.error);
        }
      } else {
        alert('Could not determine a downloadable URL for this media. If the site uses encrypted streaming (MSE / DRM) or obscures segments, this tool may not be able to grab the original file.');
      }
    });
  }

  function scanAndAdd() {
    const medias = Array.from(document.querySelectorAll('video, audio'));
    medias.forEach(addButtonToMedia);
  }

  // initial scan
  scanAndAdd();

  // dynamic pages: watch for new media elements
  const mo = new MutationObserver(scanAndAdd);
  mo.observe(document, { childList: true, subtree: true });
})();