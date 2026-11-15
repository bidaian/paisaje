(() => {
  'use strict';

  const BATCHES = [
    ...Array.from({ length: 72 }, (_, i) => `1920-${String(i + 1).padStart(2, '0')}`),
    ...Array.from({ length: 38 }, (_, i) => `1930-${String(i + 1).padStart(2, '0')}`),
  ];

  const state = {
    images: [],
    current: null,
    currentBatch: null,
    annotations: new Map(),
    tool: 'select',
    selectedId: null,
    drawing: null,
    overlayElements: new Map(),
    showAnnotations: true,
    done: new Map(),
    imageFields: new Map(),
    lexicalFields: [],
    language: localStorage.getItem('dzi-annotator:language') || 'es',
  };

  const els = {};
  const $ = (id) => document.getElementById(id);
  let viewer = null;

  const I18N = {
    en: {
      title: 'EFI: Lengua, migración y paisaje lingüístico',
      backup: 'Backup',
      exportMenu: 'Menu',
      restore: 'Restore',
      importSuccess: (count) => `Imported ${count} image records.`,
      importError: (msg) => `Import error: ${msg}`,
      imageBatch: 'Image batch',
      chooseBatch: 'Choose a batch.',
      images: 'Images',
      filter: 'Filter…',
      statusFilter: 'Status',
      all: 'All',
      doneOnly: 'Done',
      notDone: 'Not done',
      doneCount: (n) => `${n} done`,
      undoneCount: (n) => `${n} undone`,
      selectImage: 'Select an image',
      noDescription: 'No description',
      explore: 'Explore',
      addAnnotation: 'Add annotation',
      annotations: 'Annotations',
      lexicalField: 'Lexical field',
      lexicalCustom: 'Add custom terms, separated by commas…',
      lexicalPossibilities: 'Possibilities',
      addLexicalPossibility: 'Add a lexical field possibility',
      lexicalFieldsLoadError: (msg) => `Could not load lexical_fields.txt: ${msg}`,
      drawRectangle: 'Draw a rectangle to create an annotation.',
      dragRectangle: 'Drag on the image to draw a rectangle',
      optionalNote: 'Optional note…',
      annotationText: 'Annotation text',
      annotationLanguage: 'Language',
      deleteAnnotation: 'Delete annotation',
      ready: 'Ready',
      zoom: 'Zoom',
      imageStart: 'Select an image to begin',
      loadBatchStatus: (batch) => `Loading ${batch}…`,
      loadingManifest: (batch) => `Loading images-${batch}.json…`,
      manifestLoaded: (count, batch) => `${count} image${count === 1 ? '' : 's'} loaded from images-${batch}.json`,
      imagesAvailable: (count) => `${count} image${count === 1 ? '' : 's'} available`,
      loaded: (count) => `${count} image${count === 1 ? '' : 's'} available`,
      noMatch: 'No images match the filter.',
      noDoneMatch: 'No completed images match the filter.',
      noNotDoneMatch: 'No unfinished images match the filter.',
      noImages: 'The loaded manifest contains no images.',
      loadImagesFirst: 'Load an image batch to populate this list.',
      opening: (code) => `Opening ${code}.dzi…`,
      reading: (code) => `Reading ${code}.dzi…`,
      loadedDzi: (code) => `Loaded ${code}.dzi`,
      couldNotLoadManifest: (batch, msg) => `Could not load images-${batch}.json: ${msg}`,
      couldNotOpenDzi: (code, msg) => `Could not open ${code}.dzi: ${msg}`,
      manifestError: (msg) => `Manifest error: ${msg}`,
      dziError: (msg) => `DZI error: ${msg}`,
      tileFailed: (url) => `Tile failed to load: ${url}`,
      dimensions: (w, h) => `${w} × ${h} px`,
      removeAllConfirm: (count, code) => `Remove all ${count} annotations from ${code}?`,
      region: (n) => `Region ${n}`,
      newRegion: 'New region',
      untitled: 'Untitled',
      code: 'code',
      description: 'description',
      annotationList: 'annotations',
      noAnnotations: '(none)',
      exportText: 'Export card',
      cardFilename: 'card',
      backupFilename: (batch) => `backup-${batch}.json`,
      language: 'Language',
      english: 'English',
      spanish: 'Spanish',
      portuguese: 'Portuguese',
      visibilityOn: 'Annotations visible',
      visibilityOff: 'Annotations hidden',
      done: 'Done',
      location: 'Location',
      geolocation: 'Geolocation',
      authorship: 'Authorship',
      date: 'Date',
      sourceCode: 'Topographic signature or source code',
    },
    es: {
      title: 'EFI: Lengua, migración y paisaje lingüístico',
      backup: 'Respaldo',
      exportMenu: 'Menú',
      restore: 'Restaurar',
      importSuccess: (count) => `Se importaron ${count} registros de imágenes.`,
      importError: (msg) => `Error de importación: ${msg}`,
      imageBatch: 'Lote de imágenes',
      chooseBatch: 'Elige un lote.',
      images: 'Imágenes',
      filter: 'Filtrar…',
      statusFilter: 'Estado',
      all: 'Todas',
      doneOnly: 'Hechas',
      notDone: 'No hechas',
      doneCount: (n) => `${n} hechas`,
      undoneCount: (n) => `${n} no hechas`,
      selectImage: 'Selecciona una imagen',
      noDescription: 'Sin descripción',
      explore: 'Explorar',
      addAnnotation: 'Añadir anotación',
      annotations: 'Anotaciones',
      lexicalField: 'Campo léxico',
      lexicalCustom: 'Añade términos personalizados, separados por comas…',
      lexicalPossibilities: 'Posibilidades',
      addLexicalPossibility: 'Añadir una posibilidad de campo léxico',
      lexicalFieldsLoadError: (msg) => `No se pudo cargar lexical_fields.txt: ${msg}`,
      drawRectangle: 'Dibuja un rectángulo para crear una anotación.',
      dragRectangle: 'Arrastra sobre la imagen para dibujar un rectángulo',
      optionalNote: 'Nota opcional…',
      annotationText: 'Texto de la anotación',
      annotationLanguage: 'Idioma',
      deleteAnnotation: 'Eliminar anotación',
      ready: 'Listo',
      zoom: 'Zoom',
      imageStart: 'Selecciona una imagen para comenzar',
      noMatch: 'Ninguna imagen coincide con el filtro.',
      noDoneMatch: 'Ninguna imagen completada coincide con el filtro.',
      noNotDoneMatch: 'Ninguna imagen pendiente coincide con el filtro.',
      noImages: 'El manifiesto cargado no contiene imágenes.',
      loadImagesFirst: 'Carga un lote para llenar esta lista.',
      loadedDzi: (code) => `Cargado ${code}.dzi`,
      tileFailed: (url) => `No se pudo cargar el mosaico: ${url}`,
      dimensions: (w, h) => `${w} × ${h} px`,
      removeAllConfirm: (count, code) => `¿Eliminar las ${count} anotaciones de ${code}?`,
      region: (n) => `Región ${n}`,
      newRegion: 'Nueva región',
      untitled: 'Sin título',
      code: 'código',
      description: 'descripción',
      annotationList: 'anotaciones',
      noAnnotations: '(ninguna)',
      exportText: 'Exportar ficha',
      cardFilename: 'ficha',
      backupFilename: (batch) => `respaldo-${batch}.json`,
      language: 'Idioma',
      english: 'Inglés',
      spanish: 'Español',
      portuguese: 'Portugués',
      visibilityOn: 'Anotaciones visibles',
      visibilityOff: 'Anotaciones ocultas',
      done: 'Hecha',
      location: 'Ubicación',
      geolocation: 'Geolocalización',
      authorship: 'Autoría',
      date: 'Fecha',
      sourceCode: 'Signatura topográfica o código de origen',
      loadBatchStatus: (batch) => `Cargando ${batch}…`,
      loadingManifest: (batch) => `Cargando images-${batch}.json…`,
      manifestLoaded: (count, batch) => `${count} imagen${count === 1 ? '' : 'es'} cargadas desde images-${batch}.json`,
      imagesAvailable: (count) => `${count} imagen${count === 1 ? '' : 'es'} disponible${count === 1 ? '' : 's'}`,
      opening: (code) => `Abriendo ${code}.dzi…`,
      reading: (code) => `Leyendo ${code}.dzi…`,
      couldNotLoadManifest: (batch, msg) => `No se pudo cargar images-${batch}.json: ${msg}`,
      couldNotOpenDzi: (code, msg) => `No se pudo abrir ${code}.dzi: ${msg}`,
      manifestError: (msg) => `Error del manifiesto: ${msg}`,
      dziError: (msg) => `Error DZI: ${msg}`,
    },
    pt: {
      title: 'EFI: Lengua, migración y paisaje lingüístico',
      backup: 'Cópia de segurança',
      exportMenu: 'Menu',
      restore: 'Restaurar',
      importSuccess: (count) => `Foram importados ${count} registros de imagens.`,
      importError: (msg) => `Erro de importação: ${msg}`,
      imageBatch: 'Lote de imagens',
      chooseBatch: 'Escolha um lote.',
      images: 'Imagens',
      filter: 'Filtrar…',
      statusFilter: 'Estado',
      all: 'Todas',
      doneOnly: 'Concluídas',
      notDone: 'Não concluídas',
      doneCount: (n) => `${n} concluídas`,
      undoneCount: (n) => `${n} não concluídas`,
      selectImage: 'Selecione uma imagem',
      noDescription: 'Sem descrição',
      explore: 'Explorar',
      addAnnotation: 'Adicionar anotação',
      annotations: 'Anotações',
      lexicalField: 'Campo lexical',
      lexicalCustom: 'Adicione termos personalizados, separados por vírgulas…',
      lexicalPossibilities: 'Possibilidades',
      addLexicalPossibility: 'Adicionar uma possibilidade de campo lexical',
      lexicalFieldsLoadError: (msg) => `Não foi possível carregar lexical_fields.txt: ${msg}`,
      drawRectangle: 'Desenhe um retângulo para criar uma anotação.',
      dragRectangle: 'Arraste sobre a imagem para desenhar um retângulo',
      optionalNote: 'Nota opcional…',
      annotationText: 'Texto da anotação',
      annotationLanguage: 'Idioma',
      deleteAnnotation: 'Excluir anotação',
      ready: 'Pronto',
      zoom: 'Zoom',
      imageStart: 'Selecione uma imagem para começar',
      noMatch: 'Nenhuma imagem corresponde ao filtro.',
      noDoneMatch: 'Nenhuma imagem concluída corresponde ao filtro.',
      noNotDoneMatch: 'Nenhuma imagem pendente corresponde ao filtro.',
      noImages: 'O manifesto carregado não contém imagens.',
      loadImagesFirst: 'Carregue um lote para preencher esta lista.',
      loadedDzi: (code) => `Carregado ${code}.dzi`,
      tileFailed: (url) => `Falha ao carregar o bloco: ${url}`,
      exportText: 'Exportar ficha',
      cardFilename: 'ficha',
      backupFilename: (batch) => `copia-seguranca-${batch}.json`,
      dimensions: (w, h) => `${w} × ${h} px`,
      removeAllConfirm: (count, code) => `Remover todas as ${count} anotações de ${code}?`,
      region: (n) => `Região ${n}`,
      newRegion: 'Nova região',
      untitled: 'Sem título',
      code: 'código',
      description: 'descrição',
      annotationList: 'anotações',
      noAnnotations: '(nenhuma)',
      exportText: 'Exportar ficha',
      cardFilename: 'ficha',
      backupFilename: (batch) => `respaldo-${batch}.json`,
      language: 'Idioma',
      english: 'Inglês',
      spanish: 'Espanhol',
      portuguese: 'Português',
      visibilityOn: 'Anotações visíveis',
      visibilityOff: 'Anotações ocultas',
      done: 'Concluída',
      location: 'Localização',
      geolocation: 'Geolocalização',
      authorship: 'Autoria',
      date: 'Data',
      sourceCode: 'Signatura topográfica ou código de origem',
      loadBatchStatus: (batch) => `Carregando ${batch}…`,
      loadingManifest: (batch) => `Carregando images-${batch}.json…`,
      manifestLoaded: (count, batch) => `${count} imagem${count === 1 ? '' : 'ens'} carregada${count === 1 ? '' : 's'} de images-${batch}.json`,
      imagesAvailable: (count) => `${count} imagem${count === 1 ? '' : 'ens'} disponível${count === 1 ? '' : 'eis'}`,
      opening: (code) => `Abrindo ${code}.dzi…`,
      reading: (code) => `Lendo ${code}.dzi…`,
      couldNotLoadManifest: (batch, msg) => `Não foi possível carregar images-${batch}.json: ${msg}`,
      couldNotOpenDzi: (code, msg) => `Não foi possível abrir ${code}.dzi: ${msg}`,
      manifestError: (msg) => `Erro do manifesto: ${msg}`,
      dziError: (msg) => `Erro DZI: ${msg}`,
    },
  };

  function t(key, ...args) {
    const dict = I18N[state.language] || I18N.es;
    const value = dict[key] ?? I18N.en[key] ?? key;
    return typeof value === 'function' ? value(...args) : value;
  }

  function applyLocalization() {
    document.documentElement.lang = state.language;
    document.title = t('title');
    document.querySelector('h1').textContent = t('title');
    els.exportMenuBtn.textContent = t('exportMenu');
    els.exportAllBtn.textContent = t('backup');
    els.exportCurrentTxtBtn.textContent = t('exportText');
    els.importAllBtn.textContent = t('restore');
    document.querySelector('label[for="manifestSelect"]').textContent = t('imageBatch');
    const locationLabel = document.querySelector('label[for="imageLocation"]');
    const geolocationLabel = document.querySelector('label[for="imageGeolocation"]');
    if (locationLabel) locationLabel.textContent = t('location');
    if (geolocationLabel) geolocationLabel.textContent = t('geolocation');
    const batchPlaceholder = document.getElementById('batchPlaceholder');
    if (batchPlaceholder) batchPlaceholder.textContent = t('chooseBatch');
    document.querySelector('.sidebar .panel-heading h2').textContent = t('images');
    els.filterInput.placeholder = t('filter');
    els.filterInput.setAttribute('aria-label', t('filter'));
    els.statusFilter.setAttribute('aria-label', t('statusFilter'));
    const currentStatus = els.statusFilter.value || 'all';
    els.statusFilter.innerHTML = '';
    for (const [value, label] of [['all', t('all')], ['done', t('doneOnly')], ['not-done', t('notDone')]]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      els.statusFilter.appendChild(option);
    }
    els.statusFilter.value = ['all', 'done', 'not-done'].includes(currentStatus) ? currentStatus : 'all';
    els.selectTool.textContent = `✋ ${t('explore')}`;
    els.selectTool.title = t('explore');
    els.rectTool.textContent = `▭ ${t('addAnnotation')}`;
    els.rectTool.title = t('addAnnotation');
    els.annotationVisibilityBtn.nextElementSibling.textContent = t('annotations');
    els.annotationVisibilityBtn.checked = state.showAnnotations;
    els.doneBtn.nextElementSibling.textContent = t('done');
    renderDoneControl();
    document.querySelector('.annotation-panel .panel-heading h2').textContent = t('annotations');
    els.drawHint.textContent = t('dragRectangle');
    els.loading.textContent = t('imageStart');
    els.statusText.textContent = t('ready');
    els.zoomText.textContent = `${t('zoom')}: —`;
    els.annotationEmpty.textContent = t('drawRectangle');
    const templateLabel = els.annotationTemplate.content.querySelector('.annotation-label');
    const templateNote = els.annotationTemplate.content.querySelector('.annotation-note');
    const templateLanguageLabel = els.annotationTemplate.content.querySelector('.annotation-language-group label');
    const templateLexicalField = els.annotationTemplate.content.querySelector('.annotation-lexical-field');
    const templateLexicalLabel = els.annotationTemplate.content.querySelector('.annotation-lexical-label');
    const templateLexicalPossibilities = els.annotationTemplate.content.querySelector('.lexical-possibilities-label');
    const templateLexicalAdd = els.annotationTemplate.content.querySelector('.lexical-add-btn');
    const templateDelete = els.annotationTemplate.content.querySelector('.delete-annotation');
    if (templateLabel) templateLabel.placeholder = t('annotationText');
    if (templateNote) templateNote.placeholder = t('optionalNote');
    if (templateLanguageLabel) templateLanguageLabel.textContent = t('annotationLanguage');
    if (templateLexicalField) templateLexicalField.placeholder = t('lexicalCustom');
    if (templateLexicalLabel) templateLexicalLabel.textContent = t('lexicalField');
    if (templateLexicalPossibilities) templateLexicalPossibilities.textContent = t('lexicalPossibilities');
    if (templateLexicalAdd) {
      templateLexicalAdd.title = t('addLexicalPossibility');
      templateLexicalAdd.setAttribute('aria-label', t('addLexicalPossibility'));
    }
    if (templateDelete) templateDelete.title = t('deleteAnnotation');

    const langOptions = [
      ['es', t('spanish')],
      ['en', t('english')],
      ['pt', t('portuguese')],
    ];
    els.languageSelect.innerHTML = '';
    for (const [value, label] of langOptions) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      els.languageSelect.appendChild(option);
    }
    els.languageSelect.value = state.language;
    els.languageSelect.setAttribute('aria-label', t('language'));

    renderImageList();
    renderAnnotationList();
    if (viewer?.world?.getItemAt(0)) renderAnnotations();
  }

  function setLanguage(language) {
    if (!I18N[language]) return;
    state.language = language;
    localStorage.setItem('dzi-annotator:language', language);
    applyLocalization();
  }

  function initDom() {
    for (const id of [
      'viewer', 'drawSurface', 'manifestSelect',
      'imageList', 'imageCount', 'imageEmpty', 'filterInput', 'exportAllBtn',
      'currentImageName', 'currentImageDescription', 'imageDimensions', 'selectTool', 'rectTool',
      'imageLocation', 'imageGeolocation',
      'drawHint', 'loading', 'statusText',
      'zoomText', 'exportCurrentTxtBtn', 'annotationList', 'annotationCount', 'annotationEmpty', 'annotationTemplate',
      'languageSelect', 'annotationVisibilityBtn', 'doneBtn', 'statusFilter',
      'exportMenuBtn', 'exportMenu', 'importAllBtn', 'importAllInput'
    ]) els[id] = $(id);

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = t('chooseBatch');
    placeholder.id = 'batchPlaceholder';
    els.manifestSelect.appendChild(placeholder);

    for (const batch of BATCHES) {
      const option = document.createElement('option');
      option.value = batch;
      option.textContent = batch;
      els.manifestSelect.appendChild(option);
    }
  }

  async function loadLexicalFields() {
    try {
      const response = await fetch('./lexical_fields.txt', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const seen = new Set();
      state.lexicalFields = text
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter((value) => value && !seen.has(value) && seen.add(value));
    } catch (error) {
      state.lexicalFields = [];
      console.error('Lexical fields load error:', error);
    }
  }

  function lexicalParts(value) {
    return String(value ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function updateLexicalCheckboxes(container, value) {
    if (!container) return;
    const selected = new Set(lexicalParts(value));
    container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.checked = selected.has(input.value);
    });
  }

  function lexicalValueWithCheckboxes(currentValue, checkedValues) {
    const checked = new Set(checkedValues);
    const currentParts = lexicalParts(currentValue);
    const known = state.lexicalFields.filter((field) => checked.has(field));
    const custom = currentParts.filter((part) => !state.lexicalFields.includes(part));
    return [...known, ...custom].join(', ');
  }

  function storageKey(imageId) { return `dzi-annotator:${imageId}`; }

  function loadAnnotations(imageId) {
    try {
      const raw = localStorage.getItem(storageKey(imageId));
      if (!raw) return [];
      const annotations = JSON.parse(raw);
      if (!Array.isArray(annotations)) return [];
      return annotations.map((annotation) => ({
        ...annotation,
        language: annotation.language || 'Español',
      }));
    } catch (err) {
      console.warn('Could not load annotations:', err);
      return [];
    }
  }

  function saveAnnotations() {
    if (!state.current) return;
    localStorage.setItem(
      storageKey(state.current.c),
      JSON.stringify(state.annotations.get(state.current.c) || [])
    );
  }

  function doneStorageKey(imageId) { return `dzi-annotator:done:${imageId}`; }


  function saveAnnotationsFor(imageId, annotations) {
    localStorage.setItem(storageKey(imageId), JSON.stringify(annotations));
  }

  function loadDone(imageId) {
    return localStorage.getItem(doneStorageKey(imageId)) === '1';
  }

  function saveDone(imageId, value) {
    localStorage.setItem(doneStorageKey(imageId), value ? '1' : '0');
  }

  function isDone(imageId) {
    if (!state.done.has(imageId)) state.done.set(imageId, loadDone(imageId));
    return state.done.get(imageId) === true;
  }

  function toggleDone(image) {
    const next = !isDone(image.c);
    state.done.set(image.c, next);
    saveDone(image.c, next);
    renderImageList();
    if (state.current?.c === image.c) renderDoneControl();
  }

  function imageFieldsStorageKey(imageId) {
    return `dzi-annotator:image-fields:${imageId}`;
  }

  function loadImageFields(image) {
    try {
      const raw = localStorage.getItem(imageFieldsStorageKey(image.c));
      if (raw) {
        const value = JSON.parse(raw);
        return {
          location: String(value?.location ?? ''),
          geolocation: String(value?.geolocation ?? ''),
        };
      }
    } catch (error) {
      console.warn('Could not load image fields:', error);
    }

    return {
      location: image.pa || '',
      geolocation: '',
    };
  }

  function saveImageFields(imageId, fields) {
    const value = {
      location: String(fields?.location ?? ''),
      geolocation: String(fields?.geolocation ?? ''),
    };
    state.imageFields.set(imageId, value);
    localStorage.setItem(imageFieldsStorageKey(imageId), JSON.stringify(value));
  }

  function getImageFields(image) {
    if (!image) return { location: '', geolocation: '' };
    if (!state.imageFields.has(image.c)) {
      state.imageFields.set(image.c, loadImageFields(image));
    }
    return state.imageFields.get(image.c);
  }

  function renderImageFields() {
    if (!els.imageLocation || !els.imageGeolocation) return;
    const fields = getImageFields(state.current);
    els.imageLocation.value = fields.location;
    els.imageGeolocation.value = fields.geolocation;
  }

  async function loadManifest(batch) {
    setStatus(t('loadBatchStatus', batch));

    try {
      const response = await fetch(`./json/images-${batch}.json`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload || !Array.isArray(payload.images)) {
        throw new Error('Manifest must contain an "images" array');
      }

      state.currentBatch = batch;
      state.imageFields = new Map();
      state.images = payload.images
        .map((image) => ({
          ...image,
          c: String(image.c ?? '').trim(),
          pa: String(image.pa ?? '').trim(),
        }))
        .filter((image) => image.c);

      state.current = null;
      state.selectedId = null;
      closeViewerItem();
      clearViewerOverlays();
      els.currentImageName.textContent = t('selectImage');
      els.currentImageDescription.textContent = '';
      els.imageDimensions.textContent = '';
      if (els.imageLocation) els.imageLocation.value = '';
      if (els.imageGeolocation) els.imageGeolocation.value = '';
      els.loading.textContent = t('imageStart');
      els.loading.classList.remove('hidden');
      renderImageList();
      renderAnnotationList();

      setStatus(t('ready'));
      els.statusFilter.value = 'all';
      els.filterInput.value = '';
      if (state.images.length) openImage(state.images[0]);
    } catch (err) {
      state.images = [];
      state.current = null;
      state.selectedId = null;
      renderImageList();
      renderAnnotationList();
      els.loading.textContent = `Could not load images-${batch}.json`;
      els.loading.classList.remove('hidden');
      setStatus(t('manifestError', err.message));
      console.error('Manifest load error:', err);
    }
  }

  function renderImageList() {
    const filter = els.filterInput.value.trim().toLowerCase();
    const status = els.statusFilter?.value || 'all';
    els.imageList.innerHTML = '';
    const shown = state.images.filter((image) => {
      const matchesText =
        image.c.toLowerCase().includes(filter) ||
        image.pa.toLowerCase().includes(filter);
      const done = isDone(image.c);
      const matchesStatus =
        status === 'all' ||
        (status === 'done' && done) ||
        (status === 'not-done' && !done);
      return matchesText && matchesStatus;
    });
    const shownDone = shown.reduce((count, image) => count + (isDone(image.c) ? 1 : 0), 0);
    const shownUndone = shown.length - shownDone;
    els.imageCount.textContent = `${t('doneCount', shownDone)} · ${t('undoneCount', shownUndone)}`;
    els.imageEmpty.textContent = state.currentBatch
      ? (state.images.length
          ? (shown.length
              ? ''
              : (status === 'done'
                  ? t('noDoneMatch')
                  : (status === 'not-done' ? t('noNotDoneMatch') : t('noMatch'))))
          : t('noImages'))
      : t('loadImagesFirst');
    els.imageEmpty.classList.toggle('hidden', shown.length > 0);

    for (const image of shown) {
      const button = document.createElement('button');
      button.className = 'image-item' + (state.current?.c === image.c ? ' selected' : '');
      const done = isDone(image.c);
      button.innerHTML = '<div class="image-description-row"><span class="description"></span><span class="done-indicator hidden" aria-hidden="true">✓</span></div><div class="code"></div>';
      button.querySelector('.description').textContent = image.pa || t('noDescription');
      button.querySelector('.code').textContent = image.c;
      const doneIndicator = button.querySelector('.done-indicator');
      doneIndicator.classList.toggle('hidden', !done);
      doneIndicator.title = t('done');
      button.classList.toggle('done', done);
      button.addEventListener('click', () => openImage(image));
      els.imageList.appendChild(button);
    }
  }

  function createViewer() {
    if (typeof OpenSeadragon !== 'function') {
      throw new Error('OpenSeadragon 5.0.1 failed to load');
    }

    viewer = OpenSeadragon({
      id: 'viewer',
      prefixUrl: 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/5.0.1/images/',
      showNavigator: true,
      navigatorPosition: 'BOTTOM_RIGHT',
      animationTime: 0.8,
      blendTime: 0,
      maxZoomPixelRatio: 2,
      visibilityRatio: 0.9,
      constrainDuringPan: true,
      crossOriginPolicy: 'Anonymous',
      gestureSettingsMouse: { clickToZoom: true, dblClickToZoom: false },
    });

    viewer.addHandler('open', () => {
      els.loading.classList.add('hidden');
      const tiled = viewer.world.getItemAt(0);
      const contentSize = tiled?.getContentSize();
      els.imageDimensions.textContent = contentSize
        ? t('dimensions', Math.round(contentSize.x), Math.round(contentSize.y))
        : '';
      renderAnnotations();
      updateZoom();
    });
    viewer.addHandler('zoom', updateZoom);
    viewer.addHandler('pan', updateZoom);
    viewer.addHandler('open-failed', (event) => {
      const message = event.message || 'OpenSeadragon could not open the DZI';
      els.loading.textContent = message;
      els.loading.classList.remove('hidden');
      setStatus(message);
      console.error('OpenSeadragon open-failed:', event);
    });
    viewer.addHandler('tile-load-failed', (event) => {
      const url = event.tile?.url || 'unknown tile';
      console.error('Tile failed to load:', url, event);
      setStatus(t('tileFailed', url));
    });
    viewer.addHandler('tile-load', () => {
      if (state.current) setStatus(`Loading ${state.current.c}.dzi…`);
    });
    viewer.addHandler('fully-loaded', () => {
      if (state.current) setStatus(t('loadedDzi', state.current.c));
    });

    els.drawSurface.addEventListener('pointerdown', (event) => {
      if (state.tool !== 'rect' || !state.current || !viewer?.world?.getItemAt(0)) return;
      event.preventDefault();
      event.stopPropagation();
      els.drawSurface.setPointerCapture?.(event.pointerId);
      const p = pointerToViewerPoint(event);
      state.drawing = { start: p, current: p };
      els.drawHint.classList.remove('hidden');
      drawPreview();
    });

    els.drawSurface.addEventListener('pointermove', (event) => {
      if (!state.drawing) return;
      event.preventDefault();
      event.stopPropagation();
      state.drawing.current = pointerToViewerPoint(event);
      drawPreview();
    });

    els.drawSurface.addEventListener('pointerup', (event) => {
      if (!state.drawing) return;
      event.preventDefault();
      event.stopPropagation();
      state.drawing.current = pointerToViewerPoint(event);
      const rect = screenRectToImageRect(state.drawing.start, state.drawing.current);
      state.drawing = null;
      removePreview();
      els.drawSurface.releasePointerCapture?.(event.pointerId);
      if (rect.width < 4 || rect.height < 4) return;
      createAnnotation(rect);
    });

    els.drawSurface.addEventListener('pointercancel', () => {
      state.drawing = null;
      removePreview();
    });
  }

  async function parseDzi(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not read DZI (${response.status})`);
    const xmlText = await response.text();
    const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error('Invalid DZI XML');

    const imageNode = xml.documentElement;
    const sizeNode = imageNode.getElementsByTagNameNS('*', 'Size')[0] || imageNode.getElementsByTagName('Size')[0];
    if (!sizeNode) throw new Error('DZI is missing its Size element');

    const tileSize = Number(imageNode.getAttribute('TileSize'));
    const overlap = Number(imageNode.getAttribute('Overlap') || 0);
    const format = imageNode.getAttribute('Format');
    const width = Number(sizeNode.getAttribute('Width'));
    const height = Number(sizeNode.getAttribute('Height'));
    if (!Number.isFinite(tileSize) || !format || !Number.isFinite(width) || !Number.isFinite(height)) {
      throw new Error('DZI has invalid Image/Size attributes');
    }

    const urlNode = imageNode.getElementsByTagNameNS('*', 'Url')[0] || imageNode.getElementsByTagName('Url')[0];
    let tileUrl = urlNode?.textContent?.trim() || imageNode.getAttribute('Url') || '';
    if (!tileUrl) {
      tileUrl = `${url.slice(0, url.lastIndexOf('/') + 1)}${url.slice(url.lastIndexOf('/') + 1, -4)}_files/`;
    } else {
      tileUrl = new URL(tileUrl, new URL(url, window.location.href)).href;
    }

    if (!tileUrl.endsWith('/')) tileUrl += '/';
    return {
      Image: {
        xmlns: 'http://schemas.microsoft.com/deepzoom/2008',
        Url: tileUrl,
        Format: format,
        Overlap: overlap,
        TileSize: tileSize,
        Size: { Width: width, Height: height },
      },
    };
  }

  function renderDoneControl() {
    if (!els.doneBtn) return;
    const done = state.current ? isDone(state.current.c) : false;
    els.doneBtn.checked = done;
  }

  async function openImage(image) {
    if (!viewer) return;
    state.current = image;
    state.selectedId = null;
    state.annotations.set(image.c, loadAnnotations(image.c));
    renderImageFields();
    state.done.set(image.c, loadDone(image.c));
    renderDoneControl();
    els.currentImageDescription.textContent = image.pa || t('noDescription');
    els.currentImageName.textContent = image.c;
    els.loading.textContent = t('opening', image.c);
    els.loading.classList.remove('hidden');
    renderImageList();
    renderAnnotationList();
    setStatus(t('reading', image.c));

    try {
      const dziUrl = `./images/${encodeURIComponent(image.c)}.dzi`;
      const tileSource = await parseDzi(dziUrl);
      viewer.open(tileSource);
      setStatus(t('opening', image.c));
    } catch (err) {
      els.loading.textContent = t('couldNotOpenDzi', image.c, err.message);
      setStatus(t('dziError', err.message));
      console.error('DZI parse/open error:', err);
    }
  }

  function setTool(tool) {
    state.tool = tool;
    els.selectTool.classList.toggle('active', tool === 'select');
    els.rectTool.classList.toggle('active', tool === 'rect');
    els.drawHint.classList.toggle('hidden', tool !== 'rect');
    els.drawSurface.classList.toggle('hidden', tool !== 'rect');
    els.drawSurface.setAttribute('aria-hidden', tool !== 'rect' ? 'true' : 'false');
    if (tool !== 'rect') { state.drawing = null; removePreview(); }
  }

  function pointerToViewerPoint(event) {
    const rect = els.drawSurface.getBoundingClientRect();
    return new OpenSeadragon.Point(event.clientX - rect.left, event.clientY - rect.top);
  }

  function screenRectToImageRect(a, b) {
    const p1 = viewer.viewport.pointFromPixel(a);
    const p2 = viewer.viewport.pointFromPixel(b);
    const tiled = viewer.world.getItemAt(0);
    const i1 = tiled.viewportToImageCoordinates(p1);
    const i2 = tiled.viewportToImageCoordinates(p2);
    const x = Math.min(i1.x, i2.x);
    const y = Math.min(i1.y, i2.y);
    return {
      x: Math.max(0, Math.round(x)),
      y: Math.max(0, Math.round(y)),
      width: Math.max(1, Math.round(Math.abs(i2.x - i1.x))),
      height: Math.max(1, Math.round(Math.abs(i2.y - i1.y))),
    };
  }

  function drawPreview() {
    removePreview();
    if (!state.drawing || !viewer?.world?.getItemAt(0)) return;
    const imageRect = screenRectToImageRect(state.drawing.start, state.drawing.current);
    const tiled = viewer.world.getItemAt(0);
    const rect = tiled.imageToViewportRectangle(imageRect.x, imageRect.y, imageRect.width, imageRect.height);
    const div = document.createElement('div');
    div.id = 'annotation-preview';
    div.className = 'annotation-overlay';
    div.style.opacity = '0.65';
    div.style.pointerEvents = 'none';
    viewer.addOverlay({ element: div, location: rect });
  }

  function removePreview() {
    if (!viewer) return;
    try { viewer.removeOverlay('annotation-preview'); } catch (_) {}
  }

  function createAnnotation(rect) {
    const list = state.annotations.get(state.current.c) || [];
    const annotation = {
      id: crypto.randomUUID(),
      label: t('newRegion'),
      note: '',
      lexicalField: '',
      language: 'Español',
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(annotation);
    state.annotations.set(state.current.c, list);
    state.selectedId = annotation.id;
    saveAnnotations();
    renderAnnotationList();
    renderAnnotations();
  }

  function clearViewerOverlays() {
    if (!viewer) return;
    for (const element of state.overlayElements.values()) {
      try { viewer.removeOverlay(element); } catch (_) {}
    }
    state.overlayElements.clear();
    removePreview();
  }

  function closeViewerItem() {
    try { viewer?.close(); } catch (_) {}
  }

  function renderAnnotations() {
    if (!viewer?.world?.getItemAt(0)) return;
    if (!state.showAnnotations) { clearViewerOverlays(); return; }
    clearViewerOverlays();

    const list = state.current ? (state.annotations.get(state.current.c) || []) : [];
    const tiled = viewer.world.getItemAt(0);
    for (const [index, annotation] of list.entries()) {
      const element = document.createElement('div');
      element.className = `annotation-overlay annotation-color-${index % 6}` + (annotation.id === state.selectedId ? ' selected' : '');
      const label = document.createElement('div');
      label.className = 'overlay-label';
      label.textContent = annotation.label || t('untitled');
      element.appendChild(label);
      element.title = annotation.note || annotation.label || 'Annotation';
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        state.selectedId = annotation.id;
        renderAnnotationList();
        renderAnnotations();
      });
      const location = tiled.imageToViewportRectangle(annotation.x, annotation.y, annotation.width, annotation.height);
      viewer.addOverlay({ element, location });
      state.overlayElements.set(annotation.id, element);
    }
  }

  function renderAnnotationList() {
    els.annotationList.innerHTML = '';
    const list = state.current ? (state.annotations.get(state.current.c) || []) : [];
    els.annotationCount.textContent = String(list.length);
    els.annotationEmpty.classList.toggle('hidden', list.length > 0);

    for (const [index, annotation] of list.entries()) {
      const fragment = els.annotationTemplate.content.cloneNode(true);
      const card = fragment.querySelector('.annotation-card');
      card.classList.add(`annotation-tone-${index % 4}`);
      const label = fragment.querySelector('.annotation-label');
      const note = fragment.querySelector('.annotation-note');
      const language = fragment.querySelector('.annotation-language');
      const lexicalField = fragment.querySelector('.annotation-lexical-field');
      const lexicalPicker = fragment.querySelector('.lexical-picker');
      const lexicalAddBtn = fragment.querySelector('.lexical-add-btn');
      const lexicalOptions = fragment.querySelector('.lexical-options');
      const meta = fragment.querySelector('.annotation-meta');

      label.value = annotation.label || '';
      note.value = annotation.note || '';
      language.value = annotation.language || 'Español';
      lexicalField.value = annotation.lexicalField || '';
      meta.textContent = `x ${annotation.x}, y ${annotation.y}, w ${annotation.width}, h ${annotation.height}`;
      card.classList.toggle('selected', annotation.id === state.selectedId);

      for (const field of state.lexicalFields) {
        const optionLabel = document.createElement('label');
        optionLabel.className = 'lexical-option';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = field;
        checkbox.checked = lexicalParts(annotation.lexicalField).includes(field);

        const text = document.createElement('span');
        text.textContent = field;

        optionLabel.appendChild(checkbox);
        optionLabel.appendChild(text);
        lexicalOptions.appendChild(optionLabel);

        checkbox.addEventListener('change', () => {
          const checkedValues = Array.from(lexicalOptions.querySelectorAll('input[type="checkbox"]:checked'))
            .map((input) => input.value);
          lexicalField.value = lexicalValueWithCheckboxes(lexicalField.value, checkedValues);
          updateAnnotation(annotation.id, { lexicalField: lexicalField.value });

          // Close the possibilities list after adding or removing one field.
          // Press + again to choose another possibility.
          lexicalPicker.classList.add('hidden');
          lexicalAddBtn.setAttribute('aria-expanded', 'false');
        });
      }

      card.addEventListener('click', (event) => {
        if (
          event.target === label ||
          event.target === note ||
          event.target === language ||
          event.target === lexicalField ||
          event.target.closest('.lexical-picker') ||
          event.target.closest('.lexical-add-btn') ||
          event.target.closest('.delete-annotation')
        ) return;

        state.selectedId = annotation.id;
        renderAnnotationList();
        renderAnnotations();
        focusAnnotation(annotation);
      });

      label.addEventListener('pointerdown', (event) => event.stopPropagation());
      note.addEventListener('pointerdown', (event) => event.stopPropagation());
      language.addEventListener('pointerdown', (event) => event.stopPropagation());
      lexicalField.addEventListener('pointerdown', (event) => event.stopPropagation());
      lexicalAddBtn.addEventListener('pointerdown', (event) => event.stopPropagation());
      lexicalPicker.addEventListener('pointerdown', (event) => event.stopPropagation());
      lexicalOptions.addEventListener('pointerdown', (event) => event.stopPropagation());
      label.addEventListener('click', (event) => event.stopPropagation());
      note.addEventListener('click', (event) => event.stopPropagation());
      language.addEventListener('click', (event) => event.stopPropagation());
      lexicalField.addEventListener('click', (event) => event.stopPropagation());
      lexicalAddBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const open = lexicalPicker.classList.contains('hidden');
        lexicalPicker.classList.toggle('hidden', !open);
        lexicalAddBtn.setAttribute('aria-expanded', String(open));

        if (open) {
          updateLexicalCheckboxes(lexicalOptions, lexicalField.value);
        }
      });
      lexicalPicker.addEventListener('click', (event) => event.stopPropagation());
      lexicalOptions.addEventListener('click', (event) => event.stopPropagation());

      label.addEventListener('input', () => updateAnnotation(annotation.id, { label: label.value }));
      note.addEventListener('input', () => updateAnnotation(annotation.id, { note: note.value }));
      language.addEventListener('input', () => updateAnnotation(annotation.id, { language: language.value }));
      lexicalField.addEventListener('input', () => {
        updateAnnotation(annotation.id, { lexicalField: lexicalField.value });
        updateLexicalCheckboxes(lexicalOptions, lexicalField.value);
      });

      card.querySelector('.delete-annotation').addEventListener('click', (event) => {
        event.stopPropagation();
        deleteAnnotation(annotation.id);
      });

      els.annotationList.appendChild(fragment);
    }
  }

  function updateAnnotation(id, changes) {
    if (!state.current) return;
    const list = state.annotations.get(state.current.c) || [];
    const item = list.find((a) => a.id === id);
    if (!item) return;
    Object.assign(item, changes, { updatedAt: new Date().toISOString() });
    saveAnnotations();
    const overlay = state.overlayElements.get(id);
    if (overlay?.querySelector('.overlay-label')) {
      overlay.querySelector('.overlay-label').textContent = item.label || 'Untitled';
    }
  }

  function deleteAnnotation(id) {
    if (!state.current) return;
    const list = state.annotations.get(state.current.c) || [];
    state.annotations.set(state.current.c, list.filter((a) => a.id !== id));
    if (state.selectedId === id) state.selectedId = null;
    saveAnnotations();
    renderAnnotationList();
    renderAnnotations();
  }

  function focusAnnotation(annotation) {
    const tiled = viewer.world.getItemAt(0);
    if (!tiled) return;
    const location = tiled.imageToViewportRectangle(annotation.x, annotation.y, annotation.width, annotation.height);
    viewer.viewport.fitBounds(location, true);
  }

  function toggleAnnotations() {
    state.showAnnotations = els.annotationVisibilityBtn.checked;
    applyLocalization();
  }

  function updateZoom() {
    if (!viewer?.world?.getItemAt(0)) return;
    const zoom = viewer.viewport.getZoom(true);
    els.zoomText.textContent = `${t('zoom')}: ${zoom.toFixed(3)}`;
  }

  function setStatus(text) { els.statusText.textContent = text; }

  function wireEvents() {
    els.manifestSelect.addEventListener('change', () => {
      const batch = els.manifestSelect.value;
      if (!batch) return;
      loadManifest(batch);
    });
    els.filterInput.addEventListener('input', renderImageList);
    els.statusFilter.addEventListener('change', renderImageList);
    els.selectTool.addEventListener('click', () => setTool('select'));
    els.rectTool.addEventListener('click', () => setTool('rect'));
    els.annotationVisibilityBtn.addEventListener('change', toggleAnnotations);
    els.doneBtn.addEventListener('change', () => { if (state.current) { state.done.set(state.current.c, els.doneBtn.checked); saveDone(state.current.c, els.doneBtn.checked); renderImageList(); renderDoneControl(); } });
    els.imageLocation.addEventListener('input', () => {
      if (!state.current) return;
      const fields = getImageFields(state.current);
      fields.location = els.imageLocation.value;
      saveImageFields(state.current.c, fields);
    });
    els.imageGeolocation.addEventListener('input', () => {
      if (!state.current) return;
      const fields = getImageFields(state.current);
      fields.geolocation = els.imageGeolocation.value;
      saveImageFields(state.current.c, fields);
    });
    els.languageSelect.addEventListener('change', (event) => setLanguage(event.target.value));
  }

  async function start() {
    initDom();
    wireEvents();
    createViewer();
    await loadLexicalFields();
    applyLocalization();
    window.DZIIO.init({
      state,
      els,
      t,
      isDone,
      loadAnnotations,
      saveAnnotationsFor,
      saveDone,
      renderImageList,
      renderAnnotationList,
      renderAnnotations,
      renderDoneControl,
      setStatus,
      getCurrentImage: () => state.current,
      getCurrentBatch: () => state.currentBatch,
      getImages: () => state.images,
      getImageFields,
      saveImageFields,
    });
    setTool('select');
  }

  window.addEventListener('DOMContentLoaded', start);
})();
