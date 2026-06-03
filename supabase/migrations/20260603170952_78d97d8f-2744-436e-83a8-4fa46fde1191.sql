
-- Wipe all existing users (cascades to profiles, user_roles, identities via FKs)
DELETE FROM auth.users;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;

-- Create the single admin user
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated', 'authenticated',
    'ihschikan@gmail.com',
    crypt('Ihschikan@2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"IHS Admin"}'::jsonb,
    now(), now(),
    '', '', '', ''
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', 'ihschikan@gmail.com', 'email_verified', true),
    'email', new_user_id::text,
    now(), now(), now()
  );

  -- Ensure profile + admin role exist (trigger may have already run)
  INSERT INTO public.profiles (id, full_name) VALUES (new_user_id, 'IHS Admin')
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (new_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
END $$;
