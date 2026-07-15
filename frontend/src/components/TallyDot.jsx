export default function TallyDot({ live = true, size = "sm", className = "" }) {
  if(size === "sm") {
    var dims = "h-2 w-2";
  } else if(size === "md") {
    var dims = "h-3 w-3";
  } else if(size === "lg") {
    var dims = "h-4 w-4";
  }
  else{
    var dims = "h-8 w-8";
  }
  return (
    <span className={`relative inline-flex ${dims} ${className}`}>
      {live && <span className="tally-pulse absolute inline-flex h-full w-full rounded-full" />}
      <span
        className={`relative inline-flex rounded-full ${dims} ${live ? "bg-tally" : "bg-muted"}`}
      />
    </span>
  );
}
