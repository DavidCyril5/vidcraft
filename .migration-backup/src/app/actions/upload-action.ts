'use server';

/**
 * Uploads a file to tmpfiles.org and returns a direct download URL.
 * Files are automatically deleted after 60 minutes.
 * @param formData FormData containing the 'file' field.
 * @returns An object containing the direct URL of the uploaded file.
 */
export async function uploadToTmpFiles(formData: FormData) {
  try {
    const response = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    if (result.status === 'success' && result.data && result.data.url) {
      // Convert landing page URL to direct download URL
      // Example: https://tmpfiles.org/12345/image.jpg -> https://tmpfiles.org/dl/12345/image.jpg
      const directUrl = result.data.url.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
      return { url: directUrl };
    } else {
      throw new Error(result.message || 'Upload failed: Unexpected API response format.');
    }
  } catch (error: any) {
    console.error('Error in uploadToTmpFiles:', error);
    throw new Error(error.message || 'An unexpected error occurred during file upload.');
  }
}
