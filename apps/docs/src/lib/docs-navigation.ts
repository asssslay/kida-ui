import { swapFunctions, type TransitionBeforePreparationEvent } from 'astro:transitions/client'

type Framework = 'react' | 'vue'
const preferenceKey = 'kida-ui:framework'
let selectCurrentFramework: ((framework: Framework) => Promise<void>) | undefined
let cancelCurrentFramework = () => {}

function preferredFramework(fallback: Framework = 'react'): Framework {
  try {
    const saved = localStorage.getItem(preferenceKey)
    if (saved === 'react' || saved === 'vue') return saved
  } catch {
    /* Use the current framework when storage is unavailable. */
  }
  return fallback
}

// Some components ship only one adapter. Pages and sidebar links list theirs;
// a missing list means every framework is available.
function availableFrameworks(element: HTMLElement | null | undefined): Framework[] {
  const listed = element?.dataset.frameworks?.split(' ')
  const frameworks = listed?.filter((item): item is Framework => item === 'react' || item === 'vue')
  return frameworks?.length ? frameworks : ['react', 'vue']
}

function initializeFrameworkDocs() {
  cancelCurrentFramework()
  const content = document.querySelector<HTMLElement>('[data-framework-content]')
  const article = content?.querySelector<HTMLElement>('[data-framework-article]')
  const switcher = document.querySelector<HTMLElement>('.framework-switcher')
  const status = document.querySelector<HTMLElement>('[data-framework-status]')
  if (!content || !article || !switcher) return
  const cached = new Map<Framework, DocumentFragment>()
  const pending = new Map<Framework, Promise<DocumentFragment>>()
  let selection = 0
  const lifetime = new AbortController()

  async function loadFramework(framework: Framework): Promise<DocumentFragment> {
    const saved = cached.get(framework)
    if (saved) return saved
    const request = pending.get(framework)
    if (request) return request
    const loading = (async () => {
      const prefix = framework === 'vue' ? '/docs/vue' : '/docs'
      const response = await fetch(`${prefix}/${switcher?.dataset.frameworkPage}`, {
        signal: lifetime.signal,
      })
      if (!response.ok) throw new Error(`Documentation request failed: ${response.status}`)
      const document = new DOMParser().parseFromString(await response.text(), 'text/html')
      const next = document.querySelector('[data-framework-article]')
      if (
        !next ||
        document.querySelector('[data-framework-content]')?.getAttribute('data-framework') !==
          framework
      ) {
        throw new Error('Missing framework documentation')
      }
      // Only authored documentation is inserted. The live islands stay mounted;
      // scripts from a fetched document must never run or bootstrap another renderer.
      for (const script of next.querySelectorAll('script')) script.remove()
      for (const stage of next.querySelectorAll('.demo-stage')) stage.replaceChildren()
      const fragment = window.document.createDocumentFragment()
      fragment.append(...next.childNodes)
      cached.set(framework, fragment)
      return fragment
    })()
    pending.set(framework, loading)
    try {
      return await loading
    } finally {
      pending.delete(framework)
    }
  }

  function replaceDocumentation(next: DocumentFragment, current: Framework) {
    if (!article) return
    const figures = [...article.querySelectorAll<HTMLElement>('[data-demo]')]
    const incoming = [...next.querySelectorAll<HTMLElement>('[data-demo]')]
    if (figures.length !== incoming.length) throw new Error('Framework demos must match')
    const targets = new Map<HTMLElement, { figure: HTMLElement; stage: Element }>()
    for (const [index, placeholder] of incoming.entries()) {
      const figure = figures[index]
      const stage = figure?.querySelector('.demo-stage')
      if (
        !figure ||
        !stage ||
        figure.parentElement !== article ||
        placeholder.parentNode !== next ||
        figure.dataset.demo !== placeholder.dataset.demo
      ) {
        throw new Error('Framework demos must match before replacing documentation')
      }
      targets.set(placeholder, { figure, stage })
    }

    const previous = document.createDocumentFragment()
    const { scrollX, scrollY } = window
    // Keep every live figure in its original parent. Detaching even an unchanged
    // Astro island would run its teardown, losing focus and component state.
    for (const node of [...article.childNodes]) {
      if (node instanceof HTMLElement && node.matches('[data-demo]')) {
        const placeholder = node.cloneNode(false) as HTMLElement
        const stage = node.querySelector('.demo-stage')
        for (const child of [...node.childNodes]) {
          placeholder.append(child === stage ? child.cloneNode(false) : child)
        }
        previous.append(placeholder)
      } else previous.append(node)
    }
    let before: ChildNode | null = article.firstChild
    for (const node of [...next.childNodes]) {
      const target = node instanceof HTMLElement ? targets.get(node) : undefined
      if (target) {
        const { figure, stage } = target
        let afterStage = false
        for (const child of [...node.childNodes]) {
          if (child instanceof HTMLElement && child.classList.contains('demo-stage'))
            afterStage = true
          else if (afterStage) figure.append(child)
          else figure.insertBefore(child, stage)
        }
        node.remove()
        before = figure.nextSibling
      } else article.insertBefore(node, before)
    }
    cached.set(current, previous)
    const toc = document.querySelector('.toc ul')
    if (toc) {
      toc.replaceChildren(
        ...[...article.querySelectorAll('h2[id], h3[id]')].map((heading) => {
          const item = document.createElement('li')
          item.dataset.depth = heading.tagName === 'H2' ? '2' : '3'
          const link = document.createElement('a')
          link.href = `#${heading.id}`
          link.textContent = heading.textContent
          item.append(link)
          return item
        }),
      )
    }
    window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' })
  }

  async function selectFramework(framework: Framework, remember = true) {
    if (!content || !article || !switcher) return
    const request = ++selection
    try {
      if (content.dataset.framework !== framework) {
        content.setAttribute('aria-busy', 'true')
        if (status)
          status.textContent = `Loading ${framework === 'vue' ? 'Vue' : 'React'} documentation…`
        const next = await loadFramework(framework)
        if (request !== selection) return
        replaceDocumentation(next, content.dataset.framework as Framework)
        content.dataset.framework = framework
      }
      for (const button of switcher.querySelectorAll<HTMLButtonElement>(
        '[data-framework-choice]',
      )) {
        button.setAttribute('aria-pressed', String(button.dataset.frameworkChoice === framework))
      }
      if (status) status.textContent = ''
      try {
        if (remember) localStorage.setItem(preferenceKey, framework)
      } catch {
        /* Storage can be unavailable. */
      }
    } catch {
      if (request === selection && status)
        status.textContent =
          'Could not load documentation. Please try selecting the framework again.'
    } finally {
      if (request === selection) content.removeAttribute('aria-busy')
    }
  }

  let framework = content.dataset.framework as Framework
  // A compatibility entry explicitly requests Vue. Canonical entries restore the
  // preference; client navigation already fetched that framework before the swap.
  if (framework !== 'vue') framework = preferredFramework(framework)
  // A page without the preferred adapter shows its own framework, but keeps the
  // saved preference for the pages that do ship it.
  const supported = availableFrameworks(switcher).includes(framework)
  if (!supported) framework = content.dataset.framework as Framework
  for (const button of switcher.querySelectorAll<HTMLButtonElement>('[data-framework-choice]'))
    button.disabled = false
  selectCurrentFramework = selectFramework
  cancelCurrentFramework = () => {
    selection++
    lifetime.abort()
    cached.clear()
    pending.clear()
    selectCurrentFramework = undefined
  }
  void selectFramework(framework, supported)
}

