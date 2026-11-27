import { useId, useState, type InputHTMLAttributes } from "react";

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id"> & {
  label: string;
};

export function PasswordField({ label, ...inputProps }: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return <div className="password-field">
    <label htmlFor={id}>{label}</label>
    <div className="password-field-controls">
      <input {...inputProps} id={id} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="secondary-button password-visibility"
        aria-controls={id}
        aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
        disabled={inputProps.disabled}
        onClick={() => setVisible(current => !current)}
      >{visible ? "Hide" : "Show"}</button>
    </div>
  </div>;
}
