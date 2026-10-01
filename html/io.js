(() => {
  'use strict';

  let ctx = null;

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadText(filename, text) {
    downloadBlob(
      filename,
      new Blob([text], { type: 'text/plain;charset=utf-8' })
    );
  }

  function downloadJson(filename, data) {
    downloadBlob(
      filename,
      new Blob(
        [JSON.stringify(data, null, 2)],
        { type: 'application/json;charset=utf-8' }
      )
    );
  }

  function buildImageExportRecord(image) {
    return {
      ...image,
      image: `${image.c}.dzi`,
      imageId: image.c,
      done: ctx.isDone(image.c),
      annotations:
        ctx.state.annotations.get(image.c) ||
        ctx.loadAnnotations(image.c),
    };
  }

  function exportCard() {
    const image = ctx.getCurrentImage();
    if (!image) return;

    const annotations =
      ctx.state.annotations.get(image.c) ||
      ctx.loadAnnotations(image.c);

    const lines = [
      `${ctx.t('code')}: ${image.c}`,
      `${ctx.t('description')}: ${image.pa || ''}`,
      `${ctx.t('annotationList')}:`,
    ];

    if (!annotations.length) {
      lines.push(`- ${ctx.t('noAnnotations')}`);
    } else {
      for (const annotation of annotations) {
        const label = annotation.label || ctx.t('untitled');
        const note = annotation.note
          ? `: ${annotation.note.replace(/\r?\n/g, ' ')}`
          : '';
        lines.push(`- ${label}${note}`);
      }
    }

    downloadText(
      `${ctx.t('cardFilename')}.txt`,
      lines.join('\n') + '\n'
    );
  }

  function exportBackup() {
    const batch = ctx.getCurrentBatch();
    const images = ctx.getImages().map(buildImageExportRecord);

    downloadJson(
      ctx.t('backupFilename', batch || 'batch'),
      {
        batch,
        sourceManifest: batch
          ? `json/images-${batch}.json`
          : null,
        exportedAt: new Date().toISOString(),
        images,
      }
    );
  }

  async function restore(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);

      if (!payload || !Array.isArray(payload.images)) {
        throw new Error('JSON must contain an "images" array');
      }

      let imported = 0;

      for (const record of payload.images) {
        const code = record?.c ?? record?.imageId;
        if (!code) continue;

        const annotations = Array.isArray(record.annotations)
          ? record.annotations
          : [];

        ctx.state.annotations.set(code, annotations);
        ctx.saveAnnotationsFor(code, annotations);

        if ('done' in record) {
          const done = Boolean(record.done);
          ctx.state.done.set(code, done);
          ctx.saveDone(code, done);
        } else if (record.completed !== undefined) {
          const done = Boolean(record.completed);
          ctx.state.done.set(code, Boolean(record.completed));
          ctx.saveDone(code, done);
        }

        imported += 1;
      }

      ctx.renderImageList();
      ctx.renderAnnotationList();
      ctx.renderAnnotations();
      ctx.renderDoneControl();
      ctx.setStatus(ctx.t('importSuccess', imported));
    } catch (error) {
      ctx.setStatus(ctx.t('importError', error.message));
      console.error('Restore error:', error);
    } finally {
      ctx.els.importAllInput.value = '';
    }
  }

  function toggleMenu() {
    const hidden = ctx.els.exportMenu.classList.toggle('hidden');
    ctx.els.exportMenuBtn.setAttribute(
      'aria-expanded',
      hidden ? 'false' : 'true'
    );
  }

  function closeMenu() {
    ctx.els.exportMenu.classList.add('hidden');
    ctx.els.exportMenuBtn.setAttribute('aria-expanded', 'false');
  }

  function init(context) {
    ctx = context;

    ctx.els.exportCurrentTxtBtn.addEventListener(
      'click',
      () => {
        closeMenu();
        exportCard();
      }
    );

    ctx.els.exportAllBtn.addEventListener(
      'click',
      () => {
        closeMenu();
        exportBackup();
      }
    );

    ctx.els.importAllBtn.addEventListener(
      'click',
      () => ctx.els.importAllInput.click()
    );

    ctx.els.importAllInput.addEventListener(
      'change',
      (event) => {
        const file = event.target.files?.[0];
        closeMenu();
        restore(file);
      }
    );

    ctx.els.exportMenuBtn.addEventListener(
      'click',
      toggleMenu
    );

    document.addEventListener(
      'click',
      (event) => {
        if (
          !ctx.els.exportMenu.contains(event.target) &&
          event.target !== ctx.els.exportMenuBtn
        ) {
          closeMenu();
        }
      }
    );
  }

  window.DZIIO = {
    init,
    exportCard,
    exportBackup,
    restore,
  };
})();
