-- Create storage bucket for certification documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('certification-documents', 'certification-documents', false);

-- Create policy for authenticated users to view their organization's documents
CREATE POLICY "Authenticated users can view certification documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'certification-documents' AND auth.role() = 'authenticated');

-- Create policy for authenticated users to upload documents
CREATE POLICY "Authenticated users can upload certification documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'certification-documents' AND auth.role() = 'authenticated');

-- Create policy for authenticated users to delete documents
CREATE POLICY "Authenticated users can delete certification documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'certification-documents' AND auth.role() = 'authenticated');

-- Create policy for authenticated users to update documents
CREATE POLICY "Authenticated users can update certification documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'certification-documents' AND auth.role() = 'authenticated');

-- Create table for tracking certification documents
CREATE TABLE public.certification_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_certification_id UUID NOT NULL REFERENCES public.client_certifications(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certification_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for certification_documents
CREATE POLICY "Allow authenticated read access to certification_documents"
ON public.certification_documents FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert access to certification_documents"
ON public.certification_documents FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete access to certification_documents"
ON public.certification_documents FOR DELETE
USING (auth.role() = 'authenticated');