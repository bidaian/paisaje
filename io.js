(() => {
  'use strict';

  let ctx = null;
  let cardTemplateText = null;
  let cardTemplatePromise = null;

  /**
   * Download a Blob as a file.
   *
   * @param {string} filename
   * @param {Blob} blob
   */
  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  /**
   * Download JSON.
   *
   * @param {string} filename
   * @param {Object} data
   */
  function downloadJson(filename, data) {
    downloadBlob(
      filename,
      new Blob(
        [JSON.stringify(data, null, 2)],
        {
          type: 'application/json;charset=utf-8'
        }
      )
    );
  }

  /**
   * Escape text before inserting it into an RTF document.
   *
   * @param {*} value
   * @return {string}
   */
  function escapeRtf(value) {
    const text = String(value ?? '');
    let result = '';

    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i);

      if (code === 92) {
        // Backslash
        result += '\\\\';
      } else if (code === 123) {
        // {
        result += '\\{';
      } else if (code === 125) {
        // }
        result += '\\}';
      } else if (code === 13) {
        // CR
        if (text.charCodeAt(i + 1) === 10) {
          continue;
        }

        result += '\\line ';
      } else if (code === 10) {
        // LF
        result += '\\line ';
      } else if (code === 9) {
        // Tab
        result += '\\tab ';
      } else if (code >= 32 && code <= 126) {
        result += text[i];
      } else {
        /*
         * RTF \uN uses a signed 16-bit integer.
         */
        const signedCode =
          code > 32767
            ? code - 65536
            : code;

        result += `\\u${signedCode}?`;
      }
    }

    return result;
  }

  /**
   * Replace newlines by // for transcription output.
   *
   * @param {*} value
   * @return {string}
   */
  function normalizeTranscription(value) {
    return String(value ?? '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n/g, '//');
  }

  /**
   * Create a numbered, RTF line-separated annotation field.
   *
   * @param {Array<Object>} annotations
   * @param {Function} getter
   * @return {string}
   */
  function numberedAnnotationField(
    annotations,
    getter
  ) {
    return annotations
      .map((annotation, index) => {
        const value = getter(annotation);

        return (
          `${index + 1}. ` +
          `${escapeRtf(value)}`
        );
      })
      .join('\\line ');
  }

  /**
   * Normalize geographic coordinates.
   *
   * Converts Unicode minus signs such as:
   *   −34.9080
   *
   * to:
   *   -34.9080
   *
   * @param {*} value
   * @return {string}
   */
  function normalizeGeolocation(value) {
    return String(value ?? '')
      .trim()
      .replace(/−/g, '-')
      .replace(/–/g, '-')
      .replace(/—/g, '-');
  }

  /**
   * Parse the image-level geolocation.
   *
   * Expected forms:
   *   -34.9080, -56.2034
   *   -34.9080; -56.2034
   *
   * @param {*} geolocation
   * @return {{latitude: string, longitude: string}|null}
   */
  function parseGeolocation(geolocation) {
    const value =
      normalizeGeolocation(
        geolocation
      );

    if (!value) {
      return null;
    }

    const match =
      value.match(
        /^\s*(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)\s*$/
      );

    if (!match) {
      return null;
    }

    return {
      latitude: match[1],
      longitude: match[2]
    };
  }

  /**
   * Build the OpenStreetMap URL.
   *
   * Example input:
   *   -34.9080, -56.2034
   *
   * Result:
   *   https://www.openstreetmap.org/?mlat=-34.9080&mlon=-56.2034#map=18/-34.9080/-56.2034
   *
   * @param {*} geolocation
   * @return {string}
   */
  function buildGpsLink(geolocation) {
    const coordinates =
      parseGeolocation(
        geolocation
      );

    if (!coordinates) {
      return '';
    }

    const {
      latitude,
      longitude
    } = coordinates;

    return (
      `https://www.openstreetmap.org/?mlat=${latitude}` +
      `&mlon=${longitude}` +
      `#map=18/${latitude}/${longitude}`
    );
  }

  /**
   * Load ficha.rtf into memory.
   *
   * @return {Promise<string>}
   */
  function loadCardTemplate() {
    if (cardTemplateText !== null) {
      return Promise.resolve(
        cardTemplateText
      );
    }

    if (!cardTemplatePromise) {
      cardTemplatePromise =
        fetch(
          './ficha.rtf',
          {
            cache: 'no-store'
          }
        )
          .then((response) => {
            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}`
              );
            }

            return response.text();
          })
          .then((text) => {
            cardTemplateText = text;

            return cardTemplateText;
          })
          .catch((error) => {
            cardTemplatePromise = null;

            throw new Error(
              `Could not load ficha.rtf: ${error.message}`
            );
          });
    }

    return cardTemplatePromise;
  }

  /**
   * Replace every occurrence of a string.
   *
   * @param {string} text
   * @param {string} search
   * @param {string} replacement
   * @return {string}
   */
  function replaceAll(
    text,
    search,
    replacement
  ) {
    return text
      .split(search)
      .join(replacement);
  }

  /**
   * Export the current image as an RTF card.
   */
  async function exportCard() {
    const image =
      ctx.getCurrentImage();

    if (!image) {
      return;
    }

    try {
      const template =
        await loadCardTemplate();

      const annotations =
        ctx.state.annotations.get(
          image.c
        ) ||
        ctx.loadAnnotations(
          image.c
        );

      const imageFields =
        ctx.getImageFields(
          image
        );

      /*
       * Image-level fields.
       */
      const imageId =
        escapeRtf(
          image.c
        );

      const repositoryName =
        escapeRtf(
          image.np || ''
        );

      const imageUrl =
        `https://cdf.montevideo.gub.uy/catalogo/foto/` +
        `${String(
          image.c
        ).toLowerCase()}`;

      const imageUrlRtf =
        escapeRtf(
          imageUrl
        );

      const author =
        escapeRtf(
          `${image.pau || ''}/${image.pp || ''}`
        );

      const date =
        escapeRtf(
          image.pf || ''
        );

      const place =
        escapeRtf(
          imageFields.location || ''
        );

      const gps =
        escapeRtf(
          normalizeGeolocation(
            imageFields.geolocation || ''
          )
        );

      const gpsUrl =
        buildGpsLink(
          imageFields.geolocation
        );

      const gpsUrlRtf =
        escapeRtf(
          gpsUrl
        );

      /*
       * Annotation fields.
       */
      const regionNames =
        numberedAnnotationField(
          annotations,
          (annotation) =>
            annotation.label ||
            ctx.t('untitled')
        );

      const languages =
        numberedAnnotationField(
          annotations,
          (annotation) =>
            annotation.language ||
            'Español'
        );

      /*
       * Actual annotation text.
       * Newlines become //.
       */
      const transcriptions =
        numberedAnnotationField(
          annotations,
          (annotation) =>
            normalizeTranscription(
              annotation.note || ''
            )
        );

      const lexicalFields =
        numberedAnnotationField(
          annotations,
          (annotation) =>
            annotation.lexicalField || ''
        );

      /*
       * Observaciones:
       * coordinates only.
       *
       * Example:
       *
       * 1. (123, 456, 789, 100)
       * 2. (234, 567, 890, 110)
       */
      const observations =
        numberedAnnotationField(
          annotations,
          (annotation) =>
            `(${annotation.x}, ` +
            `${annotation.y}, ` +
            `${annotation.width}, ` +
            `${annotation.height})`
        );

      let card =
        template;

      /*
       * Ordinary image-level replacements.
       */
      card =
        replaceAll(
          card,
          '_IMAGE_ID_',
          imageId
        );

      card =
        replaceAll(
          card,
          '_REPOSITORY_NAME_',
          repositoryName
        );

      card =
        replaceAll(
          card,
          '_AUTHOR_',
          author
        );

      card =
        replaceAll(
          card,
          '_DATE_',
          date
        );

      card =
        replaceAll(
          card,
          '_PLACE_',
          place
        );

      card =
        replaceAll(
          card,
          '_GPS_',
          gps
        );

      /*
       * IMAGE_LINK_URL
       *
       * The exact placeholder in ficha.rtf is:
       *
       *   http://_IMAGE_LINK_URL_
       *
       * Replace the entire string with the image URL.
       */
      card =
        replaceAll(
          card,
          'http://_IMAGE_LINK_URL_',
          imageUrlRtf
        );

      /*
       * IMAGE_LINK_NAME
       *
       * Replace with the same image URL.
       */
      card =
        replaceAll(
          card,
          '_IMAGE_LINK_NAME_',
          imageUrlRtf
        );

      /*
       * MAP_LINK_URL
       *
       * The exact placeholder in ficha.rtf is:
       *
       *   http://_MAP_LINK_URL_
       *
       * Replace the entire string with the
       * OpenStreetMap URL.
       */
      card =
        replaceAll(
          card,
          'http://_MAP_LINK_URL_',
          gpsUrlRtf
        );

      /*
       * Annotation replacements.
       */
      card =
        replaceAll(
          card,
          '_REGION_NAME_',
          regionNames
        );

      card =
        replaceAll(
          card,
          '_LANGUAGE_',
          languages
        );

      card =
        replaceAll(
          card,
          '_TRANSCRIPTION_',
          transcriptions
        );

      card =
        replaceAll(
          card,
          '_LEXICAL_FIELD_',
          lexicalFields
        );

      card =
        replaceAll(
          card,
          '_OBSERVATIONS_',
          observations
        );

      /*
       * Export using the image code.
       */
      downloadBlob(
        `${image.c}.rtf`,
        new Blob(
          [card],
          {
            type:
              'application/rtf;charset=utf-8'
          }
        )
      );

    } catch (error) {
      ctx.setStatus(
        error.message
      );

      console.error(
        'Card export error:',
        error
      );
    }
  }

  /**
   * Build one image record for a backup.
   *
   * All fields from the loaded JSON record
   * are preserved.
   *
   * @param {Object} image
   * @return {Object}
   */
  function buildImageExportRecord(
    image
  ) {
    const imageFields =
      ctx.getImageFields(
        image
      );

    return {
      ...image,

      image:
        `${image.c}.dzi`,

      imageId:
        image.c,

      done:
        ctx.isDone(
          image.c
        ),

      location:
        imageFields.location,

      geolocation:
        imageFields.geolocation,

      annotations:
        ctx.state.annotations.get(
          image.c
        ) ||
        ctx.loadAnnotations(
          image.c
        )
    };
  }

  /**
   * Export complete backup JSON.
   */
  function exportBackup() {
    const batch =
      ctx.getCurrentBatch();

    const images =
      ctx
        .getImages()
        .map(
          buildImageExportRecord
        );

    downloadJson(
      ctx.t(
        'backupFilename',
        batch || 'batch'
      ),
      {
        batch,

        sourceManifest:
          batch
            ? `json/images-${batch}.json`
            : null,

        exportedAt:
          new Date().toISOString(),

        images
      }
    );
  }

  /**
   * Restore a backup JSON file.
   *
   * @param {File} file
   */
  async function restore(
    file
  ) {
    if (!file) {
      return;
    }

    try {
      const text =
        await file.text();

      const payload =
        JSON.parse(
          text
        );

      if (
        !payload ||
        !Array.isArray(
          payload.images
        )
      ) {
        throw new Error(
          'JSON must contain an "images" array'
        );
      }

      let imported = 0;

      for (
        const record
        of payload.images
      ) {
        const code =
          record?.c ??
          record?.imageId;

        if (!code) {
          continue;
        }

        /*
         * Restore annotations.
         *
         * Older backups without a language
         * receive Español.
         */
        const annotations =
          Array.isArray(
            record.annotations
          )
            ? record.annotations.map(
                (annotation) => ({
                  ...annotation,

                  language:
                    annotation.language ||
                    'Español'
                })
              )
            : [];

        ctx.state.annotations.set(
          code,
          annotations
        );

        ctx.saveAnnotationsFor(
          code,
          annotations
        );

        /*
         * Restore done/undone state.
         */
        if (
          'done' in record
        ) {
          const done =
            Boolean(
              record.done
            );

          ctx.state.done.set(
            code,
            done
          );

          ctx.saveDone(
            code,
            done
          );

        } else if (
          record.completed !==
          undefined
        ) {
          const done =
            Boolean(
              record.completed
            );

          ctx.state.done.set(
            code,
            done
          );

          ctx.saveDone(
            code,
            done
          );
        }

        /*
         * Restore image-level fields.
         */
        if (
          'location' in record ||
          'geolocation' in record
        ) {
          ctx.saveImageFields(
            code,
            {
              location:
                record.location ??
                '',

              geolocation:
                record.geolocation ??
                ''
            }
          );
        }

        imported += 1;
      }

      /*
       * Refresh the interface.
       */
      ctx.renderImageList();
      ctx.renderAnnotationList();
      ctx.renderAnnotations();
      ctx.renderDoneControl();

      /*
       * Synchronize the image-level fields
       * for the currently selected image.
       */
      if (
        ctx.state.current
      ) {
        const fields =
          ctx.getImageFields(
            ctx.state.current
          );

        ctx.els.imageLocation.value =
          fields.location;

        ctx.els.imageGeolocation.value =
          fields.geolocation;
      }

      ctx.setStatus(
        ctx.t(
          'importSuccess',
          imported
        )
      );

    } catch (error) {
      ctx.setStatus(
        ctx.t(
          'importError',
          error.message
        )
      );

      console.error(
        'Restore error:',
        error
      );

    } finally {
      ctx.els.importAllInput.value =
        '';
    }
  }

  /**
   * Toggle the file-operations menu.
   */
  function toggleMenu() {
    const hidden =
      ctx.els.exportMenu.classList.toggle(
        'hidden'
      );

    ctx.els.exportMenuBtn.setAttribute(
      'aria-expanded',
      hidden
        ? 'false'
        : 'true'
    );
  }

  /**
   * Close the file-operations menu.
   */
  function closeMenu() {
    ctx.els.exportMenu.classList.add(
      'hidden'
    );

    ctx.els.exportMenuBtn.setAttribute(
      'aria-expanded',
      'false'
    );
  }

  /**
   * Initialize the I/O module.
   *
   * @param {Object} context
   */
  function init(
    context
  ) {
    ctx = context;

    /*
     * Load ficha.rtf immediately.
     */
    loadCardTemplate()
      .catch((error) => {
        console.error(
          error
        );
      });

    /*
     * Export card.
     */
    ctx.els.exportCurrentTxtBtn
      .addEventListener(
        'click',
        () => {
          closeMenu();
          exportCard();
        }
      );

    /*
     * Backup.
     */
    ctx.els.exportAllBtn
      .addEventListener(
        'click',
        () => {
          closeMenu();
          exportBackup();
        }
      );

    /*
     * Restore.
     */
    ctx.els.importAllBtn
      .addEventListener(
        'click',
        () => {
          ctx.els.importAllInput.click();
        }
      );

    ctx.els.importAllInput
      .addEventListener(
        'change',
        (event) => {
          const file =
            event.target.files?.[0];

          closeMenu();
          restore(file);
        }
      );

    /*
     * File-operations menu.
     */
    ctx.els.exportMenuBtn
      .addEventListener(
        'click',
        toggleMenu
      );

    document.addEventListener(
      'click',
      (event) => {
        if (
          !ctx.els.exportMenu.contains(
            event.target
          ) &&
          event.target !==
            ctx.els.exportMenuBtn
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
    restore
  };
})();
