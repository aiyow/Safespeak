export function RegistrationNameFields() {
  return (
    <div className="grid-cols-[repeat(2,minmax(0,1fr))_minmax(102px,.7fr)] max-[480px]:grid-cols-2 grid items-start gap-3.5">
      <div className="grid gap-[7px] [&_label]:text-[.88rem] [&_label]:font-[650] [&_input]:min-h-[46px] [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-[9px] [&_input]:border [&_input]:border-[#dfcdd0] [&_input]:bg-[#fffaf9] [&_input]:px-3 [&_input]:py-[9px] [&_input:hover]:border-[#b88c96] [&_input:focus]:border-[#831f37] [&_select]:min-h-[46px] [&_select]:w-full [&_select]:min-w-0 [&_select]:rounded-[9px] [&_select]:border [&_select]:border-[#dfcdd0] [&_select]:bg-[#fffaf9] [&_select]:px-3 [&_select]:py-[9px] [&_select:hover]:border-[#b88c96] [&_select:focus]:border-[#831f37]">
        <label htmlFor="firstName">First name</label>
        <input id="firstName" name="firstName" autoComplete="given-name" maxLength={70} required />
      </div>
      <div className="grid gap-[7px] [&_label]:text-[.88rem] [&_label]:font-[650] [&_input]:min-h-[46px] [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-[9px] [&_input]:border [&_input]:border-[#dfcdd0] [&_input]:bg-[#fffaf9] [&_input]:px-3 [&_input]:py-[9px] [&_input:hover]:border-[#b88c96] [&_input:focus]:border-[#831f37] [&_select]:min-h-[46px] [&_select]:w-full [&_select]:min-w-0 [&_select]:rounded-[9px] [&_select]:border [&_select]:border-[#dfcdd0] [&_select]:bg-[#fffaf9] [&_select]:px-3 [&_select]:py-[9px] [&_select:hover]:border-[#b88c96] [&_select:focus]:border-[#831f37]">
        <label htmlFor="lastName">Last name</label>
        <input id="lastName" name="lastName" autoComplete="family-name" maxLength={70} required />
      </div>
      <div className="grid gap-[7px] [&_label]:text-[.88rem] [&_label]:font-[650] [&_input]:min-h-[46px] [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-[9px] [&_input]:border [&_input]:border-[#dfcdd0] [&_input]:bg-[#fffaf9] [&_input]:px-3 [&_input]:py-[9px] [&_input:hover]:border-[#b88c96] [&_input:focus]:border-[#831f37] [&_select]:min-h-[46px] [&_select]:w-full [&_select]:min-w-0 [&_select]:rounded-[9px] [&_select]:border [&_select]:border-[#dfcdd0] [&_select]:bg-[#fffaf9] [&_select]:px-3 [&_select]:py-[9px] [&_select:hover]:border-[#b88c96] [&_select:focus]:border-[#831f37]">
        <label htmlFor="middleInitial">Middle initial</label>
        <input id="middleInitial" name="middleInitial" autoComplete="additional-name"
          maxLength={2} pattern="\p{L}\.?" aria-describedby="middle-initial-hint" />
        <small id="middle-initial-hint" className="text-[#66535a]">Optional</small>
      </div>
    </div>
  )
}

export function StudentRegistrationFields() {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0 [&_legend]:mb-3 [&_legend]:p-0 [&_legend]:text-[.92rem] [&_legend]:font-[650]">
      <legend>Student details</legend>
      <div className="grid grid-cols-2 items-start gap-3.5">
        <div className="grid gap-[7px] [&_label]:text-[.88rem] [&_label]:font-[650] [&_input]:min-h-[46px] [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-[9px] [&_input]:border [&_input]:border-[#dfcdd0] [&_input]:bg-[#fffaf9] [&_input]:px-3 [&_input]:py-[9px] [&_input:hover]:border-[#b88c96] [&_input:focus]:border-[#831f37] [&_select]:min-h-[46px] [&_select]:w-full [&_select]:min-w-0 [&_select]:rounded-[9px] [&_select]:border [&_select]:border-[#dfcdd0] [&_select]:bg-[#fffaf9] [&_select]:px-3 [&_select]:py-[9px] [&_select:hover]:border-[#b88c96] [&_select:focus]:border-[#831f37]">
          <label htmlFor="course">Course</label>
          <select id="course" name="course" defaultValue="" required>
            <option value="" disabled>Select course</option>
            <option value="BSIT">BSIT</option>
            <option value="BSCS">BSCS</option>
          </select>
        </div>
        <div className="grid gap-[7px] [&_label]:text-[.88rem] [&_label]:font-[650] [&_input]:min-h-[46px] [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-[9px] [&_input]:border [&_input]:border-[#dfcdd0] [&_input]:bg-[#fffaf9] [&_input]:px-3 [&_input]:py-[9px] [&_input:hover]:border-[#b88c96] [&_input:focus]:border-[#831f37] [&_select]:min-h-[46px] [&_select]:w-full [&_select]:min-w-0 [&_select]:rounded-[9px] [&_select]:border [&_select]:border-[#dfcdd0] [&_select]:bg-[#fffaf9] [&_select]:px-3 [&_select]:py-[9px] [&_select:hover]:border-[#b88c96] [&_select:focus]:border-[#831f37]">
          <label htmlFor="studentNumber">Student number</label>
          <input id="studentNumber" name="studentNumber" placeholder="234-12345M"
            pattern="[0-9]{3}-[0-9]{5}[A-Za-z]" maxLength={10}
            title="Use the format 234-12345M" required />
        </div>
        <div className="grid gap-[7px] [&_label]:text-[.88rem] [&_label]:font-[650] [&_input]:min-h-[46px] [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-[9px] [&_input]:border [&_input]:border-[#dfcdd0] [&_input]:bg-[#fffaf9] [&_input]:px-3 [&_input]:py-[9px] [&_input:hover]:border-[#b88c96] [&_input:focus]:border-[#831f37] [&_select]:min-h-[46px] [&_select]:w-full [&_select]:min-w-0 [&_select]:rounded-[9px] [&_select]:border [&_select]:border-[#dfcdd0] [&_select]:bg-[#fffaf9] [&_select]:px-3 [&_select]:py-[9px] [&_select:hover]:border-[#b88c96] [&_select:focus]:border-[#831f37]">
          <label htmlFor="yearLevel">Current year</label>
          <select id="yearLevel" name="yearLevel" defaultValue="" required>
            <option value="" disabled>Select year</option>
            <option value="1">1st year</option>
            <option value="2">2nd year</option>
            <option value="3">3rd year</option>
            <option value="4">4th year</option>
          </select>
        </div>
        <div className="grid gap-[7px] [&_label]:text-[.88rem] [&_label]:font-[650] [&_input]:min-h-[46px] [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-[9px] [&_input]:border [&_input]:border-[#dfcdd0] [&_input]:bg-[#fffaf9] [&_input]:px-3 [&_input]:py-[9px] [&_input:hover]:border-[#b88c96] [&_input:focus]:border-[#831f37] [&_select]:min-h-[46px] [&_select]:w-full [&_select]:min-w-0 [&_select]:rounded-[9px] [&_select]:border [&_select]:border-[#dfcdd0] [&_select]:bg-[#fffaf9] [&_select]:px-3 [&_select]:py-[9px] [&_select:hover]:border-[#b88c96] [&_select:focus]:border-[#831f37]">
          <label htmlFor="section">Section</label>
          <input id="section" name="section" placeholder="e.g. A" maxLength={30} required />
        </div>
      </div>
    </fieldset>
  )
}
