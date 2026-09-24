import { useEffect, useRef, type ReactNode } from "react";

export function ModalDialog({ children, className, labelledBy, busy = false, onClose }: {
  children: ReactNode;
  className: string;
  labelledBy: string;
  busy?: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPress = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={`native-modal ${className}`}
      aria-labelledby={labelledBy}
      aria-busy={busy}
      onCancel={event => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onPointerDown={event => {
        const bounds = event.currentTarget.getBoundingClientRect();
        backdropPress.current = event.target === event.currentTarget &&
          (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
      }}
      onPointerUp={event => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const outside = event.target === event.currentTarget &&
          (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
        if (backdropPress.current && outside && !busy) onClose();
        backdropPress.current = false;
      }}
      onPointerCancel={() => { backdropPress.current = false; }}
    >
      {children}
    </dialog>
  );
}
