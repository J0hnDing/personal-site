import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { ProjectImage } from "../content";

type PreviewLayer = ProjectImage & { id: number };

export default function ProjectPreview({
  image,
  motionOff,
}: {
  image: ProjectImage | undefined;
  motionOff: boolean;
}) {
  const [layers, setLayers] = useState<PreviewLayer[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    if (!image) {
      if (motionOff) setLayers([]);
      return;
    }
    let cancelled = false;
    const incoming = new Image();
    incoming.src = image.src;

    // Keep the previous photograph in place until its replacement is ready.
    incoming.decode().then(
      () => {
        if (cancelled) return;
        const layer = { ...image, id: nextId.current++ };
        setLayers((current) => {
          if (current.at(-1)?.src === image.src) {
            return motionOff ? current.slice(-1) : current;
          }
          return motionOff ? [layer] : [...current, layer];
        });
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [image, motionOff]);

  return layers.map((layer, index) => (
    <motion.img
      key={layer.id}
      src={layer.src}
      alt={layer.alt}
      aria-hidden={!image || index !== layers.length - 1}
      initial={motionOff ? false : { scale: 0.06 }}
      animate={{ scale: image ? 1 : 0 }}
      transition={{ duration: motionOff ? 0 : 0.85, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => {
        if (!image) {
          setLayers([]);
          return;
        }
        setLayers((current) =>
          current.length > 1 && current.at(-1)?.id === layer.id
            ? current.slice(-1)
            : current,
        );
      }}
    />
  ));
}
