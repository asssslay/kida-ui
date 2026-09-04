import { Reveal } from '@kida-ui/react'

export default function RevealBasic() {
  return (
    <Reveal className="demo-card">
      <strong>Scrolled into view</strong>
      <span>Rises 8px and fades in, the first time it enters the viewport.</span>
    </Reveal>
  )
}
