import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import './NewFlick.css';

const HOLD_MS = 350; // så længe skal man holde, før der optages video

type Captured = { kind: 'image' | 'video'; url: string };

/**
 * Ny flick: søger med kameraet (Figma: Ny flick).
 * Tryk på udløseren for foto, hold nede for at optage.
 * Uden kameraadgang åbner udløseren telefonens eget kamera via filvælgeren.
 */
export function NewFlick() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const holdTimer = useRef<number | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [recording, setRecording] = useState(false);
  const [captured, setCaptured] = useState<Captured | null>(null);

  const close = () => navigate('/flicks', { replace: true });

  // Start kameraet, hvis browseren tillader det
  useEffect(() => {
    if (captured) return;
    let cancelled = false;
    let active: MediaStream | null = null;
    const md = navigator.mediaDevices;
    if (!md?.getUserMedia) return;
    (async () => {
      const video = { facingMode: facing };
      try {
        active = await md.getUserMedia({ video, audio: true });
      } catch {
        try {
          active = await md.getUserMedia({ video });
        } catch {
          active = null;
        }
      }
      if (cancelled) {
        active?.getTracks().forEach((t) => t.stop());
        return;
      }
      setStream(active);
    })();
    return () => {
      cancelled = true;
      active?.getTracks().forEach((t) => t.stop());
      setStream(null);
    };
  }, [facing, captured]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  // Ryd op i midlertidige filer
  useEffect(() => () => {
    if (captured) URL.revokeObjectURL(captured.url);
  }, [captured]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const takePhoto = () => {
    const v = videoRef.current;
    if (!stream || !v || !v.videoWidth) {
      captureInput.current?.click();
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext('2d')?.drawImage(v, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) setCaptured({ kind: 'image', url: URL.createObjectURL(blob) });
    }, 'image/jpeg', 0.9);
  };

  const startRecording = () => {
    if (!stream || typeof MediaRecorder === 'undefined') return;
    try {
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'video/webm' });
        setCaptured({ kind: 'video', url: URL.createObjectURL(blob) });
      };
      rec.start();
      recorder.current = rec;
      setRecording(true);
    } catch {
      recorder.current = null;
    }
  };

  const onShutterDown = (e: React.PointerEvent) => {
    if (!stream) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      startRecording();
    }, HOLD_MS);
  };

  const onShutterUp = () => {
    if (!stream) return;
    if (holdTimer.current !== null) {
      // Kort tryk: foto
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
      takePhoto();
    } else if (recorder.current) {
      recorder.current.stop();
      recorder.current = null;
      setRecording(false);
    }
  };

  const onShutterCancel = () => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    if (recorder.current) {
      recorder.current.stop();
      recorder.current = null;
      setRecording(false);
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCaptured({ kind: file.type.startsWith('video') ? 'video' : 'image', url: URL.createObjectURL(file) });
  };

  return (
    <div className="newflick" role="dialog" aria-label="Ny flick">
      <div className="newflick__viewfinder">
        {captured ? (
          captured.kind === 'image' ? (
            <img className="newflick__media" src={captured.url} alt="Dit billede" />
          ) : (
            <video className="newflick__media" src={captured.url} autoPlay loop muted playsInline aria-label="Din video" />
          )
        ) : (
          <>
            {stream ? (
              <video
                ref={videoRef}
                className={['newflick__media', facing === 'user' && 'newflick__media--mirror'].filter(Boolean).join(' ')}
                autoPlay
                muted
                playsInline
                aria-hidden="true"
              />
            ) : (
              <div className="newflick__placeholder" aria-hidden="true" />
            )}
            {!recording && <p className="newflick__hint t-body-s">Tryk for foto. Hold nede for at optage.</p>}
          </>
        )}

        <div className="newflick__top">
          <IconButton
            icon="close"
            label={captured ? 'Kassér' : 'Luk'}
            className="newflick__btn"
            onClick={() => (captured ? setCaptured(null) : close())}
          />
          <span className="newflick__audience">Følgere</span>
        </div>

        <div className="newflick__controls">
          {captured ? (
            <Button variant="highlight" onClick={() => navigate('/flicks', { replace: true })}>
              Del
            </Button>
          ) : (
            <>
              <IconButton icon="image" label="Vælg fra billeder" className="newflick__btn" onClick={() => galleryInput.current?.click()} />
              <button
                type="button"
                className={['newflick__shutter', recording && 'newflick__shutter--recording'].filter(Boolean).join(' ')}
                aria-label={recording ? 'Stop optagelse' : 'Tag foto'}
                onPointerDown={onShutterDown}
                onPointerUp={onShutterUp}
                onPointerCancel={onShutterCancel}
                onContextMenu={(e) => e.preventDefault()}
                onClick={(e) => {
                  // Tastatur (detail = 0) eller ingen kamerastrøm: tag foto / åbn kameraet
                  if (e.detail === 0 || !stream) takePhoto();
                }}
              >
                <span className="newflick__shutter-inner" />
              </button>
              <IconButton
                icon="camera"
                label="Skift kamera"
                className="newflick__btn"
                onClick={() => (stream ? setFacing((f) => (f === 'user' ? 'environment' : 'user')) : captureInput.current?.click())}
              />
            </>
          )}
        </div>
      </div>

      <input ref={captureInput} type="file" accept="image/*,video/*" capture="environment" hidden onChange={onFile} />
      <input ref={galleryInput} type="file" accept="image/*,video/*" hidden onChange={onFile} />
    </div>
  );
}
