# Third-party notices

The root MIT license applies to original project code and documentation.
The following components and external resources retain their own terms.
Keep bundled license files with their corresponding libraries when copying
or deploying this project.

## Bundled libraries

| Component | Local file | License | Source |
| --- | --- | --- | --- |
| qrcode-generator 2.0.4 | `js/vendor/qrcode.js` | [MIT](js/vendor/QR-LICENSE.txt), copyright (c) 2009 Kazuhiko Arase | [Upstream](https://github.com/kazuhikoarase/qrcode-generator) |
| jsQR 1.4.0 | `js/vendor/jsQR.js` | [Apache-2.0](js/vendor/jsQR-LICENSE.txt) | [Upstream](https://github.com/cozmo/jsQR) |

Both JavaScript files matched their published npm releases when checked on
2026-09-27, ignoring line endings and surrounding whitespace. The jsQR 1.4.0
package contains no additional NOTICE file. Preserve upstream notices and
identify any future modifications as required by the applicable license.

## Externally loaded resources and services

- **Jersey 10:** served by Google Fonts; copyright 2023 The Soft Type Project
  Authors, under the [SIL Open Font License 1.1](https://github.com/google/fonts/blob/main/ofl/jersey10/OFL.txt).
  Include the copyright and license if bundling the font locally.
- **Font Awesome:** the hosted kit reported Free 6.7.2 on 2026-09-27.
  Font Awesome Free uses MIT for code, SIL OFL 1.1 for fonts, and CC BY 4.0
  for SVG/JavaScript icons. Preserve its supplied attribution. See the
  [Font Awesome Free license](https://fontawesome.com/license/free).
- **MusicBrainz:** metadata is subject to the
  [MusicBrainz data licenses](https://musicbrainz.org/doc/About/Data_License).
  Core data is CC0; supplementary data has separate terms. Do not assume all
  API fields are covered by the project's MIT license.
- **YouTube:** embedded videos and API data are subject to YouTube's
  [Terms of Service](https://www.youtube.com/t/terms) and
  [API developer policies](https://developers.google.com/youtube/terms/developer-policies).
  No rights to the underlying music or videos are granted by this repository.

These notices document sources and licenses; they do not replace required
service disclosures or establish compliance of every use of those services.
