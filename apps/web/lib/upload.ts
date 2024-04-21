type UploadTrackerOptions = {
  formData: FormData;
  method: 'POST' | 'PUT';
  url: string;
  onProgress?: (progress: number) => void;
};

export default function uploadTracker({
  formData,
  method,
  url,
  onProgress
}: UploadTrackerOptions) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        onProgress?.(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
      } else {
        reject(new Error(`Failed to upload file: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Failed to upload file'));
    };

    xhr.withCredentials = true;

    xhr.send(formData);
  });
}
