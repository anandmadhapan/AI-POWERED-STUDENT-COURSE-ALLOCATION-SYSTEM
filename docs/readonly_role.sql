-- Optional SELECT-only role for the AI assistant's SQL.
-- Run as the database owner, then set in Backend/.env:
--   READONLY_DATABASE_URL=postgresql+psycopg2://ai_readonly:<password>@<host>:5432/<db>
-- The role can read allocation data only: no access to users (accounts and
-- password hashes) or ai_chat_history.

CREATE ROLE ai_readonly LOGIN PASSWORD 'choose-a-strong-password';
ALTER ROLE ai_readonly SET default_transaction_read_only = on;
ALTER ROLE ai_readonly SET statement_timeout = '10s';

GRANT USAGE ON SCHEMA public TO ai_readonly;
GRANT SELECT ON
    students,
    courses,
    course_category_seats,
    student_preferences,
    allocations,
    allocation_logs
TO ai_readonly;
