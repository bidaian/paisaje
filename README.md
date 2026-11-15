# EFI: Lengua, migración y paisaje lingüístico

Static browser application using OpenSeadragon 5.0.1. No custom web server is included.

Expected layout:

```text
./index.html
./apps.js
./io.js
./style.css
./json/images-1920-01.json
./json/images-1920-02.json
...
./json/images-1930-38.json
./images/<ID>.dzi
./images/<ID>_files/...
```

Each manifest must contain an `images` array. Image records use `c` for the image code and `pa` for the description, and may contain additional fields that are preserved by backup/export operations:

```json
{
  "images": [
    {
      "c": "0016FMHC",
      "pa": "Photo of a statue"
    }
  ]
}
```

`apps.js` contains the main application logic. `io.js` contains the card export, backup, restore, JSON/text download, and export-menu logic.

Open `index.html` from the static site served by your existing web server.
