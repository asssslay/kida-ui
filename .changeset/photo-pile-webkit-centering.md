---
'@kida-ui/styles': patch
---

Center PhotoPile cards with grid layout so WebKit does not round percentage transform offsets on fractional-sized cards. This preserves positioning inside percentage-height previews in both React and Vue.
