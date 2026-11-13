import './SideProgress.css';

type Props = {
  count: number;
  index: number;
  /** Fremdrift i det aktuelle segment (0–1). Bruges, når tiden styres udefra (fx videoer). */
  progress?: number;
  /** Alternativt: lad segmentet fylde sig selv over så mange millisekunder */
  duration?: number;
  paused?: boolean;
  onDone?: () => void;
};

/**
 * Som stories på Instagram, men lodret langs venstre side:
 * ét segment pr. moment, set ovenfra og ned. Det aktuelle fylder sig op.
 */
export function SideProgress({ count, index, progress, duration, paused, onDone }: Props) {
  return (
    <ol className="side-progress" aria-label={`${index + 1} af ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="side-progress__seg">
          {i < index && <span className="side-progress__fill side-progress__fill--done" />}
          {i === index &&
            (duration ? (
              <span
                key={`run-${index}`}
                className="side-progress__fill side-progress__fill--run"
                style={{ animationDuration: `${duration}ms`, animationPlayState: paused ? 'paused' : 'running' }}
                onAnimationEnd={onDone}
              />
            ) : (
              <span className="side-progress__fill" style={{ transform: `scaleY(${progress ?? 0})` }} />
            ))}
        </li>
      ))}
    </ol>
  );
}
