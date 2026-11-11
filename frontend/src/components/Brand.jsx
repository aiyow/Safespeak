import { MessageCircleCheck } from 'lucide-react'

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark"><MessageCircleCheck size={23} aria-hidden="true" /></span>
      <span>
        <strong>SafeSpeak</strong>
        <small>College of Computing Studies</small>
      </span>
    </div>
  )
}
