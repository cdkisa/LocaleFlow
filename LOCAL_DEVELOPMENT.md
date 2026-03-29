# Local Development Guide

## Document Upload

The application uses local file storage for document and image uploads.

### How It Works

1. Files are stored in `.local-storage/` directory (created automatically in the project root).

2. **Upload Flow**:
   - When you upload a document or image, it's saved to `.local-storage/uploads/`
   - Files are accessible via `/objects/uploads/{fileId}` endpoint
   - The storage path is saved in the database

### Setup

No additional setup is required! Just run the app:

```bash
npm run dev
```

The `.local-storage/` directory will be created automatically when you first upload a file.

### Environment Variables (Optional)

You can customize the local storage directory:

```bash
LOCAL_STORAGE_DIR=/path/to/your/storage npm run dev
```

### Testing Uploads

1. **Documents**: Go to a project detail page and use the document upload feature
2. **Images**: Edit a translation key and upload context images
3. **Viewing**: Uploaded files are accessible through the app's UI

### Notes

- Files are stored on your local filesystem
- No cloud storage credentials needed
- Files persist between server restarts
- The `.local-storage/` directory is in `.gitignore`
