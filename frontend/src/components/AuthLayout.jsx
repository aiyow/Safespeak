import { LogIn, UserPlus } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { paths } from '../constants/routes.js'
import { Brand } from './Brand.jsx'

export function AuthLayout({ title, description, children }) {
  return (
    <div className="flex min-h-svh flex-col bg-[radial-gradient(ellipse_at_50%_0%,#f2dfe1,transparent_68%)] bg-[#f8f5f4] text-[#2d2024]">
      <header className="border-b-[3px] border-[#c95c70] bg-[linear-gradient(108deg,#3b141d,#21161a)] text-[#fff7f6]">
        <div className="mx-auto flex min-h-[82px] max-w-[1160px] items-center justify-between gap-4 px-[clamp(20px,4vw,48px)] py-3.5 max-[480px]:flex-wrap max-[480px]:gap-3">
          <Brand inverted />
          <nav className="flex flex-wrap gap-2 max-[480px]:w-full [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:justify-center [&_a]:gap-2 [&_a]:rounded-lg [&_a]:border [&_a]:border-[#fbd9de40] [&_a]:px-[13px] [&_a]:py-2 [&_a]:text-[.88rem] [&_a]:font-[650] [&_a]:text-[#fff1f2] [&_a]:no-underline [&_a:hover]:bg-[#ffffff18] [&_a[aria-current=page]]:border-[#f3c8d0] [&_a[aria-current=page]]:bg-[#fae7ea] [&_a[aria-current=page]]:text-[#651a2c] [&_a:focus-visible]:outline-[#ffb8c5] max-[480px]:[&_a]:flex-1" aria-label="Account access">
            <NavLink to={paths.login}>
              <LogIn size={17} aria-hidden="true" />
              Sign in
            </NavLink>
            <NavLink to={paths.register}>
              <UserPlus size={17} aria-hidden="true" />
              Register
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="grid flex-1 place-items-center px-4 py-[clamp(24px,5vw,64px)]">
        <section className="w-full max-w-[510px] rounded-[15px] border border-t-4 border-[#e4d6d8] border-t-[#831f37] bg-[#fffdfc] p-[clamp(20px,5vw,39px)] shadow-[0_18px_50px_#3b141d15,0_3px_8px_#3b141d08] [&_h1]:mb-6 [&_h1]:font-[Baskervville,Georgia,serif] [&_h1]:text-[clamp(2.15rem,6vw,3.1rem)] [&_h1]:leading-[1.04] [&_h1]:font-normal [&_h1]:tracking-[-.045em] [&_h1]:text-[#342126] [&_:focus-visible]:outline-[#831f37]" aria-labelledby="auth-title">
          <h1 id="auth-title">{title}</h1>
          {description && <p className="text-[#66535a] -mt-[11px] mb-[23px] border-b border-[#efdee0] pb-[18px] leading-normal">{description}</p>}
          {children}
        </section>
      </main>
    </div>
  )
}
