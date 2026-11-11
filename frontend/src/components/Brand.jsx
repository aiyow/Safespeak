import { MessageCircleCheck } from 'lucide-react'

export function Brand({ inverted = false }) {
  return (
    <div className="flex items-center gap-3 [&_strong]:block [&_strong]:text-[1.22rem] [&_strong]:tracking-[-.035em] [&_small]:mt-[3px] [&_small]:block [&_small]:text-[.73rem] [&_small]:opacity-[.81]">
      <span className={`grid size-11 shrink-0 place-items-center rounded-[13px] ${inverted ? 'border border-[#f9a4b140] bg-[#f09baa13] text-[#ff9cab]' : 'bg-[#17635f] text-[#d9ffef]'}`}><MessageCircleCheck size={23} aria-hidden="true" /></span>
      <span>
        <strong>SafeSpeak</strong>
        <small>College of Computing Studies</small>
      </span>
    </div>
  )
}
