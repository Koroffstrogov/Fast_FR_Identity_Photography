type IconProps = {
  name: IconName;
  className?: string;
};

export type IconName =
  | "arrowRight"
  | "background"
  | "check"
  | "crop"
  | "download"
  | "eye"
  | "eyeOff"
  | "fit"
  | "image"
  | "move"
  | "point"
  | "print"
  | "refresh"
  | "reset"
  | "rotateLeft"
  | "rotateRight"
  | "sparkles"
  | "trash"
  | "upload"
  | "zip"
  | "zoomIn"
  | "zoomOut";

export function Icon({ name, className = "button-icon" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {renderIconPath(name)}
    </svg>
  );
}

export function ButtonIcon({ name }: { name: IconName }) {
  return <Icon name={name} />;
}

function renderIconPath(name: IconName) {
  switch (name) {
    case "arrowRight":
      return (
        <>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </>
      );
    case "background":
      return (
        <>
          <path d="M4 5h16v14H4z" />
          <path d="m4 15 4-4 4 4 3-3 5 5" />
        </>
      );
    case "check":
      return <path d="m5 12 4 4L19 6" />;
    case "crop":
      return (
        <>
          <path d="M6 2v14a2 2 0 0 0 2 2h14" />
          <path d="M18 22V8a2 2 0 0 0-2-2H2" />
        </>
      );
    case "download":
      return (
        <>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </>
      );
    case "eye":
      return (
        <>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      );
    case "eyeOff":
      return (
        <>
          <path d="m3 3 18 18" />
          <path d="M10.6 10.6A2 2 0 0 0 13.4 13.4" />
          <path d="M7.5 7.5C4.3 9 2 12 2 12s3.5 6 10 6c1.5 0 2.8-.3 4-.8" />
          <path d="M17.8 14.8C20.4 13.2 22 12 22 12s-3.5-6-10-6c-.9 0-1.8.1-2.6.3" />
        </>
      );
    case "fit":
      return (
        <>
          <path d="M4 9V4h5" />
          <path d="M20 9V4h-5" />
          <path d="M4 15v5h5" />
          <path d="M20 15v5h-5" />
        </>
      );
    case "image":
      return (
        <>
          <rect height="16" rx="2" width="18" x="3" y="4" />
          <circle cx="8" cy="9" r="2" />
          <path d="m3 17 5-5 4 4 3-3 6 6" />
        </>
      );
    case "move":
      return (
        <>
          <path d="M12 2v20" />
          <path d="M2 12h20" />
          <path d="m15 5-3-3-3 3" />
          <path d="m15 19-3 3-3-3" />
          <path d="m5 9-3 3 3 3" />
          <path d="m19 9 3 3-3 3" />
        </>
      );
    case "point":
      return (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4" />
          <path d="M12 18v4" />
          <path d="M2 12h4" />
          <path d="M18 12h4" />
        </>
      );
    case "print":
      return (
        <>
          <path d="M6 9V3h12v6" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <path d="M6 14h12v7H6z" />
        </>
      );
    case "refresh":
      return (
        <>
          <path d="M21 12a9 9 0 0 1-15.5 6.2" />
          <path d="M3 12A9 9 0 0 1 18.5 5.8" />
          <path d="M18 2v4h4" />
          <path d="M6 22v-4H2" />
        </>
      );
    case "reset":
      return (
        <>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 3v6h6" />
        </>
      );
    case "rotateLeft":
      return (
        <>
          <path d="M4 7h6V1" />
          <path d="M5.6 17a8 8 0 1 0 .5-10" />
        </>
      );
    case "rotateRight":
      return (
        <>
          <path d="M20 7h-6V1" />
          <path d="M18.4 17a8 8 0 1 1-.5-10" />
        </>
      );
    case "sparkles":
      return (
        <>
          <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" />
          <path d="m5 14 .8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Z" />
          <path d="m19 15 .6 1.4L21 17l-1.4.6L19 19l-.6-1.4L17 17l1.4-.6L19 15Z" />
        </>
      );
    case "trash":
      return (
        <>
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M6 6l1 15h10l1-15" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </>
      );
    case "upload":
      return (
        <>
          <path d="M12 21V9" />
          <path d="m7 14 5-5 5 5" />
          <path d="M5 3h14" />
        </>
      );
    case "zip":
      return (
        <>
          <path d="M8 2h7l5 5v15H8z" />
          <path d="M14 2v6h6" />
          <path d="M4 6h4" />
          <path d="M4 10h4" />
          <path d="M4 14h4" />
        </>
      );
    case "zoomIn":
      return (
        <>
          <circle cx="10" cy="10" r="7" />
          <path d="M21 21 15 15" />
          <path d="M10 7v6" />
          <path d="M7 10h6" />
        </>
      );
    case "zoomOut":
      return (
        <>
          <circle cx="10" cy="10" r="7" />
          <path d="M21 21 15 15" />
          <path d="M7 10h6" />
        </>
      );
  }
}
