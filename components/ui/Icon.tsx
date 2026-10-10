type IconName =
  | "wave"
  | "calendar"
  | "scissors"
  | "mail"
  | "barber"
  | "bell"
  | "hourglass"
  | "user"
  | "settings"
  | "externalLink"
  | "logout"
  | "check"
  | "alert"
  | "edit"
  | "search";

export default function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  const shared = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      {...shared}
    >
      {name === "wave" && (
        <>
          <path d="M8.5 11V5.8a1.5 1.5 0 0 1 3 0v4.1-5a1.5 1.5 0 0 1 3 0v5.3-4a1.5 1.5 0 0 1 3 0v5.2-2.1a1.5 1.5 0 0 1 3 0v5.2c0 4-2.7 6.5-6.4 6.5h-2.3a6 6 0 0 1-4.7-2.3L4 14.5a1.7 1.7 0 0 1 2.5-2.3L8.5 14" />
          <path d="M3.5 5.5 2 4m4-.5L6 2m-4 7H.5" />
        </>
      )}
      {name === "calendar" && (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </>
      )}
      {name === "scissors" && (
        <>
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="m8.2 8.2 12.3 12.3M14.5 9.5 20.5 3M8.2 15.8l4.3-4.3" />
        </>
      )}
      {name === "mail" && (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </>
      )}
      {name === "barber" && (
        <>
          <path d="M7 3h10v18H7zM5 3h14M5 21h14" />
          <path d="m7 7 10 5-10 5 10 5M7 2l10 5-10 5 10 5" />
        </>
      )}
      {name === "bell" && (
        <>
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </>
      )}
      {name === "hourglass" && (
        <>
          <path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9m10-18c0 5-5 6-5 9s5 4 5 9" />
          <path d="M9 17h6" />
        </>
      )}
      {name === "user" && (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </>
      )}
      {name === "settings" && (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V4a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2.9Z" />
        </>
      )}
      {name === "externalLink" && (
        <>
          <path d="M14 4h6v6M20 4l-9 9" />
          <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
        </>
      )}
      {name === "logout" && (
        <>
          <path d="M10 17l5-5-5-5M15 12H3" />
          <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
        </>
      )}
      {name === "check" && <path d="m5 12 4 4L19 6" />}
      {name === "alert" && (
        <>
          <path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4m0 4h.01" />
        </>
      )}
      {name === "edit" && <path d="m15 5 4 4M4 20l4.2-.8L19 8.4 15.6 5 4.8 15.8 4 20Z" />}
      {name === "search" && (
        <>
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 5 5" />
        </>
      )}
    </svg>
  );
}
