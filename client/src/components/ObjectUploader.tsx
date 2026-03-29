import { useState } from "react";
import type { ReactNode } from "react";
// Import Uppy React components
import UppyDashboardModal from "@uppy/react/dashboard-modal";
import Uppy from "@uppy/core";
import XHR from "@uppy/xhr-upload";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";

import "@uppy/core/css/style.min.css";
// Make sure to import the CSS for the modal version (if you use it)
import "@uppy/dashboard/css/style.min.css";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  allowedFileTypes,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  buttonVariant = "default",
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);

  // Initialize Uppy instance once using useMemo or useState with a factory function
  const [uppy] = useState(() => {
    const instance = new Uppy({
      id: "object-uploader",
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes,
      },
      autoProceed: false,
    });

    instance
      .use(XHR, {
        // Use the function form for the endpoint
        endpoint: async (fileOrBundle) => {
          const file = Array.isArray(fileOrBundle)
            ? fileOrBundle[0]
            : fileOrBundle;
          const params = await onGetUploadParameters();
          instance.setFileMeta(file.id, { uploadURL: params.url });
          return params.url;
        },
        method: "PUT",
        formData: false, // Send raw file data
        withCredentials: true,
        // Handle empty response bodies
        getResponseData: (xhr) => {
          // Check if responseURL exists and return it
          return { url: xhr.responseURL || "N/A" };
        },
      })
      // Attach event listeners
      .on("upload-error", (file, error) => {
        console.error("Upload error:", error);
      })
      .on("upload", (data) => {
        console.log("Upload started:", data);
      })
      .on("upload-progress", (file, progress) => {
        if (file) {
          console.log("Upload progress:", file.name, progress);
        }
      })
      .on("upload-success", (file, response) => {
        if (file) {
          console.log("Upload success:", file.name, response);
        }
      })
      .on("complete", (result) => {
        console.log("Upload complete:", result);
        // Cast the result type if necessary
        onComplete?.(result as unknown as UploadResult<Record<string, unknown>, Record<string, unknown>>);
        setShowModal(false); // Close the modal on completion
      });

    // Clean up uppy instance on component unmount
    // This part is tricky with useState; normally handled in useEffect
    return instance;
  });

  return (
    <div>
      <Button
        type="button"
        onClick={() => setShowModal(true)}
        className={buttonClassName}
        variant={buttonVariant}
        data-testid="button-upload-document"
      >
        {children}
      </Button>

      {/* Render the Uppy Dashboard Modal Component */}
      <UppyDashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        plugins={[]} // If you used .use() above, you don't list them here
        metaFields={[{ id: "name", name: "Name", placeholder: "File name" }]}
        proudlyDisplayPoweredByUppy={false} // Optional: hide footer
      />
    </div>
  );
}
