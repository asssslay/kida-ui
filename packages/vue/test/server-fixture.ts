import { renderToString } from '@vue/server-renderer'
import { createSSRApp } from 'vue'
import { showcase } from './showcase.js'

export const serverMarkup = (open: boolean) =>
  renderToString(
    createSSRApp({
      render: () => showcase(open),
    }),
  )
