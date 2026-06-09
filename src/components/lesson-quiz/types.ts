/**
 * Shared types local to the lesson-quiz feature.
 *
 * PendingFile tracks client-side file staging for file-upload questions.
 * Files are uploaded to storage at submit time, not immediately on select.
 */
export interface PendingFile {
  /** Populated after a successful upload; null while still staged/pending. */
  fileId: string | null;
  file: File;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  error?: string;
}
