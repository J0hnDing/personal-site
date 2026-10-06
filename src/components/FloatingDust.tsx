type FloatingDustProps = {
  className?: string;
  motionOff?: boolean;
};

export default function FloatingDust({
  className = "",
  motionOff = false,
}: FloatingDustProps) {
  const classes = [
    "landing-points",
    className,
    motionOff ? "is-still" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} aria-hidden="true">
      {Array.from({ length: 18 }, (_, index) => (
        <span className="landing-point" key={index} />
      ))}
    </div>
  );
}
