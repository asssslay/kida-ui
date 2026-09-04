import { Magnetic } from '@kida-ui/react'

export default function MagneticBasic() {
  return (
    <Magnetic maxDistance={20} strength={0.24}>
      <button type="button" className="demo-magnetic-button">
        Come closer
      </button>
    </Magnetic>
  )
}
