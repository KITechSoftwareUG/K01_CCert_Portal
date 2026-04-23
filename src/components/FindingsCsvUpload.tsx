import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useUploadAuditDocument } from '@/hooks/useAuditDocuments';

interface FindingsCsvUploadProps {
  auditId: string;
}

export const FindingsCsvUpload = ({ auditId }: FindingsCsvUploadProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAuditDocument();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = '';

    try {
      await upload.mutateAsync({ auditId, file });
      toast.success(`${file.name} hochgeladen`);
    } catch {
      toast.error('Fehler beim Hochladen der CSV');
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.tsv,.txt"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => fileRef.current?.click()}
        disabled={upload.isPending}
        title="Feststellungen-CSV hochladen"
      >
        <Upload className="h-4 w-4 mr-1" />
        {upload.isPending ? 'Lädt...' : 'CSV'}
      </Button>
    </>
  );
};
