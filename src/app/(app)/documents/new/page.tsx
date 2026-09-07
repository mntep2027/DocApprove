import { requireOrg } from "@/lib/session";
import { uploadDocument } from "@/lib/actions/documents";
import UploadForm from "./upload-form";

export default async function NewDocumentPage() {
  const { org } = await requireOrg();
  const action = uploadDocument.bind(null, org.id);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-semibold">Upload a document</h1>
      <UploadForm action={action} />
    </div>
  );
}
