type UploadTrackerOptions = {
  formData: FormData | File;
  method: 'POST' | 'PUT';
  url: string;
  headers?: Record<string, string>;
  includeCredentials?: boolean;
  onProgress?: (progress: number) => void;
};

export default function uploadTracker({
  formData,
  method,
  url,
  headers,
  includeCredentials = true,
  onProgress
}: UploadTrackerOptions) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);

    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }

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

    xhr.withCredentials = includeCredentials;

    xhr.send(formData);
  });
}

export { uploadTracker };
