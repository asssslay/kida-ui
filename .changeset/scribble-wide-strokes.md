---
'@kida-ui/motion': patch
'@kida-ui/styles': patch
'@kida-ui/react': patch
'@kida-ui/vue': patch
---

Draw ScribbleHighlight as one continuous stroke at any size. Underlines and circles wider than
about 100px used to break into dashes, including before they were drawn and with reduced motion.
drawInView now measures each stroke's drawn length and keeps it current as the element resizes.
