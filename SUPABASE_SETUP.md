# Supabase Database Setup Guide

## Step 1: Configure Email Settings (Important!)

By default, Supabase requires email verification. For testing, you can disable this:

1. Go to your Supabase dashboard
2. Click **Authentication** in the left sidebar
3. Click **Providers**
4. Scroll down to **Email**
5. Toggle **"Confirm email"** to **OFF** (for testing only)
6. Click **Save**

**Note:** For production, keep email confirmation ON for better security.

---

## Step 2: Create Database Tables

Go to **SQL Editor** in your Supabase dashboard and run these commands one by one:

### 1. User Profiles Table
This stores additional user information beyond what Supabase Auth provides.

```sql
-- Create user profiles table
CREATE TABLE user_profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  phone text,
  company text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON user_profiles FOR SELECT 
USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON user_profiles FOR UPDATE 
USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" 
ON user_profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2. Orders/Purchases Table
Tracks customer orders and service purchases.

```sql
-- Create orders table
CREATE TABLE orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  service_name text not null,
  service_type text not null, -- 'website', 'maintenance', 'custom'
  amount decimal(10,2) not null,
  status text default 'pending' not null, -- 'pending', 'paid', 'completed', 'refunded'
  stripe_payment_id text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own orders
CREATE POLICY "Users can view own orders" 
ON orders FOR SELECT 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX orders_user_id_idx ON orders(user_id);
CREATE INDEX orders_created_at_idx ON orders(created_at DESC);
```

### 3. Customer Files Table
Tracks files uploaded for customers (invoices, deliverables, etc.)

```sql
-- Create customer files table
CREATE TABLE customer_files (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  order_id uuid references orders on delete set null,
  file_name text not null,
  file_path text not null, -- Path in Supabase Storage
  file_type text not null, -- 'invoice', 'deliverable', 'report', 'other'
  file_size bigint, -- Size in bytes
  mime_type text,
  description text,
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
ALTER TABLE customer_files ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own files
CREATE POLICY "Users can view own files" 
ON customer_files FOR SELECT 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX customer_files_user_id_idx ON customer_files(user_id);
CREATE INDEX customer_files_order_id_idx ON customer_files(order_id);
```

### 4. Subscriptions Table (Optional - for recurring services)
```sql
-- Create subscriptions table
CREATE TABLE subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  plan_name text not null, -- 'basic', 'standard', 'premium'
  amount decimal(10,2) not null,
  billing_cycle text not null, -- 'monthly', 'yearly'
  status text default 'active' not null, -- 'active', 'cancelled', 'past_due'
  stripe_subscription_id text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions" 
ON subscriptions FOR SELECT 
USING (auth.uid() = user_id);

-- Create index
CREATE INDEX subscriptions_user_id_idx ON subscriptions(user_id);
```

---

## Step 3: Set Up File Storage

1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Name it: `customer-files`
4. Set **Public bucket** to **OFF** (private files only)
5. Click **Create bucket**

### Set up Storage Policies

Click on the `customer-files` bucket, then go to **Policies** tab:

```sql
-- Policy: Users can view their own files
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'customer-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Authenticated users can upload to their own folder
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'customer-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'customer-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'customer-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## Step 4: Test the Authentication

1. Open your website (index.html or pricing.html)
2. Click **Login** button
3. Switch to **Sign Up** tab
4. Create a test account with:
   - Name: Test User
   - Email: test@example.com
   - Password: test123
5. Check your Supabase dashboard → **Authentication** → **Users** to see the new user

---

## Step 5: Verify Database Tables

Go to **Table Editor** in Supabase dashboard and verify these tables exist:
- ✅ user_profiles
- ✅ orders
- ✅ customer_files
- ✅ subscriptions (optional)

---

## Next Steps

Once the database is set up, you can:
1. Create the customer profile/dashboard page
2. Add order management
3. Integrate Stripe for payments
4. Add file upload functionality for deliverables

---

## Troubleshooting

**Problem:** Can't sign up - "Email not confirmed"
- **Solution:** Disable email confirmation in Authentication settings (Step 1)

**Problem:** Can't see data in tables
- **Solution:** Check Row Level Security policies are created correctly

**Problem:** Storage upload fails
- **Solution:** Verify storage policies are set up correctly

**Need help?** Check the Supabase logs in Dashboard → Logs
