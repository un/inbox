'use client';

import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop
} from 'react-image-crop';
import { useMemo, useRef, useState } from 'react';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from './shadcn-ui/button';
import { Slider } from './shadcn-ui/slider';

type AvatarCropProps = {
  input: File;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
};

export default function AvatarCrop({
  input,
  onCrop,
  onCancel
}: AvatarCropProps) {
  const [crop, setCrop] = useState<Crop>();
  const imageSrc = useMemo(() => URL.createObjectURL(input), [input]);
  const [scale, setScale] = useState(1);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [cropLoading, setCropLoading] = useState(false);

  const convertCropToBlob = async (crop: Crop) => {
    if (!imageRef.current) throw new Error('No image ref');
    const image = imageRef.current;

    const canvas = new OffscreenCanvas(
      image.naturalWidth * scale,
      image.naturalHeight * scale
    );

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No 2d context');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(crop.height * scaleY * pixelRatio);
    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;

    const centerX = image.naturalWidth / 2;
    const centerY = image.naturalHeight / 2;

    ctx.save();

    ctx.translate(-cropX, -cropY);
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);
    ctx.drawImage(
      image,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight
    );

    ctx.restore();

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return blob;
  };

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4">
      <ReactCrop
        className="select-none"
        crop={crop}
        onChange={(crop) => setCrop(crop)}
        onComplete={(crop) => setCrop(crop)}
        aspect={1}
        ruleOfThirds={true}
        circularCrop={true}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          className="origin-center transition-transform duration-100 ease-linear will-change-transform"
          style={{ transform: `scale(${scale})` }}
          alt="Your Avatar"
          ref={imageRef}
          onLoad={(e) => {
            const target = e.currentTarget;

            setTimeout(() => {
              const { naturalWidth: width, naturalHeight: height } = target;
              setCrop(
                centerCrop(
                  makeAspectCrop(
                    {
                      unit: '%',
                      height: 90
                    },
                    1,
                    width,
                    height
                  ),
                  width,
                  height
                )
              );
            }, 100);
          }}
        />
      </ReactCrop>
      <Slider
        min={1}
        max={5}
        step={0.1}
        value={[scale]}
        onValueChange={(e) => setScale(e[0] ?? 0)}
      />
      <div className="flex w-full items-center gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={onCancel}>
          Cancel
        </Button>
        <Button
          loading={cropLoading}
          variant="default"
          className="flex-1"
          onClick={async () => {
            if (!crop || cropLoading) return;
            setCropLoading(true);
            const blob = await convertCropToBlob(crop);
            URL.revokeObjectURL(imageSrc);
            setCropLoading(false);
            onCrop(blob);
          }}>
          Done
        </Button>
      </div>
    </div>
  );
}
