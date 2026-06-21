-- Database Initialization Script for Nexus Cyber Protected Portfolio
-- Executed automatically on container startup when the postgres volume is new.

-- Connect to the target database
\c nexus_cyber;

-- 1. Create Core Tables
CREATE TABLE IF NOT EXISTS portfolio_photos (
    id SERIAL PRIMARY KEY,
    url VARCHAR(255) NOT NULL UNIQUE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Immutable Audit Table (Alternative 1)
CREATE TABLE IF NOT EXISTS portfolio_photos_audit (
    audit_id SERIAL PRIMARY KEY,
    action_type VARCHAR(10) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    old_url VARCHAR(255),
    new_url VARCHAR(255)
);

-- 3. Create Trigger Function for Audit logging
CREATE OR REPLACE FUNCTION log_portfolio_photos_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO portfolio_photos_audit (action_type, old_url)
        VALUES ('DELETE', OLD.url);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO portfolio_photos_audit (action_type, old_url, new_url)
        VALUES ('UPDATE', OLD.url, NEW.url);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach Trigger to Portfolio Photos table
DROP TRIGGER IF EXISTS trg_portfolio_photos_audit ON portfolio_photos;
CREATE TRIGGER trg_portfolio_photos_audit
BEFORE UPDATE OR DELETE ON portfolio_photos
FOR EACH ROW EXECUTE FUNCTION log_portfolio_photos_changes();

-- 5. Establish Least Privilege Role (Alternative 2)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'nexus_portfolio_app') THEN
        CREATE ROLE nexus_portfolio_app WITH LOGIN PASSWORD 'portfolio_secure_pass';
    END IF;
END
$$;

-- Grant permissions specifically
GRANT CONNECT ON DATABASE nexus_cyber TO nexus_portfolio_app;
GRANT USAGE ON SCHEMA public TO nexus_portfolio_app;
GRANT SELECT, INSERT ON portfolio_photos TO nexus_portfolio_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nexus_portfolio_app;

-- Ensure the app user CANNOT truncate or delete records from the audit log
REVOKE ALL PRIVILEGES ON portfolio_photos_audit FROM nexus_portfolio_app;
GRANT SELECT ON portfolio_photos_audit TO nexus_portfolio_app; -- App user can only read audit log (for displaying recovery candidates if needed), but cannot write/delete.
