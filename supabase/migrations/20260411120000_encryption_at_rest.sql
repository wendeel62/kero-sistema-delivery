-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a table for managing secrets (simulating a vault)
-- In production, the encryption key should be passed from the application or stored in a secure vault
CREATE TABLE IF NOT EXISTS public.vault (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_name TEXT UNIQUE NOT NULL,
    key_value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Note: The actual encryption/decryption key should be stored in a secure environment variable (VITE_DB_ENCRYPTION_KEY)
-- and passed to Postgres. For this demonstration, we'll assume a key management strategy.

-- Helper function to encrypt at rest
CREATE OR REPLACE FUNCTION public.encrypt_sensitive(data TEXT, pass TEXT) 
RETURNS BYTEA AS $$
BEGIN
    RETURN pgp_sym_encrypt(data, pass);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to decrypt
CREATE OR REPLACE FUNCTION public.decrypt_sensitive(encrypted_data BYTEA, pass TEXT) 
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(encrypted_data, pass);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example: Add column for encrypted CNPJ if we wanted to migrate
-- ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS encrypted_cnpj BYTEA;
