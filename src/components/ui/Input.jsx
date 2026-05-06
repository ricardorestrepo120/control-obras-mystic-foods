import { forwardRef } from 'react';

const Input = forwardRef(({ style, ...rest }, ref) => (
  <input ref={ref} {...rest}
    style={{ width: "100%", height: 36, padding: "0 12px", background: "var(--bg-elev)", color: "var(--tx)", border: "1px solid var(--bd)", borderRadius: 8, fontSize: 13, outline: "none", transition: "border-color .12s", ...style }}
    onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
    onBlur={e  => e.currentTarget.style.borderColor = "var(--bd)"}
  />
));
Input.displayName = "Input";
export default Input;