// Module scripts run once with ClientRouter. Delegation and a fresh controller
// after each swap avoid stale article references or duplicate click handlers.
document.addEventListener('click', (event) => {
  const button =
    event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-framework-choice]')
      : null
  const choice = button?.dataset.frameworkChoice
  if (choice === 'react' || choice === 'vue') void selectCurrentFramework?.(choice)
})

document.addEventListener(
  'click',
  (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return
    const link =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>('.sidebar [data-framework-link]')
        : null
    if (link?.href === location.href) event.preventDefault()
  },
  { capture: true },
)

function frameworkTarget(url: URL): { page: string; frameworks: Framework[] } | undefined {
  if (url.origin !== location.origin) return
  const path = url.pathname.replace('/docs/vue/', '/docs/').replace(/\/$/, '')
  const link = [
    ...document.querySelectorAll<HTMLAnchorElement>('.sidebar [data-framework-link]'),
  ].find((link) => link.pathname === path)
  if (!link) return
  return { page: path.slice('/docs/'.length), frameworks: availableFrameworks(link) }
}

function contentSwap(nextDocument: Document): (() => void) | undefined {
  if (
    !document.body.matches('.docs-reference-page') ||
    !nextDocument.body.matches('.docs-reference-page')
  )
    return
  const content = document.querySelector<HTMLElement>('[data-framework-content]')
  const nextContent = nextDocument.querySelector<HTMLElement>('[data-framework-content]')
  const article = content?.querySelector('[data-framework-article]')
  const nextArticle = nextContent?.querySelector('[data-framework-article]')
  const heading = document.querySelector<HTMLElement>('.docs-prose-head h1')
  const nextHeading = nextDocument.querySelector('.docs-prose-head h1')
  const description = document.querySelector('.docs-prose-head .lede')
  const nextDescription = nextDocument.querySelector('.docs-prose-head .lede')
  const breadcrumb = document.querySelector('.docs-prose-kicker')
  const nextBreadcrumb = nextDocument.querySelector('.docs-prose-kicker')
  const toc = document.querySelector('.toc ul')
  const nextToc = nextDocument.querySelector('.toc ul')
  if (
    !content ||
    !nextContent ||
    !article ||
    !nextArticle ||
    !heading ||
    !nextHeading ||
    !description ||
    !nextDescription ||
    !breadcrumb ||
    !nextBreadcrumb ||
    !toc ||
    !nextToc
  )
    return

  return () => {
    // Keep Astro's script bookkeeping and stylesheet loading, but never call
    // swapBodyElement: moving the glass navigation into a temporary parent
    // repaints its backdrop even when the same elements are later restored.
    swapFunctions.deselectScripts(nextDocument)
    swapFunctions.swapHeadElements(nextDocument)
    // Astro normally discards the previous route announcer with the old body.
    // The body now stays mounted, so remove that transient node explicitly.
    for (const announcer of document.querySelectorAll('.astro-route-announcer')) announcer.remove()
    const focused = document.activeElement
    const focusWasInArticle = !!focused && article.contains(focused)
    heading.textContent = nextHeading.textContent
    description.textContent = nextDescription.textContent
    breadcrumb.replaceChildren(...nextBreadcrumb.childNodes)
    content.dataset.framework = nextContent.dataset.framework
    content.removeAttribute('aria-busy')
    article.replaceChildren(...nextArticle.childNodes)
    toc.replaceChildren(...nextToc.childNodes)
    const note = document.querySelector<HTMLElement>('.framework-preview-note')
    if (note)
      note.hidden =
        nextDocument.querySelector<HTMLElement>('.framework-preview-note')?.hidden ?? true
    const status = document.querySelector('[data-framework-status]')
    if (status) status.textContent = ''
    if (focusWasInArticle) {
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    }
  }
}

