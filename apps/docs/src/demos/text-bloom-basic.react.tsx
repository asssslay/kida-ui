import { TextBloom } from '@kida-ui/react'
import { useState } from 'react'

export default function TextBloomBasic() {
  const [pass, setPass] = useState(0)

  return (
    <div className="demo-feature demo-text-bloom">
      <TextBloom key={pass} as="h2" voice="pop">
        Make the headline bloom.
      </TextBloom>
      <button type="button" className="demo-button" onClick={() => setPass((value) => value + 1)}>
        Replay
      </button>
    </div>
  )
}
