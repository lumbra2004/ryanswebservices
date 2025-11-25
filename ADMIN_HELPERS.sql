-- ============================================
-- ADMIN HELPER SCRIPTS
-- Use these to add test data and manage customers
-- ============================================

-- ============================================
-- 1. Add Test Order for a Customer
-- ============================================
-- Replace 'USER_ID_HERE' with actual user ID from auth.users table
-- To get user ID: SELECT id, email FROM auth.users;

INSERT INTO orders (user_id, service_name, service_type, amount, status, notes)
VALUES (
  'USER_ID_HERE',  -- Replace with actual user ID
  'Professional Website Package',
  'website',
  999.00,
  'completed',
  'Delivered website with 5 pages, SEO optimization, and mobile responsive design'
);

-- ============================================
-- 2. Add Multiple Test Orders
-- ============================================
INSERT INTO orders (user_id, service_name, service_type, amount, status, notes)
VALUES 
  ('USER_ID_HERE', 'Basic Website Package', 'website', 499.00, 'completed', 'Single page website delivered'),
  ('USER_ID_HERE', 'Website Maintenance - Monthly', 'maintenance', 49.00, 'paid', 'Active monthly maintenance plan'),
  ('USER_ID_HERE', 'Custom Contact Form', 'custom', 150.00, 'completed', 'Custom form with email integration');

-- ============================================
-- 3. Add Test File Record (after uploading to Storage)
-- ============================================
-- First upload file to Storage bucket, then add record
INSERT INTO customer_files (user_id, file_name, file_path, file_type, file_size, mime_type, description)
VALUES (
  'USER_ID_HERE',
  'Invoice-2024-001.pdf',
  'USER_ID_HERE/invoices/invoice-2024-001.pdf',
  'invoice',
  125000,
  'application/pdf',
  'Invoice for Professional Website Package'
);

-- ============================================
-- 4. Add Subscription (for recurring services)
-- ============================================
INSERT INTO subscriptions (user_id, plan_name, amount, billing_cycle, status, current_period_start, current_period_end)
VALUES (
  'USER_ID_HERE',
  'Premium Maintenance',
  99.00,
  'monthly',
  'active',
  NOW(),
  NOW() + INTERVAL '1 month'
);

-- ============================================
-- 5. Useful Admin Queries
-- ============================================

-- View all users with their profiles
SELECT 
  u.id,
  u.email,
  u.created_at as signup_date,
  p.full_name,
  p.phone,
  p.company
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- View all orders with customer info
SELECT 
  o.id,
  o.service_name,
  o.amount,
  o.status,
  o.created_at,
  u.email as customer_email,
  p.full_name as customer_name
FROM orders o
JOIN auth.users u ON o.user_id = u.id
LEFT JOIN user_profiles p ON u.id = p.id
ORDER BY o.created_at DESC;

-- View total revenue by status
SELECT 
  status,
  COUNT(*) as order_count,
  SUM(amount) as total_amount
FROM orders
GROUP BY status
ORDER BY total_amount DESC;

-- View customers with most orders
SELECT 
  u.email,
  p.full_name,
  COUNT(o.id) as order_count,
  SUM(o.amount) as total_spent
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.email, p.full_name
ORDER BY total_spent DESC;

-- View recent file uploads
SELECT 
  cf.file_name,
  cf.file_type,
  cf.uploaded_at,
  u.email as customer_email,
  p.full_name as customer_name
FROM customer_files cf
JOIN auth.users u ON cf.user_id = u.id
LEFT JOIN user_profiles p ON u.id = p.id
ORDER BY cf.uploaded_at DESC
LIMIT 20;

-- ============================================
-- 6. Update Order Status
-- ============================================
-- Change order status (e.g., from pending to paid)
UPDATE orders
SET 
  status = 'paid',
  updated_at = NOW()
WHERE id = 'ORDER_ID_HERE';

-- ============================================
-- 7. Delete Test Data (careful!)
-- ============================================
-- Delete all orders for a user
DELETE FROM orders WHERE user_id = 'USER_ID_HERE';

-- Delete all files for a user
DELETE FROM customer_files WHERE user_id = 'USER_ID_HERE';

-- Delete user profile (this won't delete the auth user)
DELETE FROM user_profiles WHERE id = 'USER_ID_HERE';

-- ============================================
-- 8. Get User ID by Email
-- ============================================
-- Use this to find a user's ID before running other queries
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'customer@example.com';

-- ============================================
-- 9. Add Files for All Orders
-- ============================================
-- Useful to add invoice PDFs for each order
-- First, get all orders: SELECT id, user_id, service_name FROM orders;
-- Then run this for each order:

INSERT INTO customer_files (user_id, order_id, file_name, file_path, file_type, description)
VALUES (
  'USER_ID_HERE',
  'ORDER_ID_HERE',
  'Invoice.pdf',
  'USER_ID_HERE/invoices/invoice-ORDER_ID_HERE.pdf',
  'invoice',
  'Invoice for ORDER_NAME'
);

-- ============================================
-- 10. Quick Test Data Setup
-- ============================================
-- Run this after you create your first test account
-- Replace USER_ID_HERE and USER_EMAIL_HERE first

DO $$
DECLARE
  test_user_id uuid := 'USER_ID_HERE';  -- Replace with actual user ID
BEGIN
  -- Add some test orders
  INSERT INTO orders (user_id, service_name, service_type, amount, status, notes)
  VALUES 
    (test_user_id, 'Professional Website', 'website', 999.00, 'completed', 'Delivered on time'),
    (test_user_id, 'SEO Optimization', 'custom', 299.00, 'completed', 'Improved search rankings'),
    (test_user_id, 'Monthly Maintenance', 'maintenance', 49.00, 'paid', 'Active subscription');

  -- Add test files
  INSERT INTO customer_files (user_id, file_name, file_path, file_type, description)
  VALUES 
    (test_user_id, 'Website-Final.zip', test_user_id || '/deliverables/website-final.zip', 'deliverable', 'Final website files'),
    (test_user_id, 'SEO-Report.pdf', test_user_id || '/reports/seo-report.pdf', 'report', 'Monthly SEO performance report');

  RAISE NOTICE 'Test data created successfully!';
END $$;

-- ============================================
-- NOTES FOR RYAN
-- ============================================
-- 
-- To use these scripts:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Copy the query you need
-- 3. Replace USER_ID_HERE with actual user ID
-- 4. Run the query
--
-- To get a user's ID:
-- SELECT id, email FROM auth.users;
--
-- Common workflow:
-- 1. Customer signs up on website
-- 2. They order a service (currently manual process)
-- 3. You add order via SQL: INSERT INTO orders...
-- 4. Upload deliverable files to Storage
-- 5. Add file record via SQL: INSERT INTO customer_files...
-- 6. Customer sees order & file in their profile!
--
-- Future: Add Stripe integration to automate order creation
-- ============================================
