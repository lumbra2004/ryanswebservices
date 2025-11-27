# File Upload and Signing System Setup Guide

This guide will help you set up the file upload and signing functionality for your admin panel and user profiles.

## Overview

The file signing system allows:
- **Admins** to upload documents to specific user accounts
- **Users** to view documents assigned to them
- **Users** to digitally sign documents
- **System** to track document status (pending/signed)

---

## Setup Steps

### ✅ Step 1: Create Storage Bucket (COMPLETED)
You've already created the `user-documents` bucket. Great!

### ✅ Step 2: Run SQL Script (COMPLETED)
You've already run `setup_file_signing.sql`. Perfect!

### 🔧 Step 3: Configure Storage Policies

This is the final step! You need to add storage policies so admins can upload files and users can view them.

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click on the **user-documents** bucket
4. Click the **Policies** tab
5. Click **New Policy** and add each of the following 4 policies:

---

#### Policy 1: Admins can upload files
- **Policy Name:** `Admins can upload files`
- **Allowed operation:** `INSERT`
- Click **"For full customization"**
- **Policy definition:**
```sql
(bucket_id = 'user-documents' AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner'))
```

---

#### Policy 2: Users can view their own files
- **Policy Name:** `Users can view their own files`
- **Allowed operation:** `SELECT`
- Click **"For full customization"**
- **Policy definition:**
```sql
(bucket_id = 'user-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
```

---

#### Policy 3: Admins can view all files
- **Policy Name:** `Admins can view all files`
- **Allowed operation:** `SELECT`
- Click **"For full customization"**
- **Policy definition:**
```sql
(bucket_id = 'user-documents' AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner'))
```

---

#### Policy 4: Admins can delete files
- **Policy Name:** `Admins can delete files`
- **Allowed operation:** `DELETE`
- Click **"For full customization"**
- **Policy definition:**
```sql
(bucket_id = 'user-documents' AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner'))
```

---

## Testing the System

Once you've added all 4 storage policies, test the complete workflow:

### Test as Admin:
1. Go to `http://localhost:8080/admin.html`
2. Log in with your admin account (ryanlumbra@icloud.com)
3. Scroll to **📁 Files Management** section
4. Click **+ Upload File for User** button
5. Select a user from the dropdown
6. Enter a file name (e.g., "Contract Agreement")
7. Add an optional description (e.g., "Please review and sign")
8. Choose a file from your computer
9. Click **Upload**
10. You should see the file appear in the table with "⏳ Pending" status

### Test as User:
1. Open a new private/incognito window
2. Go to `http://localhost:8080/profile.html`
3. Log in as the user you uploaded the file to
4. Scroll to **📄 Documents to Sign** section
5. You should see the uploaded document
6. Click **👁️ View** to open the file in a new tab
7. Click **✍️ Sign** to sign the document
8. Confirm the signature
9. The status should change to "✅ Signed" with the date

---

## Features

### Admin Panel (`admin.html`)
✅ Upload files to any user account  
✅ View all files with user info, status, and signature dates  
✅ Delete files (removes from both storage and database)  
✅ Filter and search files by name or user  
✅ See file descriptions and upload dates  

### User Profile (`profile.html`)
✅ View documents assigned to their account  
✅ Open documents in new tab  
✅ Sign documents with confirmation  
✅ See signature status and dates  
✅ Clean, professional table layout  

---

## Database Structure

The `files` table has these columns:
- `id` - Unique file identifier
- `user_id` - User this file is assigned to
- `file_name` - Display name
- `file_url` - Public URL to the file
- `file_size` - Size in bytes
- `status` - 'pending' or 'signed'
- `uploaded_by` - Admin who uploaded it
- `signed_at` - Signature timestamp
- `description` - Optional description
- `created_at` - Upload timestamp

---

## Security

✅ **Row Level Security (RLS)** - Users can only view and sign their own files  
✅ **Admin Permissions** - Admins can view, upload, and delete all files  
✅ **Storage Policies** - Files stored in user-specific folders  
✅ **Validation** - Requires confirmation for signing and deletion  

---

## File Organization

Files are stored in Supabase Storage like this:
```
user-documents/
  ├── [user_id_1]/
  │   ├── 1234567890_contract.pdf
  │   └── 1234567891_agreement.pdf
  ├── [user_id_2]/
  │   └── 1234567892_invoice.pdf
```

This ensures user files are organized and prevents naming conflicts.

---

## Troubleshooting

### "Error uploading file: new row violates row-level security policy"
**Solution:** Make sure all 4 storage policies are added correctly.

### "Files not loading" or "No documents to sign"
**Solution:** Check that the SQL script ran successfully by going to **Table Editor** and verifying the `files` table exists with all columns.

### "File URL shows 404"
**Solution:** Make sure the `user-documents` bucket is set to **Public** in Storage settings.

### "Can't sign document"
**Solution:** Verify the user is logged in and the file belongs to them.

### Upload button shows "Loading users..."
**Solution:** Make sure you're logged in as an admin/owner and the `get_all_profiles()` function exists.

---

## Files Modified

- ✅ `admin.html` - Added upload modal
- ✅ `js/admin.js` - Added upload functionality and updated file rendering
- ✅ `profile.html` - Added documents section
- ✅ `js/profile.js` - Added document viewing and signing
- ✅ `setup_file_signing.sql` - Database setup script

---

## Next Steps

After completing Step 3 (storage policies), your file signing system is ready to use!

**Need Help?** Check the browser console for error messages or look at Supabase logs in Dashboard → Logs.

---

**Last Updated:** January 2025
