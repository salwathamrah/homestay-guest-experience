-- Generalizes additional_guests so the Indian flow can store Aadhaar
-- numbers/scans the same way the foreign flow stores passport numbers.
-- (Both forms already support adding an unlimited number of these rows —
-- there was never a cap — only the Indian form was missing the feature.)

alter table additional_guests rename column passport_number to id_document_number;

-- Aadhaar front/back scans for additional guests in the Indian flow.
-- Nullable: foreign additional guests only ever provide a passport number,
-- no file upload.
alter table additional_guests add column id_doc_front_url text;
alter table additional_guests add column id_doc_back_url text;