document.addEventListener('astro:before-preparation', (event: TransitionBeforePreparationEvent) => {
  const target = frameworkTarget(event.to)
  if (!target || event.formData) return
  const { page, frameworks } = target
  const canonical = new URL(event.to)
  canonical.pathname = `/docs/${page}`
  const explicitVue = event.to.pathname.startsWith('/docs/vue/')
  const load = event.loader
  // Let Astro handle asset preloading, cancellation, history and hydration. Only
  // the fetched document differs; the visible URL is always the canonical route.
  event.loader = async () => {
    let framework: Framework
    const selected = () => {
      const choice = explicitVue
        ? 'vue'
        : preferredFramework(
            document.querySelector<HTMLElement>('[data-framework-content]')?.dataset.framework as
              | Framework
              | undefined,
          )
      return frameworks.includes(choice) ? choice : (frameworks[0] ?? 'react')
    }
    try {
      do {
        framework = selected()
        event.to = new URL(canonical)
        if (framework === 'vue') event.to.pathname = `/docs/vue/${page}`
        await load()
      } while (!event.signal.aborted && !event.defaultPrevented && framework !== selected())
    } finally {
      event.to = canonical
    }
  }
})

document.addEventListener('astro:before-swap', (event) => {
  // Skipping a transition rejects its ready promise even though the DOM swap
  // completes. Handle that cancellation on the promise itself; real failures
  // still surface.
  void event.viewTransition.ready.catch((error: unknown) => {
    if (error instanceof DOMException && error.name === 'AbortError') return
    throw error
  })
  // Route changes swap instantly, without a page transition.
  event.viewTransition.skipTransition()
  const swap = contentSwap(event.newDocument)
  if (swap) event.swap = swap
  cancelCurrentFramework()
  const next = event.newDocument.querySelector<HTMLElement>('.framework-switcher')
  const current = document.querySelector<HTMLElement>('.framework-switcher')
  if (next && current) {
    current.dataset.frameworkPage = next.dataset.frameworkPage
    current.dataset.frameworks = next.dataset.frameworks
    for (const button of current.querySelectorAll<HTMLButtonElement>('[data-framework-choice]')) {
      const counterpart = next.querySelector<HTMLButtonElement>(
        `[data-framework-choice="${button.dataset.frameworkChoice}"]`,
      )
      button.setAttribute('aria-pressed', counterpart?.getAttribute('aria-pressed') ?? 'false')
      button.hidden = counterpart?.hidden ?? true
    }
  }
  for (const link of document.querySelectorAll<HTMLAnchorElement>('.sidebar a')) {
    if (link.pathname === event.to.pathname) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  }
})
document.addEventListener('astro:after-swap', initializeFrameworkDocs)
initializeFrameworkDocs()
